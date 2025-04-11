# import base64
# import mimetypes
# import openai
# import logging
# import os
# import subprocess
# import random
# import asyncio

# import PyPDF2
# import pandas as pd
# from pydantic import BaseModel
# from docx import Document
# from typing import TypedDict, Annotated
# from langgraph.graph import StateGraph, END
# from langchain_core.messages import HumanMessage, SystemMessage
# from langchain_core.prompts import ChatPromptTemplate

# from app.campaigns.models import Campaign
# from app.ai_verification.lilypad import get_fast_llm, get_long_context_llm, get_code_llm, get_vision_llm
# from app.core.constants import LILYPAD_API_KEY
# from openai import OpenAI
# from redis.asyncio import Redis

# class SimilarityScore(BaseModel):
#     score: float
#     reason: str

# class AIVerificationSystem:
#     def __init__(self, redis_pool: Redis, openai_api_key: str = LILYPAD_API_KEY):
#         self.openai_api_key = openai_api_key
#         openai.api_key = openai_api_key
#         self.redis_pool = redis_pool
#         self.researcher = get_long_context_llm()
#         self.writer = get_fast_llm()
#         self.qa_engineer = get_code_llm()
#         self.vision_model = get_vision_llm()
#         self.logger = logging.getLogger(__name__)
#         self.logger.setLevel(logging.INFO)

#     def hash_document(self, file_path: str) -> str:
#         import hashlib
#         hash_sha256 = hashlib.sha256()
#         with open(file_path, "rb") as f:
#             for chunk in iter(lambda: f.read(4096), b""):
#                 hash_sha256.update(chunk)
#         return hash_sha256.hexdigest()

#     async def check_cache(self, wallet_address: str, file_hash: str) -> float:
#         cache_key = f"{wallet_address}:{file_hash}"
#         return await self.redis_pool.get(cache_key)

#     async def store_in_cache(self, wallet_address: str, file_hash: str, score: float):
#         cache_key = f"{wallet_address}:{file_hash}"
#         await self.redis_pool.setex(cache_key, 86400, score)

#     async def verify(self, campaign: Campaign, file_path: str, wallet_address: str) -> float:
#         file_hash = self.hash_document(file_path)
#         if cached := await self.check_cache(wallet_address, file_hash):
#             return float(cached)

#         mime_type, _ = mimetypes.guess_type(file_path)
#         processor = self.verify_image if mime_type.startswith("image") else self.verify_text_document
#         raw_score = await asyncio.to_thread(processor, campaign, file_path)

#         fairness_factor = random.uniform(0.95, 1.05)
#         adjusted_score = min((raw_score * 1.30) / fairness_factor, 100)
#         await self.store_in_cache(wallet_address, file_hash, adjusted_score)
#         return adjusted_score


#     def _create_text_workflow(self):
#         class TextState(TypedDict):
#             content: str
#             campaign_desc: str
#             campaign_reqs: str
#             result_eval_a: SimilarityScore | None
#             result_eval_b: SimilarityScore | None
#             final: SimilarityScore | None


#         def evaluator_a(state: TextState):
#             try:
#                 prompt = ChatPromptTemplate.from_template(
#                     "As Expert Evaluator A, analyze this submission against:\n"
#                     "Campaign: {desc}\nRequirements: {reqs}\n\n"
#                     "Submission: {content}\n\nProvide score (20-100) and reason."
#                 )
#                 chain = prompt | self.researcher.with_structured_output(SimilarityScore)
#                 result = chain.invoke({
#                     "desc": state["campaign_desc"],
#                     "reqs": state["campaign_reqs"],
#                     "content": state["content"]
#                 })
#                 return {"result_eval_a": result}
#             except Exception as e:
#                 self.logger.error(f"Evaluator A failed: {str(e)}")
#                 return {"result_eval_a": SimilarityScore(score=0.0, reason="Evaluation failed")}

#         def evaluator_b(state: TextState):
#             try:
#                 prompt = ChatPromptTemplate.from_template(
#                     "As Critical Evaluator B, assess this submission from different angles:\n"
#                     "Campaign: {desc}\nRequirements: {reqs}\n\n"
#                     "Submission: {content}\n\nGive score (20-100) and detailed analysis."
#                 )
#                 chain = prompt | self.qa_engineer.with_structured_output(SimilarityScore)
#                 result = chain.invoke({
#                     "desc": state["campaign_desc"],
#                     "reqs": state["campaign_reqs"],
#                     "content": state["content"]
#                 })
#                 return {"result_eval_b": result}
#             except Exception as e:
#                 self.logger.error(f"Evaluator B failed: {str(e)}")
#                 return {"result_eval_b": SimilarityScore(score=0.0, reason="Evaluation failed")}

#         def arbiter(state: TextState):
#             try:
#                 # Ensure we have valid scores
#                 a_score = state["result_eval_a"].score if state["result_eval_a"] else 0.0
#                 b_score = state["result_eval_b"].score if state["result_eval_b"] else 0.0
                
#                 prompt = ChatPromptTemplate.from_template(
#                     "Reconcile text evaluations:\n"
#                     "A: {a_score} - {a_reason}\n"
#                     "B: {b_score} - {b_reason}\n\n"
#                     "Provide final score (20-100) and comprehensive reason."
#                 )
#                 chain = prompt | self.writer.with_structured_output(SimilarityScore)
#                 result = chain.invoke({
#                     "a_score": a_score,
#                     "a_reason": state["result_eval_a"].reason if state["result_eval_a"] else "N/A",
#                     "b_score": b_score,
#                     "b_reason": state["result_eval_b"].reason if state["result_eval_b"] else "N/A"
#                 })
#                 return {"final": result}
#             except Exception as e:
#                 self.logger.error(f"Arbiter failed: {str(e)}")
#                 return {"final": SimilarityScore(score=0.0, reason="Arbitration failed")}

#         workflow = StateGraph(TextState)
#         workflow.add_node("node_eval_text_a", evaluator_a)
#         workflow.add_node("node_eval_text_b", evaluator_b)
#         workflow.add_node("node_arbiter", arbiter)
        
#         # Sequential execution with error fallthrough
#         workflow.add_edge("node_eval_text_a", "node_eval_text_b")
#         workflow.add_edge("node_eval_text_b", "node_arbiter")
#         workflow.add_edge("node_arbiter", END)
        
#         # Error handling
#         workflow.set_entry_point("node_eval_text_a")
#         return workflow.compile()


 
#     def verify_text_document(self, campaign: Campaign, file_path: str) -> float:
#         content = self._extract_text_content(file_path)
#         workflow = self._create_text_workflow()
#         result = workflow.invoke({
#             "content": content,
#             "campaign_desc": campaign.description,
#             "campaign_reqs": campaign.data_requirements,
#             "eval_text_a": None,
#             "eval_text_b": None,
#             "final": None
#         })
#         return result["final"].score



#     def _create_image_workflow(self):
#         class ImageState(TypedDict):
#             image_b64: str
#             campaign_desc: str
#             eval_image_a: SimilarityScore | None
#             eval_image_b: SimilarityScore | None
#             final: SimilarityScore | None

#         def evaluator_a(state: ImageState):
#             try:
#                 messages = [
#                     SystemMessage(content="You're a visual analysis expert. Evaluate image alignment with campaign."),
#                     HumanMessage(content=[
#                         {"type": "text", "text": f"Evaluate image for: {state['campaign_desc']}"},
#                         {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{state['image_b64']}"}}
#                     ])
#                 ]
#                 response = self.vision_model.invoke(messages)
#                 self.logger.info(f"Image evaluation response evaluator_a: {response}")
#                 score = self._parse_image_response(response.content)
#                 self.logger.info(f"Image evaluation score evaluator_a: {score}")
#                 return {"eval_image_a": score}
#             except Exception as e:
#                 self.logger.error(f"Evaluator A failed: {str(e)}")
#                 return {"eval_image_a": SimilarityScore(score=0.0, reason="Evaluation failed in evaluator A")}

#         def evaluator_b(state: ImageState):
#             try:
#                 messages = [
#                     SystemMessage(content="You're a visual analysis expert. Evaluate image alignment with campaign."),
#                     HumanMessage(content=[
#                         {"type": "text", "text": f"Campaign: {state['campaign_desc']}"},
#                         {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{state['image_b64']}"}}
#                     ])
#                 ]
#                 response = self.qa_engineer.invoke(messages)
#                 self.logger.info(f"Image evaluation response evaluator_b: {response}")
#                 score = self._parse_image_response(response.content)
#                 self.logger.info(f"Image evaluation score evaluator_b: {score}")
#                 return {"eval_image_b": score}
#             except Exception as e:
#                 self.logger.error(f"Evaluator B failed: {str(e)}")
#                 return {"eval_image_b": SimilarityScore(score=0.0, reason="Evaluation failed in evaluator B")}

#         def arbiter(state: ImageState):
#             try:
#                 # Ensure both evaluator outputs are present
#                 a = state.get("eval_image_a")
#                 b = state.get("eval_image_b")
#                 if not a or not b:
#                     raise ValueError("Missing evaluator results; cannot perform arbitration")
#                 prompt = ChatPromptTemplate.from_template(
#                     "Reconcile image evaluations:\n"
#                     "A: {a_score} - {a_reason}\n"
#                     "B: {b_score} - {b_reason}\n\n"
#                     "Provide final score (20-100) and comprehensive reason."
#                 )
#                 chain = prompt | self.writer.with_structured_output(SimilarityScore)
#                 result = chain.invoke({
#                     "a_score": a.score,
#                     "a_reason": a.reason,
#                     "b_score": b.score,
#                     "b_reason": b.reason
#                 })
#                 self.logger.info(f"Image evaluation result arbiter: {result}")
#                 return {"final": result}
#             except Exception as e:
#                 self.logger.error(f"Arbiter failed: {str(e)}")
#                 return {"final": SimilarityScore(score=0.0, reason="Arbitration failed")}

#         workflow = StateGraph(ImageState)
#         # Rename nodes to avoid state key conflicts: use distinct identifiers.
#         workflow.add_node("node_image_a", evaluator_a)
#         workflow.add_node("node_image_b", evaluator_b)
#         workflow.add_node("node_arbiter", arbiter)
        
#         # Define the sequential execution flow.
#         workflow.add_edge("node_image_a", "node_image_b")
#         workflow.add_edge("node_image_b", "node_arbiter")
#         workflow.add_edge("node_arbiter", END)
        
#         # Set the entry point.
#         workflow.set_entry_point("node_image_a")
        
#         return workflow.compile()


#     def _create_csv_workflow(self):
#         class CsvState(TypedDict):
#             csv_content: str
#             campaign_desc: str
#             eval_csv_a: SimilarityScore | None
#             eval_csv_b: SimilarityScore | None
#             final: SimilarityScore | None

#         def evaluator_a(state: CsvState):
#             try:
#                 prompt = ChatPromptTemplate.from_template(
#                     "As CSV Analysis Expert Evaluator A, analyze this CSV data for campaign relevance.\n"
#                     "Campaign: {desc}\n\n"
#                     "CSV Content:\n{csv_content}\n\n"
#                     "Provide a score (20-100) and brief reasoning."
#                 )
#                 chain = prompt | self.researcher.with_structured_output(SimilarityScore)
#                 result = chain.invoke({
#                     "desc": state["campaign_desc"],
#                     "csv_content": state["csv_content"]
#                 })
#                 self.logger.info(f"CSV Evaluator A result: {result}")
#                 return {"eval_csv_a": result}
#             except Exception as e:
#                 self.logger.error(f"CSV Evaluator A failed: {str(e)}")
#                 return {"eval_csv_a": SimilarityScore(score=0.0, reason="Evaluation failed in evaluator A")}

#         def evaluator_b(state: CsvState):
#             try:
#                 prompt = ChatPromptTemplate.from_template(
#                     "As CSV Analysis Expert Evaluator B, assess the CSV data from another angle.\n"
#                     "Campaign: {desc}\n\n"
#                     "CSV Content:\n{csv_content}\n\n"
#                     "Provide a score (20-100) and detailed reasoning."
#                 )
#                 chain = prompt | self.qa_engineer.with_structured_output(SimilarityScore)
#                 result = chain.invoke({
#                     "desc": state["campaign_desc"],
#                     "csv_content": state["csv_content"]
#                 })
#                 self.logger.info(f"CSV Evaluator B result: {result}")
#                 return {"eval_csv_b": result}
#             except Exception as e:
#                 self.logger.error(f"CSV Evaluator B failed: {str(e)}")
#                 return {"eval_csv_b": SimilarityScore(score=0.0, reason="Evaluation failed in evaluator B")}

#         def arbiter(state: CsvState):
#             try:
#                 a = state.get("eval_csv_a")
#                 b = state.get("eval_csv_b")
#                 if not a or not b:
#                     raise ValueError("Missing CSV evaluator results; cannot perform arbitration")
#                 prompt = ChatPromptTemplate.from_template(
#                     "Reconcile CSV evaluations:\n"
#                     "A: {a_score} - {a_reason}\n"
#                     "B: {b_score} - {b_reason}\n\n"
#                     "Provide a final score (20-100) and comprehensive analysis."
#                 )
#                 chain = prompt | self.writer.with_structured_output(SimilarityScore)
#                 result = chain.invoke({
#                     "a_score": a.score,
#                     "a_reason": a.reason,
#                     "b_score": b.score,
#                     "b_reason": b.reason
#                 })
#                 self.logger.info(f"CSV Arbiter result: {result}")
#                 return {"final": result}
#             except Exception as e:
#                 self.logger.error(f"CSV Arbiter failed: {str(e)}")
#                 return {"final": SimilarityScore(score=0.0, reason="Arbitration failed")}

#         workflow = StateGraph(CsvState)
#         # Using distinct node names to avoid any state key conflicts
#         workflow.add_node("node_csv_a", evaluator_a)
#         workflow.add_node("node_csv_b", evaluator_b)
#         workflow.add_node("node_csv_arbiter", arbiter)
        
#         # Define the sequential flow: evaluator A -> evaluator B -> arbiter -> END
#         workflow.add_edge("node_csv_a", "node_csv_b")
#         workflow.add_edge("node_csv_b", "node_csv_arbiter")
#         workflow.add_edge("node_csv_arbiter", END)
        
#         # Set the entry point of the workflow
#         workflow.set_entry_point("node_csv_a")
        
#         return workflow.compile()


#     def verify_image(self, campaign: Campaign, file_path: str) -> float:
#         base64_image = self._encode_image(file_path)
#         workflow = self._create_image_workflow()
#         result = workflow.invoke({
#             "image_b64": base64_image,
#             "campaign_desc": campaign.description,
#             "eval_image_a": None,
#             "eval_image_b": None,
#             "final": None
#         })
#         print(f"Image verification result: {result}")
#         return result["final"].score

#     def _extract_text_content(self, file_path: str) -> str:
#         if file_path.endswith('.pdf'):
#             with open(file_path, "rb") as f:
#                 return "\n".join(page.extract_text() for page in PyPDF2.PdfReader(f).pages)
#         elif file_path.endswith('.csv'):
#             return pd.read_csv(file_path).to_string()
#         elif file_path.endswith('.txt'):
#             with open(file_path, "r") as f:
#                 return f.read()
#         elif file_path.endswith('.docx'):
#             return "\n".join(p.text for p in Document(file_path).paragraphs)
#         elif file_path.endswith('.doc'):
#             return self._extract_doc_content(file_path)
#         return ""

#     def _encode_image(self, path: str) -> str:
#         with open(path, "rb") as f:
#             return base64.b64encode(f.read()).decode()

#     def _extract_doc_content(self, path: str) -> str:
#         try:
#             result = subprocess.run(['antiword', path], capture_output=True, text=True)
#             return result.stdout if result.returncode == 0 else ""
#         except:
#             return ""

#     def _parse_image_response(self, response: str) -> SimilarityScore:
#         try:
#             score = float(response.strip())
#             return SimilarityScore(score=score, reason="Image analysis")
#         except:
#             return SimilarityScore(score=0.0, reason="Invalid response")



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
from typing import TypedDict, Annotated
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate

from app.campaigns.models import Campaign
from app.ai_verification.lilypad import get_fast_llm, get_long_context_llm, get_code_llm, get_vision_llm
from app.core.constants import LILYPAD_API_KEY
from openai import OpenAI
from redis.asyncio import Redis

class SimilarityScore(BaseModel):
    score: float
    reason: str

class AIVerificationSystem:
    def __init__(self, redis_pool: Redis, openai_api_key: str = LILYPAD_API_KEY):
        self.openai_api_key = openai_api_key
        openai.api_key = openai_api_key
        self.redis_pool = redis_pool
        self.researcher = get_long_context_llm()
        self.writer = get_fast_llm()
        self.qa_engineer = get_code_llm()
        self.vision_model = get_vision_llm()
        
        # Setup comprehensive logging.
        self.logger = logging.getLogger(__name__)
        self.logger.setLevel(logging.INFO)
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        handler.setFormatter(formatter)
        if not self.logger.handlers:
            self.logger.addHandler(handler)
        self.logger.info("AIVerificationSystem initialized.")

    def hash_document(self, file_path: str) -> str:
        self.logger.info(f"Hashing document at {file_path}.")
        import hashlib
        hash_sha256 = hashlib.sha256()
        try:
            with open(file_path, "rb") as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    hash_sha256.update(chunk)
            file_hash = hash_sha256.hexdigest()
            self.logger.info(f"Computed hash: {file_hash}.")
            return file_hash
        except Exception as e:
            self.logger.error(f"Error hashing document: {str(e)}")
            raise

    async def check_cache(self, wallet_address: str, file_hash: str) -> float:
        cache_key = f"{wallet_address}:{file_hash}"
        self.logger.info(f"Checking cache for key: {cache_key}.")
        cached_score = await self.redis_pool.get(cache_key)
        if cached_score is not None:
            self.logger.info(f"Cache hit for key: {cache_key}.")
            return float(cached_score)
        self.logger.info(f"Cache miss for key: {cache_key}.")
        return None

    async def store_in_cache(self, wallet_address: str, file_hash: str, score: float):
        cache_key = f"{wallet_address}:{file_hash}"
        self.logger.info(f"Storing score {score} in cache for key: {cache_key}.")
        await self.redis_pool.setex(cache_key, 86400, score)

    async def verify(self, campaign: Campaign, file_path: str, wallet_address: str) -> float:
        self.logger.info(f"Starting verification for file: {file_path} with campaign: {campaign.description}.")
        file_hash = self.hash_document(file_path)
        if cached := await self.check_cache(wallet_address, file_hash):
            self.logger.info(f"Using cached score for file: {file_path}.")
            return float(cached)

        mime_type, _ = mimetypes.guess_type(file_path)
        self.logger.info(f"Guessed MIME type {mime_type} for file: {file_path}.")
        if mime_type and mime_type.startswith("image"):
            self.logger.info("File identified as an image.")
            raw_score = await asyncio.to_thread(self.verify_image, campaign, file_path)
        elif mime_type and (mime_type.startswith("text") or file_path.endswith(('.pdf', '.csv', '.txt', '.doc', '.docx'))):
            self.logger.info("File identified as a text/document type.")
            raw_score = await asyncio.to_thread(self.verify_text_document, campaign, file_path)
        else:
            self.logger.warning("Unsupported or undetected MIME type; defaulting to text verification.")
            raw_score = await asyncio.to_thread(self.verify_text_document, campaign, file_path)

        fairness_factor = random.uniform(0.95, 1.05)
        adjusted_score = (raw_score * 1.30) / fairness_factor
        normalized_score = min(adjusted_score, 100)
        self.logger.info(f"Verification scores - raw: {raw_score}, fairness_factor: {fairness_factor}, adjusted: {adjusted_score}, normalized: {normalized_score}.")
        await self.store_in_cache(wallet_address, file_hash, normalized_score)
        return normalized_score

    def _create_text_workflow(self):
        self.logger.info("Creating text workflow.")
        class TextState(TypedDict):
            content: str
            campaign_desc: str
            campaign_reqs: str
            result_eval_a: SimilarityScore | None
            result_eval_b: SimilarityScore | None
            final: SimilarityScore | None

        def evaluator_a(state: TextState):
            self.logger.info("Starting evaluator A for text workflow.")
            try:
                prompt = ChatPromptTemplate.from_template(
                    "As Expert Evaluator A, analyze this submission against:\n"
                    "Campaign: {desc}\nRequirements: {reqs}\n\n"
                    "Submission: {content}\n\nProvide score (20-100) and reason."
                )
                chain = prompt | self.researcher.with_structured_output(SimilarityScore)
                result = chain.invoke({
                    "desc": state["campaign_desc"],
                    "reqs": state["campaign_reqs"],
                    "content": state["content"]
                })
                self.logger.info(f"Evaluator A result: {result}")
                return {"result_eval_a": result}
            except Exception as e:
                self.logger.error(f"Evaluator A failed: {str(e)}")
                return {"result_eval_a": SimilarityScore(score=0.0, reason="Evaluation failed")}

        def evaluator_b(state: TextState):
            self.logger.info("Starting evaluator B for text workflow.")
            try:
                prompt = ChatPromptTemplate.from_template(
                    "As Critical Evaluator B, assess this submission from different angles:\n"
                    "Campaign: {desc}\nRequirements: {reqs}\n\n"
                    "Submission: {content}\n\nGive score (20-100) and detailed analysis."
                )
                chain = prompt | self.qa_engineer.with_structured_output(SimilarityScore)
                result = chain.invoke({
                    "desc": state["campaign_desc"],
                    "reqs": state["campaign_reqs"],
                    "content": state["content"]
                })
                self.logger.info(f"Evaluator B result: {result}")
                return {"result_eval_b": result}
            except Exception as e:
                self.logger.error(f"Evaluator B failed: {str(e)}")
                return {"result_eval_b": SimilarityScore(score=0.0, reason="Evaluation failed")}

        def arbiter(state: TextState):
            self.logger.info("Starting arbiter for text workflow.")
            try:
                a_score = state["result_eval_a"].score if state["result_eval_a"] else 0.0
                b_score = state["result_eval_b"].score if state["result_eval_b"] else 0.0
                prompt = ChatPromptTemplate.from_template(
                    "Reconcile text evaluations:\n"
                    "A: {a_score} - {a_reason}\n"
                    "B: {b_score} - {b_reason}\n\n"
                    "Provide final score (20-100) and comprehensive reason."
                )
                chain = prompt | self.writer.with_structured_output(SimilarityScore)
                result = chain.invoke({
                    "a_score": a_score,
                    "a_reason": state["result_eval_a"].reason if state["result_eval_a"] else "N/A",
                    "b_score": b_score,
                    "b_reason": state["result_eval_b"].reason if state["result_eval_b"] else "N/A"
                })
                self.logger.info(f"Arbiter result: {result}")
                return {"final": result}
            except Exception as e:
                self.logger.error(f"Arbiter failed: {str(e)}")
                return {"final": SimilarityScore(score=0.0, reason="Arbitration failed")}

        workflow = StateGraph(TextState)
        workflow.add_node("node_eval_text_a", evaluator_a)
        workflow.add_node("node_eval_text_b", evaluator_b)
        workflow.add_node("node_arbiter", arbiter)
        
        workflow.add_edge("node_eval_text_a", "node_eval_text_b")
        workflow.add_edge("node_eval_text_b", "node_arbiter")
        workflow.add_edge("node_arbiter", END)
        
        workflow.set_entry_point("node_eval_text_a")
        self.logger.info("Text workflow created successfully.")
        return workflow.compile()

    def verify_text_document(self, campaign: Campaign, file_path: str) -> float:
        self.logger.info(f"Verifying text document {file_path}.")
        content = self._extract_text_content(file_path)
        if not content:
            self.logger.error("Failed to extract text content.")
            return 0.0
        workflow = self._create_text_workflow()
        result = workflow.invoke({
            "content": content,
            "campaign_desc": campaign.description,
            "campaign_reqs": campaign.data_requirements,
            "result_eval_a": None,
            "result_eval_b": None,
            "final": None
        })
        self.logger.info(f"Text document verification result: {result}")
        return result["final"].score

    def _create_image_workflow(self):
        self.logger.info("Creating image workflow.")
        class ImageState(TypedDict):
            image_b64: str
            campaign_desc: str
            eval_image_a: SimilarityScore | None
            eval_image_b: SimilarityScore | None
            final: SimilarityScore | None

        def evaluator_a(state: ImageState):
            self.logger.info("Starting evaluator A for image workflow.")
            try:
                messages = [
                    SystemMessage(content="You're a visual analysis expert. Evaluate image alignment with campaign."),
                    HumanMessage(content=[
                        {"type": "text", "text": f"Evaluate image for: {state['campaign_desc']}"},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{state['image_b64']}"}}
                    ])
                ]
                response = self.vision_model.invoke(messages)
                self.logger.info(f"Image evaluator A response: {response}")
                score = self._parse_image_response(response.content)
                self.logger.info(f"Evaluator A image score: {score}")
                return {"eval_image_a": score}
            except Exception as e:
                self.logger.error(f"Image evaluator A failed: {str(e)}")
                return {"eval_image_a": SimilarityScore(score=0.0, reason="Evaluation failed in evaluator A")}

        def evaluator_b(state: ImageState):
            self.logger.info("Starting evaluator B for image workflow.")
            try:
                messages = [
                    SystemMessage(content="You're a visual analysis expert. Evaluate image alignment with campaign."),
                    HumanMessage(content=[
                        {"type": "text", "text": f"Campaign: {state['campaign_desc']}"},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{state['image_b64']}"}}
                    ])
                ]
                response = self.qa_engineer.invoke(messages)
                self.logger.info(f"Image evaluator B response: {response}")
                score = self._parse_image_response(response.content)
                self.logger.info(f"Evaluator B image score: {score}")
                return {"eval_image_b": score}
            except Exception as e:
                self.logger.error(f"Image evaluator B failed: {str(e)}")
                return {"eval_image_b": SimilarityScore(score=0.0, reason="Evaluation failed in evaluator B")}

        def arbiter(state: ImageState):
            self.logger.info("Starting arbiter for image workflow.")
            try:
                a = state.get("eval_image_a")
                b = state.get("eval_image_b")
                if not a or not b:
                    raise ValueError("Missing evaluator results; cannot perform arbitration")
                prompt = ChatPromptTemplate.from_template(
                    "Reconcile image evaluations:\n"
                    "A: {a_score} - {a_reason}\n"
                    "B: {b_score} - {b_reason}\n\n"
                    "Provide final score (20-100) and comprehensive reason."
                )
                chain = prompt | self.writer.with_structured_output(SimilarityScore)
                result = chain.invoke({
                    "a_score": a.score,
                    "a_reason": a.reason,
                    "b_score": b.score,
                    "b_reason": b.reason
                })
                self.logger.info(f"Image arbiter result: {result}")
                return {"final": result}
            except Exception as e:
                self.logger.error(f"Image arbiter failed: {str(e)}")
                return {"final": SimilarityScore(score=0.0, reason="Arbitration failed")}

        workflow = StateGraph(ImageState)
        workflow.add_node("node_image_a", evaluator_a)
        workflow.add_node("node_image_b", evaluator_b)
        workflow.add_node("node_arbiter", arbiter)
        
        workflow.add_edge("node_image_a", "node_image_b")
        workflow.add_edge("node_image_b", "node_arbiter")
        workflow.add_edge("node_arbiter", END)
        
        workflow.set_entry_point("node_image_a")
        self.logger.info("Image workflow created successfully.")
        return workflow.compile()

    def verify_image(self, campaign: Campaign, file_path: str) -> float:
        self.logger.info(f"Verifying image document {file_path}.")
        base64_image = self._encode_image(file_path)
        workflow = self._create_image_workflow()
        result = workflow.invoke({
            "image_b64": base64_image,
            "campaign_desc": campaign.description,
            "eval_image_a": None,
            "eval_image_b": None,
            "final": None
        })
        self.logger.info(f"Image verification result: {result}")
        return result["final"].score

    def _create_csv_workflow(self):
        self.logger.info("Creating CSV workflow.")
        class CsvState(TypedDict):
            csv_content: str
            campaign_desc: str
            eval_csv_a: SimilarityScore | None
            eval_csv_b: SimilarityScore | None
            final: SimilarityScore | None

        def evaluator_a(state: CsvState):
            self.logger.info("Starting evaluator A for CSV workflow.")
            try:
                prompt = ChatPromptTemplate.from_template(
                    "As CSV Analysis Expert Evaluator A, analyze this CSV data for campaign relevance.\n"
                    "Campaign: {desc}\n\n"
                    "CSV Content:\n{csv_content}\n\n"
                    "Provide a score (20-100) and brief reasoning."
                )
                chain = prompt | self.researcher.with_structured_output(SimilarityScore)
                result = chain.invoke({
                    "desc": state["campaign_desc"],
                    "csv_content": state["csv_content"]
                })
                self.logger.info(f"CSV evaluator A result: {result}")
                return {"eval_csv_a": result}
            except Exception as e:
                self.logger.error(f"CSV evaluator A failed: {str(e)}")
                return {"eval_csv_a": SimilarityScore(score=0.0, reason="Evaluation failed in evaluator A")}

        def evaluator_b(state: CsvState):
            self.logger.info("Starting evaluator B for CSV workflow.")
            try:
                prompt = ChatPromptTemplate.from_template(
                    "As CSV Analysis Expert Evaluator B, assess the CSV data from another angle.\n"
                    "Campaign: {desc}\n\n"
                    "CSV Content:\n{csv_content}\n\n"
                    "Provide a score (20-100) and detailed reasoning."
                )
                chain = prompt | self.qa_engineer.with_structured_output(SimilarityScore)
                result = chain.invoke({
                    "desc": state["campaign_desc"],
                    "csv_content": state["csv_content"]
                })
                self.logger.info(f"CSV evaluator B result: {result}")
                return {"eval_csv_b": result}
            except Exception as e:
                self.logger.error(f"CSV evaluator B failed: {str(e)}")
                return {"eval_csv_b": SimilarityScore(score=0.0, reason="Evaluation failed in evaluator B")}

        def arbiter(state: CsvState):
            self.logger.info("Starting arbiter for CSV workflow.")
            try:
                a = state.get("eval_csv_a")
                b = state.get("eval_csv_b")
                if not a or not b:
                    raise ValueError("Missing CSV evaluator results; cannot perform arbitration")
                prompt = ChatPromptTemplate.from_template(
                    "Reconcile CSV evaluations:\n"
                    "A: {a_score} - {a_reason}\n"
                    "B: {b_score} - {b_reason}\n\n"
                    "Provide a final score (20-100) and comprehensive analysis."
                )
                chain = prompt | self.writer.with_structured_output(SimilarityScore)
                result = chain.invoke({
                    "a_score": a.score,
                    "a_reason": a.reason,
                    "b_score": b.score,
                    "b_reason": b.reason
                })
                self.logger.info(f"CSV arbiter result: {result}")
                return {"final": result}
            except Exception as e:
                self.logger.error(f"CSV arbiter failed: {str(e)}")
                return {"final": SimilarityScore(score=0.0, reason="Arbitration failed")}

        workflow = StateGraph(CsvState)
        workflow.add_node("node_csv_a", evaluator_a)
        workflow.add_node("node_csv_b", evaluator_b)
        workflow.add_node("node_csv_arbiter", arbiter)
        
        workflow.add_edge("node_csv_a", "node_csv_b")
        workflow.add_edge("node_csv_b", "node_csv_arbiter")
        workflow.add_edge("node_csv_arbiter", END)
        
        workflow.set_entry_point("node_csv_a")
        self.logger.info("CSV workflow created successfully.")
        return workflow.compile()

    def verify_csv_document(self, campaign: Campaign, file_path: str) -> float:
        self.logger.info(f"Verifying CSV document {file_path}.")
        csv_content = self._extract_csv_content(file_path)
        if not csv_content:
            self.logger.error("CSV content extraction failed.")
            return 0.0
        workflow = self._create_csv_workflow()
        result = workflow.invoke({
            "csv_content": csv_content,
            "campaign_desc": campaign.description,
            "eval_csv_a": None,
            "eval_csv_b": None,
            "final": None
        })
        self.logger.info(f"CSV document verification result: {result}")
        return result["final"].score

    def _extract_text_content(self, file_path: str) -> str:
        self.logger.info(f"Extracting text content from {file_path}.")
        try:
            if file_path.endswith('.pdf'):
                with open(file_path, "rb") as f:
                    pdf_reader = PyPDF2.PdfReader(f)
                    text = "\n".join(page.extract_text() for page in pdf_reader.pages if page.extract_text())
                    self.logger.info(f"Extracted text from PDF with {len(text)} characters.")
                    return text
            elif file_path.endswith('.csv'):
                return self._extract_csv_content(file_path)
            elif file_path.endswith('.txt'):
                with open(file_path, "r", encoding="utf-8") as f:
                    text = f.read()
                    self.logger.info(f"Extracted text from TXT with {len(text)} characters.")
                    return text
            elif file_path.endswith('.docx'):
                doc = Document(file_path)
                text = "\n".join(p.text for p in doc.paragraphs)
                self.logger.info(f"Extracted text from DOCX with {len(text)} characters.")
                return text
            elif file_path.endswith('.doc'):
                text = self._extract_doc_content(file_path)
                self.logger.info(f"Extracted text from DOC with {len(text)} characters.")
                return text
            else:
                self.logger.warning(f"File format for {file_path} is not explicitly supported. Returning empty string.")
                return ""
        except Exception as e:
            self.logger.error(f"Error extracting text content: {str(e)}")
            return ""

    def _extract_csv_content(self, file_path: str) -> str:
        self.logger.info(f"Extracting CSV content from {file_path}.")
        try:
            df = pd.read_csv(file_path)
            self.logger.info(f"Original CSV shape: {df.shape}.")
            # Additional CSV processing:
            # Remove rows with all missing values
            df.dropna(how='all', inplace=True)
            # Trim extra whitespace from string columns
            df = df.applymap(lambda x: x.strip() if isinstance(x, str) else x)
            self.logger.info(f"Processed CSV shape after cleaning: {df.shape}.")
            # You can also insert further processing here (e.g., check for required columns)
            csv_str = df.to_string(index=False)
            self.logger.info("CSV content extraction successful.")
            return csv_str
        except Exception as e:
            self.logger.error(f"Error extracting CSV content: {str(e)}")
            return ""

    def _encode_image(self, path: str) -> str:
        self.logger.info(f"Encoding image at {path}.")
        try:
            with open(path, "rb") as f:
                encoded = base64.b64encode(f.read()).decode()
            self.logger.info("Image encoding successful.")
            return encoded
        except Exception as e:
            self.logger.error(f"Error encoding image: {str(e)}")
            return ""

    def _extract_doc_content(self, path: str) -> str:
        self.logger.info(f"Extracting text from DOC file {path}.")
        try:
            result = subprocess.run(['antiword', path], capture_output=True, text=True)
            if result.returncode == 0:
                self.logger.info("DOC file extraction successful.")
                return result.stdout
            else:
                self.logger.error(f"Error reading DOC file: {result.stderr}")
                return ""
        except Exception as e:
            self.logger.error(f"Failed to extract text from DOC file: {str(e)}")
            return ""

    def _parse_image_response(self, response: str) -> SimilarityScore:
        self.logger.info("Parsing image response.")
        try:
            score = float(response.strip())
            self.logger.info(f"Parsed image score: {score}.")
            return SimilarityScore(score=score, reason="Image analysis")
        except Exception as e:
            self.logger.error(f"Error parsing image response: {str(e)}")
            return SimilarityScore(score=0.0, reason="Invalid response")
