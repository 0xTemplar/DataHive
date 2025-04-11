from celery import Celery
import requests
import os
import tempfile
import time
import json
import datetime
import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier  # For classification
from sklearn.metrics import accuracy_score

from app.ai_verification.akave import AkaveLinkAPI, AkaveLinkAPIError
from app.core.constants import BASE_URL, API_KEY, REDIS_URL
from app.campaigns.models import Campaign, TrainingStatus
from app.core.database import SessionLocal

# Create a Celery app
celery_app = Celery('tasks', broker=REDIS_URL)  

# Defining the task that will call the endpoint
@celery_app.task
def mark_expired_campaigns_inactive():
    """
    Query active campaigns whose expiration timestamp has passed and mark them as inactive.
    """
    db = SessionLocal()
    try:
        now = int(time.time())
        # Query for campaigns that are still active but have passed their expiration date.
        expired_campaigns = db.query(Campaign).filter(
            Campaign.expiration < now,
            Campaign.is_active == True
        ).all()

        # Mark each campaign as inactive.
        for campaign in expired_campaigns:
            campaign.is_active = False

        db.commit()
        print(f"Marked {len(expired_campaigns)} campaigns as inactive.")
    except Exception as e:
        db.rollback()
        print(f"Error marking expired campaigns as inactive: {e}")
    finally:
        db.close()


@celery_app.task
def renew_subscriptions():
    try:
        headers = {
            'X-API-Key': API_KEY,
            'Content-Type': 'application/json'
        }
        response = requests.post(url=BASE_URL, headers=headers)
        response.raise_for_status()  # Check for successful response
        print("process renewed successfully")
    except requests.exceptions.RequestException as e:
        print(f"Error renewing subscriptions: {e}")


@celery_app.task(name="run_training_task")
def run_training_task(campaign_id: str, training_status_id: str, training_params: dict):
    db = SessionLocal()
    try:
        # Update training status to "running"
        training_status = db.query(TrainingStatus).filter(TrainingStatus.id == training_status_id).first()
        if not training_status:
            raise Exception("Training status record not found")
        training_status.status = "running"
        db.commit()

        # Fetch campaign details to get the bucket name
        campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if not campaign:
            raise Exception("Campaign not found")
        bucket_name = campaign.bucket_name

        # Initialize the Akave Link client
        akave = AkaveLinkAPI(base_url="http://ec2-44-200-196-16.compute-1.amazonaws.com:8000")
        
        # List CSV files in the bucket
        files = akave.list_files(bucket_name)  # Assume this returns a list of filenames
        csv_files = [f for f in files if f.endswith(".csv")]
        if not csv_files:
            raise Exception("No CSV files found in the bucket")
        
        # Download and merge all CSV files into one DataFrame
        dfs = []
        with tempfile.TemporaryDirectory() as temp_dir:
            for file in csv_files:
                file_path = os.path.join(temp_dir, file)
                if akave.download_file(bucket_name, file, file_path):
                    df = pd.read_csv(file_path)
                    dfs.append(df)
            combined_df = pd.concat(dfs, ignore_index=True)
        
        # Extract training parameters from the task payload
        target_column = training_params.get("target_column")
        feature_columns = training_params.get("feature_columns")
        training_type = training_params.get("training_type", "classification")
        
        # Verify that the target column exists
        if target_column not in combined_df.columns:
            raise Exception(f"Target column '{target_column}' not found in dataset")
        
        # If feature columns are provided, verify and use them; otherwise, use all columns except target.
        if feature_columns:
            for col in feature_columns:
                if col not in combined_df.columns:
                    raise Exception(f"Feature column '{col}' not found in dataset")
            X = combined_df[feature_columns]
        else:
            X = combined_df.drop(target_column, axis=1)
        y = combined_df[target_column]
        
        # Train a model based on training_type (defaulting to classification)
        if training_type == "classification":
            model = RandomForestClassifier(n_estimators=100, random_state=42)
            model.fit(X, y)
            preds = model.predict(X)
            accuracy = accuracy_score(y, preds)
            model_info = {
                "model_type": "RandomForestClassifier",
                "features": list(X.columns),
                "accuracy": float(accuracy),
                "training_samples": len(X),
                "completed_at": datetime.datetime.utcnow().isoformat()
            }
        # Placeholder for other training types (e.g., regression)
        else:
            raise Exception(f"Unsupported training_type '{training_type}'")
        
        # Save the trained model and metadata locally
        with tempfile.TemporaryDirectory() as temp_dir:
            model_file = os.path.join(temp_dir, "trained_model.joblib")
            info_file = os.path.join(temp_dir, "model_info.json")
            joblib.dump(model, model_file)
            with open(info_file, "w") as f:
                json.dump(model_info, f, indent=2)
            
            # Upload the model artifacts back to the same bucket
            upload_model = akave.upload_file(bucket_name, model_file)
            upload_info = akave.upload_file(bucket_name, info_file)
            
            if upload_model and upload_info:
                training_status.status = "completed"
                # In this example, we build a result URL from the bucket and file name.
                training_status.result_url = f"{bucket_name}/trained_model.joblib"
                training_status.completed_at = datetime.datetime.utcnow()
            else:
                training_status.status = "failed"
            
            db.commit()
    except Exception as e:
        db.rollback()
        # Mark the training status as failed
        training_status = db.query(TrainingStatus).filter(TrainingStatus.id == training_status_id).first()
        if training_status:
            training_status.status = "failed"
            db.commit()
        raise e
    finally:
        db.close()


# Schedule the task to run every 30 minutes.
celery_app.conf.beat_schedule = {
    'mark-expired-campaigns-inactive-every-30-minutes': {
        'task': 'tasks.mark_expired_campaigns_inactive',
        'schedule': 30 * 60,  # Every 30 minutes (in seconds)
    },
    'renew-subscriptions-12-hours': {
        'task': 'tasks.renew_subscriptions',
        'schedule': 12 * 60 * 60,  # Every 12 hours (in seconds)
    },
}