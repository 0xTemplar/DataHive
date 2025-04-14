"""
Complete ML Workflow with Akave Link API

This script demonstrates a full machine learning workflow using Akave Link API for storage:
1. Create a storage bucket
2. Upload a custom dataset to the bucket
3. Fetch the dataset and train a model
4. Save and upload the trained model and metadata
5. Query the trained model by loading it from storage

Prerequisites:
- Python 3.8+
- Akave Link API running locally
- scikit-learn, pandas, numpy, joblib packages
"""

import os
import json
import time
import requests
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
import joblib
import tempfile
from app.ai_verification.akave import AkaveLinkAPI, AkaveLinkAPIError  # Assuming the API class is in this module

# Configuration
BUCKET_NAME = "ml-workflow"
API_BASE_URL = "https://akave.poeai.app/"

def initialize_akave_client():
    """Initialize and configure the Akave client with bucket"""
    print("\nInitializing Akave Link connection...")
    akave = AkaveLinkAPI(base_url=API_BASE_URL)
    
    try:
        # Create or verify bucket exists
        akave.create_bucket(BUCKET_NAME)
        print(f"Using bucket '{BUCKET_NAME}'")
    except AkaveLinkAPIError as e:
        if "already exists" in str(e):
            print(f"Using existing bucket '{BUCKET_NAME}'")
        else:
            raise
    
    return akave

def create_sample_dataset():
    """Create a sample diabetes dataset for demonstration"""
    print("\n" + "="*60)
    print("Creating sample diabetes prediction dataset...")
    # Generate synthetic data
    n_samples = 1000
    
    features = np.random.rand(n_samples, 8) 
    features[:, 0] *= 50  # age: 0-50
    features[:, 1] *= 40  # bmi: 0-40
    features[:, 2] *= 120  # blood pressure: 0-120
    features[:, 3] *= 200  # glucose: 0-200
    
    target = np.random.randint(0, 2, size=n_samples)
    
    feature_names = ['age', 'bmi', 'blood_pressure', 'glucose', 
                     'insulin', 'skin_thickness', 'dpf', 'pregnancies']
    
    df = pd.DataFrame(features, columns=feature_names)
    df['diabetes'] = target
    
    return df

def upload_file(akave_client, bucket_name, file_path):
    """Upload a file to Akave storage"""
    try:
        print(f"\nUploading {os.path.basename(file_path)}...")
        response = akave_client.upload_file(bucket_name, file_path)
        print("Upload successful!")
        return True
    except AkaveLinkAPIError as e:
        print(f"Upload failed: {e}")
        return False

def download_file(akave_client, bucket_name, file_name, output_path):
    """Download a file from Akave storage"""
    try:
        print(f"\nDownloading {file_name}...")
        downloaded_path = akave_client.download_file(
            bucket_name, 
            file_name, 
            output_dir=os.path.dirname(output_path)
        )
        if downloaded_path:
            os.rename(downloaded_path, output_path)  # Ensure exact path naming
            print(f"Download saved to {output_path}")
            return True
        return False
    except AkaveLinkAPIError as e:
        print(f"Download failed: {e}")
        return False

def train_model(dataset_path):
    """Train a machine learning model on the dataset"""
    print("\n" + "="*60)
    print("Training model...")
    
    df = pd.read_csv(dataset_path)
    X = df.drop('diabetes', axis=1)
    y = df['diabetes']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    model = RandomForestClassifier(n_estimations=100, random_state=42)
    model.fit(X_train, y_train)
    
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"Model accuracy: {accuracy:.4f}")
    
    model_info = {
        "model_type": "RandomForestClassifier",
        "features": list(X.columns),
        "accuracy": float(accuracy),
        "training_samples": len(X_train),
        "test_samples": len(X_test)
    }
    
    return model, model_info

def main():
    akave = initialize_akave_client()
    
    with tempfile.TemporaryDirectory() as temp_dir:
        # Create and upload dataset
        dataset = create_sample_dataset()
        dataset_path = os.path.join(temp_dir, "diabetes_dataset.csv")
        dataset.to_csv(dataset_path, index=False)
        
        if not upload_file(akave, BUCKET_NAME, dataset_path):
            return
        
        # Download and train
        downloaded_dataset_path = os.path.join(temp_dir, "downloaded_dataset.csv")
        if download_file(akave, BUCKET_NAME, "diabetes_dataset.csv", downloaded_dataset_path):
            model, model_info = train_model(downloaded_dataset_path)
            
            # Save and upload artifacts
            model_path = os.path.join(temp_dir, "diabetes_model.joblib")
            model_info_path = os.path.join(temp_dir, "model_info.json")
            
            joblib.dump(model, model_path)
            with open(model_info_path, 'w') as f:
                json.dump(model_info, f, indent=2)
            
            if (upload_file(akave, BUCKET_NAME, model_path) and 
                upload_file(akave, BUCKET_NAME, model_info_path)):
                
                # Download and test model
                downloaded_model_path = os.path.join(temp_dir, "downloaded_model.joblib")
                if download_file(akave, BUCKET_NAME, "diabetes_model.joblib", downloaded_model_path):
                    loaded_model = joblib.load(downloaded_model_path)
                    
                    print("\n" + "="*60)
                    print("Making predictions...")
                    sample_data = [[45, 26.5, 80, 140, 200, 35, 0.5, 0]]
                    sample_df = pd.DataFrame(sample_data, columns=model_info["features"])
                    prediction = loaded_model.predict(sample_df)
                    proba = loaded_model.predict_proba(sample_df)
                    
                    print(f"Prediction: {'Diabetic' if prediction[0] == 1 else 'Not Diabetic'}")
                    print(f"Probabilities: Not Diabetic: {proba[0][0]:.4f}, Diabetic: {proba[0][1]:.4f}")

if __name__ == "__main__":
    main()