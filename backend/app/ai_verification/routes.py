import os
import uuid
import shutil
import mimetypes
import logging
import asyncio

from fastapi import APIRouter, HTTPException, Depends, Form, UploadFile, File
from sqlalchemy.orm import Session
from app.campaigns.models import Campaign
from app.core.database import get_session
from app.core.constants import LILYPAD_API_KEY
from redis.asyncio import Redis

from app.ai_verification.services import AIVerificationSystem
from app.ai_verification.akave import AkaveLinkAPI
# from app.ai_verification.agent import get_long_context_llm, get_fast_llm, get_code_llm
from app.core.redis import get_redis_pool  # Your redis dependency


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/contributions/verify", summary="Upload a document to verify a contribution")
async def verify_contribution(
    onchain_campaign_id: str = Form(...),
    wallet_address: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_session),
    redis_pool: Redis = Depends(get_redis_pool)
):
    """
    Endpoint to upload a document (image, PDF, text, CSV, DOC, DOCX) along with an onchain_campaign_id
    and wallet_address. The campaign description is fetched from the Campaign model.
    The document is then processed using the AI verification system with caching.
    """
    logger.info(f"Received onchain_campaign_id: {onchain_campaign_id}")
    logger.info(f"Received wallet_address: {wallet_address}")
    # Retrieve the campaign by its onchain_campaign_id.
    campaign = db.query(Campaign).filter(
        Campaign.onchain_campaign_id == onchain_campaign_id
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Save the uploaded file to a temporary path.
    temp_file_path = f"/tmp/{uuid.uuid4()}_{file.filename}"
    with open(temp_file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Instantiate the AI verification system with Redis caching.
    verifier = AIVerificationSystem(redis_pool=redis_pool)
    
    try:
        # Call the asynchronous verify method (which applies caching, fairness adjustment, etc.)
        verification_score = await verifier.verify(campaign, temp_file_path, wallet_address)
    except Exception as e:
        os.remove(temp_file_path)
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")
    
    # Remove the temporary file.
    os.remove(temp_file_path)
    
    return {"verification_score": verification_score}


# @router.post("/contributions/verify-text", summary="Upload a text-based document to verify a contribution")
# async def verify_text_contribution(
#     onchain_campaign_id: str = Form(...),
#     wallet_address: str = Form(...),
#     file: UploadFile = File(...),
#     db: Session = Depends(get_session),
#     redis_pool: Redis = Depends(get_redis_pool)
# ):
#     """
#     Endpoint to upload a text-based document (PDF, CSV, TXT, DOC, DOCX) along with an onchain_campaign_id
#     and wallet_address. Uses the caching-enabled verification method.
#     """
#     logger.info(f"Received onchain_campaign_id: {onchain_campaign_id}")
#     logger.info(f"Received wallet_address: {wallet_address}")
#     try:
#         campaign = db.query(Campaign).filter(
#             Campaign.onchain_campaign_id == onchain_campaign_id
#         ).first()
#         if not campaign:
#             raise HTTPException(status_code=404, detail="Campaign not found")

#         storage = AkaveLinkAPI()
        
#         temp_file_path = f"/tmp/{uuid.uuid4()}_{file.filename}"
#         with open(temp_file_path, "wb") as buffer:
#             shutil.copyfileobj(file.file, buffer)
        
#         verifier = AIVerificationSystem(redis_pool=redis_pool)
#         try:
#             # Even though this endpoint is intended for text documents,
#             # we call the common async verify method so that caching and fairness adjustment apply.
#             bucket_name = str(campaign.bucket_name)
#             verification_score = await verifier.verify(campaign, temp_file_path, wallet_address)
#             store = storage.upload_file(bucket_name, temp_file_path)
#         except Exception as e:
#             os.remove(temp_file_path)
#             raise HTTPException(status_code=500, detail=f"Text document verification failed: {str(e)}")
        
#         os.remove(temp_file_path)
#         return {"verification_score": verification_score, "store": store}

#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Failed to verify text contribution: {str(e)}")


# @router.post("/contributions/verify-image", summary="Upload an image to verify a contribution")
# async def verify_image_contribution(
#     onchain_campaign_id: str = Form(...),
#     wallet_address: str = Form(...),
#     file: UploadFile = File(...),
#     db: Session = Depends(get_session),
#     redis_pool: Redis = Depends(get_redis_pool)
# ):
#     """
#     Endpoint to upload an image (PNG, JPG, JPEG, WEBP) along with an onchain_campaign_id
#     and wallet_address. Uses the caching-enabled verification method.
#     """
#     logger.info(f"Received onchain_campaign_id: {onchain_campaign_id}")
#     logger.info(f"Received wallet_address: {wallet_address}")
#     try:
#         campaign = db.query(Campaign).filter(
#             Campaign.onchain_campaign_id == onchain_campaign_id
#         ).first()

#         if not campaign:
#             raise HTTPException(status_code=404, detail="Campaign not found")

#         storage = AkaveLinkAPI()
        
#         temp_file_path = f"/tmp/{uuid.uuid4()}_{file.filename}"
#         with open(temp_file_path, "wb") as buffer:
#             shutil.copyfileobj(file.file, buffer)
        
#         verifier = AIVerificationSystem(redis_pool=redis_pool)
#         try:
#             bucket_name = str(campaign.bucket_name)
#             verification_score = await verifier.verify(campaign, temp_file_path, wallet_address)
#             store = storage.upload_file(bucket_name, temp_file_path)
#         except Exception as e:
#             os.remove(temp_file_path)
#             raise HTTPException(status_code=500, detail=f"Image verification failed: {str(e)}")
        
#         os.remove(temp_file_path)
#         return {"verification_score": verification_score, "store": store}

#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Failed to verify image contribution: {str(e)}")

# @router.post("/contributions/verify-csv", summary="Upload a CSV file to verify a contribution")
# async def verify_csv_contribution(
#     onchain_campaign_id: str = Form(...),
#     wallet_address: str = Form(...),
#     file: UploadFile = File(...),
#     db: Session = Depends(get_session),
#     redis_pool: Redis = Depends(get_redis_pool)
# ):
#     """
#     Endpoint to upload a CSV file along with an onchain_campaign_id and wallet_address.
#     Uses the caching-enabled CSV verification method that includes additional CSV processing.
#     """
#     logger.info(f"Received onchain_campaign_id: {onchain_campaign_id}")
#     logger.info(f"Received wallet_address: {wallet_address}")

#     try:
#         campaign = db.query(Campaign).filter(
#             Campaign.onchain_campaign_id == onchain_campaign_id
#         ).first()
#         if not campaign:
#             raise HTTPException(status_code=404, detail="Campaign not found")

#         storage = AkaveLinkAPI()
        
#         temp_file_path = f"/tmp/{uuid.uuid4()}_{file.filename}"
#         with open(temp_file_path, "wb") as buffer:
#             shutil.copyfileobj(file.file, buffer)
#         logger.info(f"Temporary file created at {temp_file_path}.")

#         verifier = AIVerificationSystem(redis_pool=redis_pool)
#         try:
#             bucket_name = str(campaign.bucket_name)
#             # Run the CSV verification in a thread (since verify_csv_document is sync)
#             # This method includes additional CSV processing as defined in _extract_csv_content.
#             verification_score = await asyncio.to_thread(
#                 verifier.verify_csv_document, campaign, temp_file_path
#             )
#             logger.info(f"CSV verification score obtained: {verification_score}.")
#             store = storage.upload_file(bucket_name, temp_file_path)
#             logger.info(f"File uploaded to storage bucket: {bucket_name}.")
#         except Exception as e:
#             logger.error(f"CSV file verification failed: {str(e)}")
#             os.remove(temp_file_path)
#             raise HTTPException(status_code=500, detail=f"CSV file verification failed: {str(e)}")
        
#         os.remove(temp_file_path)
#         logger.info(f"Temporary file {temp_file_path} removed after processing.")
#         return {"verification_score": verification_score, "store": store}

#     except Exception as e:
#         logger.error(f"Failed to verify CSV contribution: {str(e)}")
#         raise HTTPException(status_code=500, detail=f"Failed to verify CSV contribution: {str(e)}")


@router.post("/contributions/verify-text", summary="Upload a text-based document to verify a contribution")
async def verify_text_contribution(
    onchain_campaign_id: str = Form(...),
    wallet_address: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_session),
    redis_pool: Redis = Depends(get_redis_pool)
):
    logger.info(f"Received onchain_campaign_id: {onchain_campaign_id}")
    logger.info(f"Received wallet_address: {wallet_address}")
    try:
        campaign = db.query(Campaign).filter(
            Campaign.onchain_campaign_id == onchain_campaign_id
        ).first()
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")

        storage = AkaveLinkAPI()
        
        temp_file_path = f"/tmp/{uuid.uuid4()}_{file.filename}"
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        logger.info(f"Temporary file created at {temp_file_path}.")

        verifier = AIVerificationSystem(redis_pool=redis_pool)
        try:
            # Use the generic verify method which now returns a SimilarityScore
            evaluation = await verifier.verify(campaign, temp_file_path, wallet_address)
            store = storage.upload_file(str(campaign.bucket_name), temp_file_path)
            logger.info("Text document verification and storage completed successfully.")
        except Exception as e:
            os.remove(temp_file_path)
            raise HTTPException(status_code=500, detail=f"Text document verification failed: {str(e)}")
        
        os.remove(temp_file_path)
        return {"verification_score": evaluation.score, "verification_reason": evaluation.reason, "store": store}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to verify text contribution: {str(e)}")


@router.post("/contributions/verify-image", summary="Upload an image to verify a contribution")
async def verify_image_contribution(
    onchain_campaign_id: str = Form(...),
    wallet_address: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_session),
    redis_pool: Redis = Depends(get_redis_pool)
):
    logger.info(f"Received onchain_campaign_id: {onchain_campaign_id}")
    logger.info(f"Received wallet_address: {wallet_address}")
    try:
        campaign = db.query(Campaign).filter(
            Campaign.onchain_campaign_id == onchain_campaign_id
        ).first()

        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")

        storage = AkaveLinkAPI()
        
        temp_file_path = f"/tmp/{uuid.uuid4()}_{file.filename}"
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        logger.info(f"Temporary file created at {temp_file_path}.")

        verifier = AIVerificationSystem(redis_pool=redis_pool)
        try:
            evaluation = await asyncio.to_thread(verifier.verify, campaign, temp_file_path, wallet_address)
            store = storage.upload_file(str(campaign.bucket_name), temp_file_path)
            logger.info("Image verification and storage completed successfully.")
        except Exception as e:
            os.remove(temp_file_path)
            raise HTTPException(status_code=500, detail=f"Image verification failed: {str(e)}")
        
        os.remove(temp_file_path)
        return {"verification_score": evaluation.score, "verification_reason": evaluation.reason, "store": store}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to verify image contribution: {str(e)}")


@router.post("/contributions/verify-csv", summary="Upload a CSV file to verify a contribution")
async def verify_csv_contribution(
    onchain_campaign_id: str = Form(...),
    wallet_address: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_session),
    redis_pool: Redis = Depends(get_redis_pool)
):
    logger.info(f"Received onchain_campaign_id: {onchain_campaign_id}")
    logger.info(f"Received wallet_address: {wallet_address}")
    try:
        campaign = db.query(Campaign).filter(
            Campaign.onchain_campaign_id == onchain_campaign_id
        ).first()
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")

        storage = AkaveLinkAPI()
        
        temp_file_path = f"/tmp/{uuid.uuid4()}_{file.filename}"
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        logger.info(f"Temporary file created at {temp_file_path}.")

        verifier = AIVerificationSystem(redis_pool=redis_pool)
        try:
            # Use the CSV-specific workflow via the generic verify() method.
            evaluation = await asyncio.to_thread(verifier.verify, campaign, temp_file_path, wallet_address)
            store = storage.upload_file(str(campaign.bucket_name), temp_file_path)
            logger.info("CSV document verification and storage completed successfully.")
        except Exception as e:
            os.remove(temp_file_path)
            raise HTTPException(status_code=500, detail=f"CSV file verification failed: {str(e)}")
        
        os.remove(temp_file_path)
        return {"verification_score": evaluation.score, "verification_reason": evaluation.reason, "store": store}

    except Exception as e:
        logger.error(f"Failed to verify CSV contribution: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to verify CSV contribution: {str(e)}")

"""
- We need to return RootCID iof the uploaded file 
- we also need to return reason if the verification is unsuccessful
"""