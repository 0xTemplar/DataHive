import uuid
from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from app.core.database import Base

class Campaign(Base):
    __tablename__ = 'campaigns'
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    bucket_name = Column(String, index=True)
    workflow_bucket_name = Column(String, index=True, nullable=True)
    onchain_campaign_id = Column(String, index=True)
    creator_wallet_address = Column(String, index=True) 
    title = Column(String, index=True)
    description = Column(String)
    campaign_type = Column(String, index=True)
    data_requirements = Column(String)
    quality_criteria = Column(String)
    unit_price = Column(Float)
    total_budget = Column(Float)
    min_data_count = Column(Integer)
    max_data_count = Column(Integer)
    expiration = Column(Integer)  # Unix timestamp
    metadata_uri = Column(String)
    transaction_hash = Column(String)
    platform_fee = Column(Float)
    is_csv_only_campaign = Column(Boolean, default=False, index=True)
    is_premium = Column(Boolean, default=False, index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    current_activity_level = Column(Float, default=0.0)

    contributions = relationship("Contribution", back_populates="campaign")
    activities = relationship("Activity", back_populates="campaign")
    training_statuses = relationship("TrainingStatus", back_populates="campaign")  # New relationship


class Contribution(Base):
    __tablename__ = 'contributions'

    contribution_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    onchain_contribution_id = Column(String, index=True, nullable=True)
    campaign_id = Column(String, ForeignKey("campaigns.id"), nullable=False)
    contributor = Column(String, index=True)
    data_url = Column(String, index=True, nullable=True)
    file_name_url = Column(String, index=True, nullable=True)
    transaction_hash = Column(String)
    ai_verification_score = Column(Float, nullable=True)
    reputation_score = Column(Float, nullable=True)
    quality_score = Column(Integer)
    is_verified = Column(Boolean, default=False)
    reward_claimed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    campaign = relationship("Campaign", back_populates="contributions")
    activities = relationship("Activity", back_populates="contribution")


class Activity(Base):
    __tablename__ = 'activity'
    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(String, ForeignKey("campaigns.id"), nullable=False)  # Foreign key to track activity by campaign
    contribution_id = Column(String, ForeignKey("contributions.contribution_id"), nullable=True)
    timestamp = Column(DateTime, index=True)
    activity_level = Column(Float)  # Activity level (0-100)
    
    campaign = relationship("Campaign", back_populates="activities")
    contribution = relationship("Contribution", back_populates="activities")


class TrainingStatus(Base):
    __tablename__ = 'training_status'
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    campaign_id = Column(String, ForeignKey("campaigns.id"), nullable=False)
    status = Column(String, default="pending")  # e.g.: pending, running, completed, failed
    result_url = Column(String, nullable=True)  # Where the trained model is stored
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    campaign = relationship("Campaign", back_populates="training_statuses")