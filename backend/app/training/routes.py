import logging
from fastapi import FastAPI, HTTPException, Depends, APIRouter
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional, Dict
from datetime import datetime, timedelta

from app.campaigns.models import Campaign, Contribution, Activity, TrainingStatus
from app.campaigns.schemas import CampaignCreate, CampaignResponse, ContributionCreate, ContributionResponse, CampaignsActiveResponse, ContributionsListResponse, WalletCampaignsResponse, WeeklyAnalyticsResponse
from app.campaigns.services import serialize_campaign, track_campaign_activity_overall, track_contribution_activity, get_quality_score_category
from app.core.database import get_session
from app.ai_verification import AkaveLinkAPI, AkaveLinkAPIError
from app.celery.celery import celery_app, run_training_task
from app.training.schemas import TrainingRequest


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()


@app.post("/start-training")
def start_training(request: TrainingRequest, db: Session = Depends(get_session)):
    # Look up the campaign using the on-chain campaign ID
    campaign = db.query(Campaign).filter(
        Campaign.onchain_campaign_id == request.on_chain_campaign_id
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Create a new training status record
    training_status = TrainingStatus(
        campaign_id=campaign.id,
        status="pending"
    )
    db.add(training_status)
    db.commit()
    db.refresh(training_status)
    
    # Prepare training parameters from the request
    training_params = request.dict()
    
    # Enqueue the background training task with the campaign id, training status id, and extra parameters
    celery_app.send_task("run_training_task", args=[campaign.id, training_status.id, training_params])
    
    return {"message": "Training started", "training_status_id": training_status.id}


@app.get("/training-status/{status_id}")
def get_training_status(status_id: str, db: Session = Depends(get_session)):
    training_status = db.query(TrainingStatus).filter(TrainingStatus.id == status_id).first()
    if not training_status:
        raise HTTPException(status_code=404, detail="Training status not found")
    return {
        "campaign_id": training_status.campaign_id,
        "status": training_status.status,
        "result_url": training_status.result_url,
        "started_at": training_status.started_at,
        "completed_at": training_status.completed_at
    }