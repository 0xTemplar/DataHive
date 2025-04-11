from pydantic import BaseModel
from typing import Optional, List


class TrainingRequest(BaseModel):
    on_chain_campaign_id: str
    target_column: str
    feature_columns: Optional[List[str]] = None
    training_type: Optional[str] = "classification"