import os
import uuid
import shutil
import mimetypes
import logging
import asyncio

from fastapi import APIRouter, HTTPException, Depends, Form, UploadFile, File, Query
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



@router.get("/akave/{onchain_campaign_id}/bucket-details", summary="Get bucket details by campaign ID")
def get_bucket_details_by_campaign(
    onchain_campaign_id: str,
    db: Session = Depends(get_session)
):
    """
    Retrieve bucket details for a campaign specified by the on_chain_campaign_id.
    """
    logger.info(f"Fetching bucket details for campaign: {onchain_campaign_id}")
    campaign = db.query(Campaign).filter(Campaign.onchain_campaign_id == onchain_campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    try:
        akave_api = AkaveLinkAPI()
        bucket_details = akave_api.get_bucket_details(str(campaign.bucket_name))
        logger.info(f"Bucket details fetched for campaign {onchain_campaign_id}: {bucket_details}")
        return bucket_details
    except Exception as e:
        logger.error(f"Error retrieving bucket details: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving bucket details: {str(e)}")



@router.get("/akave/{onchain_campaign_id}/files", summary="List files in the campaign's bucket")
def list_campaign_bucket_files(
    onchain_campaign_id: str,
    db: Session = Depends(get_session)
):
    """
    List files that are stored in the Akave bucket associated with a given campaign.
    """
    logger.info(f"Listing files in bucket for campaign: {onchain_campaign_id}")
    campaign = db.query(Campaign).filter(Campaign.onchain_campaign_id == onchain_campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    try:
        akave_api = AkaveLinkAPI()
        files_list = akave_api.list_files(str(campaign.bucket_name))
        logger.info(f"Files in campaign bucket {campaign.bucket_name}: {files_list}")
        return files_list
    except Exception as e:
        logger.error(f"Error listing campaign bucket files: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error listing campaign bucket files: {str(e)}")



@router.get("/akave/{onchain_campaign_id}/download/{file_name}", summary="Download a file from the campaign's bucket")
def download_campaign_file(
    onchain_campaign_id: str,
    filename: str = Query(..., description="Name of the file to download"),
    db: Session = Depends(get_session)
):
    """
    Download a file from the Akave bucket associated with a given campaign.
    The file is saved locally and its path is returned.
    """
    logger.info(f"Downloading file '{filename}' for campaign: {onchain_campaign_id}")
    campaign = db.query(Campaign).filter(Campaign.onchain_campaign_id == onchain_campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    try:
        akave_api = AkaveLinkAPI()
        # Use a temporary directory or your desired output directory
        output_dir = "/tmp"  
        downloaded_file = akave_api.download_file(str(campaign.bucket_name), filename, output_dir)
        logger.info(f"File downloaded successfully: {downloaded_file}")
        return {"downloaded_file": downloaded_file}
    except Exception as e:
        logger.error(f"Error downloading file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error downloading file: {str(e)}")




@router.get("/akave/bucket/{bucket_name}/details", summary="Get details for a specified bucket")
def get_bucket_details(
    bucket_name: str,
):
    """
    Retrieve details for a given bucket name.
    """
    logger.info(f"Fetching details for bucket: {bucket_name}")
    try:
        akave_api = AkaveLinkAPI()
        bucket_details = akave_api.get_bucket_details(bucket_name)
        logger.info(f"Bucket details for {bucket_name}: {bucket_details}")
        return bucket_details
    except Exception as e:
        logger.error(f"Error retrieving bucket details for {bucket_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving bucket details: {str(e)}")



@router.get("/akave/bucket/{bucket_name}/files", summary="List files in a specified bucket")
def list_bucket_files(
    bucket_name: str,
):
    """
    List files in a specified bucket.
    """
    logger.info(f"Listing files in bucket: {bucket_name}")
    try:
        akave_api = AkaveLinkAPI()
        files_list = akave_api.list_files(bucket_name)
        logger.info(f"Files in bucket {bucket_name}: {files_list}")
        return files_list
    except Exception as e:
        logger.error(f"Error listing files in bucket {bucket_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error listing files in bucket: {str(e)}")


"""
- We need to return RootCID iof the uploaded file 
- we also need to return reason if the verification is unsuccessful
"""