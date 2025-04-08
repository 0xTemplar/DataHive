import base64
import mimetypes
import openai
import logging
import os
import subprocess
import random
import asyncio

import PyPDF2
import pandas as pd
from pydantic import BaseModel
from docx import Document
from langchain_core.prompts import ChatPromptTemplate

from app.campaigns.models import Campaign, Contribution
from app.ai_verification.llm import get_long_context_llm
from app.core.constants import OPENAI_API_KEY
from openai import OpenAI
# Using the asyncio version of redis
from redis.asyncio import Redis

# Models for LLM output
class SimilarityScore(BaseModel):
    score: float

class EvaluationScore(BaseModel):
    accuracy: float
    alignment: float
    relevance: float
    word_count_compliance: float
    grammatical_accuracy: float
    semantic_relevance: float
    sentiment_diversity: float

    @property
    def final_score(self) -> float:
        return (self.accuracy + self.alignment + self.relevance + self.word_count_compliance +
                self.grammatical_accuracy + self.semantic_relevance + self.sentiment_diversity) / 7

class AIVerificationSystem:
    def __init__(self, redis_pool: Redis, openai_api_key: str = OPENAI_API_KEY):
        self.openai_api_key = openai_api_key
        openai.api_key = openai_api_key
        self.redis_pool = redis_pool

        # Set up logging
        self.logger = logging.getLogger(__name__)
        self.logger.setLevel(logging.INFO)
        ch = logging.StreamHandler()
        ch.setLevel(logging.INFO)
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        ch.setFormatter(formatter)
        self.logger.addHandler(ch)

    def hash_document(self, file_path: str) -> str:
        """
        Hash the document file using SHA256.
        """
        import hashlib
        hash_sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_sha256.update(chunk)
        file_hash = hash_sha256.hexdigest()
        self.logger.info(f"Computed file hash: {file_hash}")
        return file_hash

    async def check_cache(self, wallet_address: str, file_hash: str) -> float:
        """
        Check if a verification score is cached for this wallet and file hash.
        """
        cache_key = f"{wallet_address}:{file_hash}"
        cached_score = await self.redis_pool.get(cache_key)
        if cached_score is not None:
            self.logger.info(f"Cache hit for key: {cache_key}")
            return float(cached_score)
        self.logger.info(f"Cache miss for key: {cache_key}")
        return None

    async def store_in_cache(self, wallet_address: str, file_hash: str, score: float):
        """
        Store the verification score in Redis with a TTL (24 hours).
        """
        cache_key = f"{wallet_address}:{file_hash}"
        await self.redis_pool.setex(cache_key, 86400, score)
        self.logger.info(f"Stored score {score} in cache for key: {cache_key}")

    async def verify(self, campaign: Campaign, file_path: str, wallet_address: str) -> float:
        """
        Asynchronously verifies the provided file and applies a fairness adjustment.
        Uses Redis to cache the final (adjusted) score.
        """
        file_hash = self.hash_document(file_path)
        cached = await self.check_cache(wallet_address, file_hash)
        if cached is not None:
            return cached

        mime_type, _ = mimetypes.guess_type(file_path)
        self.logger.info(f"Verifying file: {file_path} with MIME type: {mime_type}")

        # Run verification in a thread to avoid blocking the event loop.
        if mime_type and mime_type.startswith("image"):
            self.logger.info("Processing image file for verification.")
            raw_score = await asyncio.to_thread(self.verify_image, campaign, file_path)
        elif mime_type and (mime_type.startswith("text") or file_path.endswith(('.pdf', '.csv', '.txt', '.doc', '.docx'))):
            self.logger.info("Processing text-based document for verification.")
            raw_score = await asyncio.to_thread(self.verify_text_document, campaign, file_path)
        else:
            self.logger.warning("Unsupported or undetected MIME type; defaulting to text verification.")
            raw_score = await asyncio.to_thread(self.verify_text_document, campaign, file_path)

        # Apply a fairness adjustment: increase by 30%, then divide by a random factor (e.g., between 0.95 and 1.05)
        fairness_factor = random.uniform(0.95, 1.05)
        adjusted_score = (raw_score * 1.30) / fairness_factor
        # Normalize so that the score never exceeds 100
        normalized_score = min(adjusted_score, 100)
        self.logger.info(f"Raw score: {raw_score}, Fairness factor: {fairness_factor}, Adjusted score: {adjusted_score}, Normalized score: {normalized_score}")

        await self.store_in_cache(wallet_address, file_hash, normalized_score)
        return normalized_score

    def encode_image(self, image_path: str) -> str:
        """
        Encodes an image file to a Base64 string.
        """
        self.logger.info(f"Encoding image: {image_path}")
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode("utf-8")

    def verify_image(self, campaign: Campaign, file_path: str) -> float:
        """
        Synchronously verifies an image file using OpenAI's ChatCompletion API.
        """
        self.logger.info(f"Verifying image file: {file_path}")
        base64_image = self.encode_image(file_path)
        client = OpenAI()
        messages = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": (
                            "You are an expert evaluator tasked with determining how well an image aligns with the campaign's objectives. "
                            "Evaluate the image using the following information:\n\n"
                            f"Campaign Description: {campaign.description}\n\n"
                            f"Campaign Requirements: {campaign.data_requirements}\n\n"
                            "Please provide a numeric similarity score between 20 and 100, where 100 indicates perfect alignment and 20 indicates no alignment. "
                            "Output only the numeric score."
                        )
                    },
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}
                    },
                ],
            }
        ]

        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
            )
            response_content = response.choices[0].message.content
            self.logger.info(f"Response content: {response_content}")
            score = float(response_content.strip())
            self.logger.info(f"Image verification score: {score}")
            return score
        except Exception as e:
            self.logger.error(f"Error during image verification: {e}")
            return 0.0

    def verify_text_document(self, campaign: Campaign, file_path: str) -> float:
        """
        Synchronously extracts text from a document (PDF, CSV, TXT, DOC, DOCX) and evaluates it using an LLM.
        """
        self.logger.info(f"Verifying text document: {file_path}")
        content = ""

        if file_path.endswith('.pdf'):
            with open(file_path, "rb") as pdf_file:
                reader = PyPDF2.PdfReader(pdf_file)
                for page in reader.pages:
                    text = page.extract_text()
                    if text:
                        content += text + "\n"
        elif file_path.endswith('.csv'):
            df = pd.read_csv(file_path)
            content = df.to_string(index=False)
        elif file_path.endswith('.txt'):
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
        elif file_path.endswith('.docx'):
            doc = Document(file_path)
            content = "\n".join([para.text for para in doc.paragraphs])
        elif file_path.endswith('.doc'):
            content = self.extract_text_from_doc(file_path)
        else:
            raise ValueError("Unsupported document format")

        prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    (
                        "IDENTITY:\n"
                        "You are an expert evaluator tasked with determining how well a document aligns with the campaign description and requirements. "
                        "Evaluate the document on the following criteria: Accuracy, Alignment, Relevance, Word Count Compliance, Grammatical Accuracy, Semantic Relevance, and Sentiment Diversity. "
                        "For each criterion, assign a numeric score between 20 and 100, where 100 means perfect alignment and 20 means no alignment at all. "
                        "Output your results in JSON format with keys 'accuracy', 'alignment', 'relevance', 'word_count_compliance', 'grammatical_accuracy', 'semantic_relevance', and 'sentiment_diversity'. "
                        "Be as objective and consistent as possible."
                    )
                ),
                (
                    "human",
                    (
                        "Campaign Description:\n{campaign_description}\n\n"
                        "Campaign Requirements:\n{campaign_requirements}\n\n"
                        "Document Content:\n{document_content}\n\n"
                        "Please provide the scores for each criterion."
                    )
                ),
            ]
        )

        llm = get_long_context_llm()
        chain = prompt | llm.with_structured_output(EvaluationScore)
        self.logger.info("Invoking LLM for text document verification.")
        result = chain.invoke({
            "campaign_description": campaign.description,
            "campaign_requirements": campaign.data_requirements,
            "document_content": content,
        })
        final_score = result.final_score
        self.logger.info(f"Text verification scores: {result.dict()} | Final average score: {final_score}")
        return final_score

    def extract_text_from_doc(self, file_path: str) -> str:
        """
        Extracts text from a .doc file using antiword (or similar method).
        """
        self.logger.info(f"Extracting text from .doc file: {file_path}")
        try:
            result = subprocess.run(
                ['antiword', file_path],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            if result.returncode == 0:
                return result.stdout
            else:
                raise Exception(f"Error reading .doc file: {result.stderr}")
        except Exception as e:
            self.logger.error(f"Failed to extract text from .doc file: {str(e)}")
            raise ValueError(f"Failed to extract text from .doc file: {str(e)}")
