import os
import json
import logging
import uuid
from typing import List, Dict, Any, Optional, Union, AsyncGenerator

from fastapi import FastAPI, HTTPException, Depends, APIRouter, Body, BackgroundTasks
from pydantic import BaseModel, Field as PydanticField # Renamed to avoid conflict with SQLAlchemy Field
from sqlalchemy.orm import Session
from sqlalchemy import Column, String, DateTime, JSON as SQLJSON, func as sql_func, Index

# --- Database Setup (using your provided snippets) ---
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from contextlib import contextmanager

# Assuming constants.py contains SQLALCHEMY_DATABASE_URL and REDIS_URL
# from app.core.constants import SQLALCHEMY_DATABASE_URL, REDIS_URL
# Placeholder values if not available, replace with your actual URLs
SQLALCHEMY_DATABASE_URL = os.getenv("SQLALCHEMY_DATABASE_URL", "sqlite:///./multi_agent_api.db")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

Base = declarative_base()
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in SQLALCHEMY_DATABASE_URL else {}) # Add check_same_thread for SQLite
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Redis Setup (using your provided snippets) ---
from redis.asyncio import Redis as AsyncRedis # Renamed to avoid confusion

async def get_redis_pool() -> AsyncRedis:
    # pool = AsyncRedis.from_url(REDIS_URL, max_connections=40, decode_responses=True) # decode_responses=True is often useful
    # For simplicity, directly return a client instance. Connection pooling is handled by the client.
    return AsyncRedis.from_url(REDIS_URL, decode_responses=True)

# Global Redis client (recommended to manage it with app lifespan events for production)
redis_client: Optional[AsyncRedis] = None

async def get_redis() -> AsyncRedis:
    global redis_client
    if redis_client is None:
        # This is a simplified way; for production, use FastAPI lifespan events
        # to initialize and close the Redis client.
        redis_client = await get_redis_pool()
    return redis_client


# --- Workflow Framework Imports (from enterprise_workflow.py) ---
try:
    from enterprise_workflow import (
        EnterpriseWorkflowManager,
        AppConfig as WFAppConfig,
        ToolRegistry as WFToolRegistry,
        BaseTool as WFBaseTool,
        tool as wf_tool,
        WorkflowDefinition as WFWorkflowDefinition, # This is a TypedDict
        AgentConfigData as WFAgentConfigData,
        WorkflowNodeData as WFWorkflowNodeData,
        WorkflowEdgeData as WFWorkflowEdgeData
    )
except ImportError as e:
    logging.critical(f"Failed to import from enterprise_workflow.py: {e}. API will not function correctly.")
    # Define placeholders if import fails
    class WFBaseTool: pass
    def wf_tool(func): return func
    WFWorkflowDefinition = Dict
    WFAgentConfigData = Dict
    WFWorkflowNodeData = Dict
    WFWorkflowEdgeData = Dict
    class EnterpriseWorkflowManager:
        def __init__(self, *args, **kwargs): raise NotImplementedError("Workflow system not loaded")
        def run_workflow(self, *args, **kwargs): raise NotImplementedError("Workflow system not loaded")
    class WFAppConfig:
        FASTAPI_BASE_URL = os.getenv("FASTAPI_BASE_URL") # Ensure this is picked up

# --- Logging ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(name)s - %(message)s')
logger = logging.getLogger("MultiAgentAPI_v2")

# --- Global Workflow App Config ---
WF_CONFIG = WFAppConfig()
if not WF_CONFIG.FASTAPI_BASE_URL: # From enterprise_workflow's AppConfig
    logger.warning("FASTAPI_BASE_URL for campaign tools is not set in WFAppConfig. Tools needing it may fail.")


# --- Database Model for Workflow Definitions ---
class WorkflowDefinitionDB(Base):
    __tablename__ = "workflow_definitions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    workflow_id_api = Column(String, unique=True, index=True, nullable=False) # API-facing ID
    name = Column(String, index=True, nullable=False)
    wallet_address = Column(String, index=True, nullable=False) # Creator's wallet
    definition = Column(SQLJSON, nullable=False) # Stores the WFWorkflowDefinition TypedDict
    created_at = Column(DateTime(timezone=True), server_default=sql_func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=sql_func.now())

    __table_args__ = (Index("ix_workflow_definitions_wallet_name", "wallet_address", "name"),)

# Create tables if they don't exist (for demo purposes)
Base.metadata.create_all(bind=engine)


# --- Pydantic Models for API (adapted from previous version) ---
class WorkflowDefinitionIn(BaseModel): # For creating/updating workflow definitions
    name: str = PydanticField(..., min_length=3, max_length=100, description="Human-readable name for the workflow.")
    wallet_address: str = PydanticField(..., description="Wallet address of the workflow creator/owner.")
    definition_payload: WFWorkflowDefinition = PydanticField(..., description="The complete workflow definition structure.")
    # workflow_id_api is generated by the server or can be user-provided if checked for uniqueness

class WorkflowDefinitionResponse(BaseModel):
    workflow_id_api: str
    name: str
    wallet_address: str
    definition_payload: WFWorkflowDefinition
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True # For SQLAlchemy model conversion

# Other Pydantic models (WorkflowRunDetailRequest, WorkflowRunResponse, etc.) remain similar
# but ensure they don't conflict with new DB models if names overlap.
class WorkflowRunDetailRequest(BaseModel):
    task_description: str = PydanticField(..., description="The initial task or query for the workflow.")
    initial_scratchpad: Optional[Dict[str, Any]] = PydanticField(default_factory=dict, description="Initial data for the workflow's scratchpad.")
    thread_id: Optional[str] = PydanticField(default_None=True, description="Optional thread ID for resuming or tracking a specific workflow run.")

class WorkflowRunResponse(BaseModel):
    thread_id: str
    status: str
    message: Optional[str] = None
    final_state: Optional[Dict[str, Any]] = None

class ContributionVerificationRequest(BaseModel):
    contribution_id: str = PydanticField(..., description="The database ID of the contribution to verify.")
    onchain_campaign_id: Optional[str] = PydanticField(default_None=True)
    data_url: Optional[str] = PydanticField(default_None=True)

class CampaignVerificationRequest(BaseModel):
    onchain_campaign_id: str = PydanticField(...)
    sample_size: Optional[int] = PydanticField(default=None)


# --- Tools (Copied from previous, ensure 'requests' is installed) ---
import requests # Make sure this import is present

class CampaignDataTool(WFBaseTool): # Assuming WFBaseTool is LangChain's BaseTool
    name: str = "campaign_data_query"
    description: str = (
        "Queries the campaign data platform for information about campaigns or contributions. "
        "Input should be a JSON object with 'query_type' (e.g., 'get_campaign_details_by_onchain_id', 'get_campaign_contributions'), "
        "and 'params' (a dictionary of parameters like 'onchain_campaign_id' or 'contribution_id')."
    )
    fastapi_base_url: Optional[str]

    def __init__(self, fastapi_base_url: Optional[str] = None, **kwargs):
        super().__init__(**kwargs) # Pass kwargs to BaseTool
        self.fastapi_base_url = fastapi_base_url
        if not self.fastapi_base_url:
            logger.warning("FastAPI base_url not provided to CampaignDataTool.")
        if not requests: # Check if requests library is available
            logger.error("'requests' library is not installed. CampaignDataTool will not function.")

    def _run(self, query_type: str, params: Dict[str, Any]) -> str:
        if not requests: return json.dumps({"error": "'requests' library not installed."})
        if not self.fastapi_base_url: return json.dumps({"error": "FastAPI base_url for campaign data not configured."})
        logger.info(f"CampaignDataTool: query_type='{query_type}', params={params}")
        # ... (implementation from previous version) ...
        if query_type == "get_campaign_details_by_onchain_id":
            onchain_id = params.get("onchain_campaign_id")
            if not onchain_id: return json.dumps({"error": "Missing 'onchain_campaign_id'."})
            endpoint = f"{self.fastapi_base_url}/campaigns/{onchain_id}"
        elif query_type == "get_campaign_contributions":
            onchain_id = params.get("onchain_campaign_id")
            if not onchain_id: return json.dumps({"error": "Missing 'onchain_campaign_id'."})
            endpoint = f"{self.fastapi_base_url}/campaigns/get-contributions/{onchain_id}"
        else:
            return json.dumps({"error": f"Unsupported query_type: {query_type}"})
        try:
            response = requests.get(endpoint, timeout=10)
            response.raise_for_status(); return json.dumps(response.json())
        except Exception as e:
            logger.error(f"CampaignDataTool API call to {endpoint} failed: {e}"); return json.dumps({"error": str(e)})
    async def _arun(self, query_type: str, params: Dict[str, Any]) -> str: return self._run(query_type, params)

class UpdateContributionVerificationTool(WFBaseTool):
    name: str = "update_contribution_verification"
    description: str = "Updates AI verification status of a contribution."
    fastapi_base_url: Optional[str]
    def __init__(self, fastapi_base_url: Optional[str] = None, **kwargs):
        super().__init__(**kwargs)
        self.fastapi_base_url = fastapi_base_url
        if not self.fastapi_base_url: logger.warning("FastAPI base_url not provided to UpdateContributionVerificationTool.")
        if not requests: logger.error("'requests' library not installed.")
    def _run(self, contribution_id: str, ai_verification_score: float, is_verified: bool) -> str:
        if not requests: return json.dumps({"error": "'requests' library not installed."})
        if not self.fastapi_base_url: return json.dumps({"error": "FastAPI base_url not configured."})
        endpoint = f"{self.fastapi_base_url}/internal/contributions/{contribution_id}/verify" # Assumed internal endpoint
        payload = {"ai_verification_score": ai_verification_score, "is_verified": is_verified}
        logger.info(f"UpdateContributionVerificationTool: Calling {endpoint} with {payload}")
        # Actual call commented out, implement this endpoint in your campaign API
        logger.warning(f"UpdateContributionVerificationTool: Call to {endpoint} is mocked."); 
        return json.dumps({"status": "success", "message": "Verification update mocked.", "contribution_id": contribution_id})
    async def _arun(self, contribution_id: str, ai_verification_score: float, is_verified: bool) -> str: return self._run(contribution_id, ai_verification_score, is_verified)


# --- FastAPI App and Router ---
app = FastAPI(
    title="Enterprise Multi-Agent Workflow API v2 (DB & Redis)",
    description="API for defining, running, and managing multi-agent workflows with DB persistence and Redis caching.",
    version="2.0.0"
)
multi_agent_router = APIRouter(prefix="/agent-workflows", tags=["Multi-Agent Workflows"])

# --- Helper Functions for DB and Redis ---
async def get_workflow_def_from_cache_or_db(workflow_id_api: str, db: Session, redis: AsyncRedis) -> Optional[WFWorkflowDefinition]:
    cache_key = f"workflow_def:{workflow_id_api}"
    cached_def_str = await redis.get(cache_key)
    if cached_def_str:
        logger.info(f"Cache HIT for workflow definition: {workflow_id_api}")
        return json.loads(cached_def_str) # Assuming it's stored as JSON string

    logger.info(f"Cache MISS for workflow definition: {workflow_id_api}. Fetching from DB.")
    db_workflow = db.query(WorkflowDefinitionDB).filter(WorkflowDefinitionDB.workflow_id_api == workflow_id_api).first()
    if db_workflow:
        workflow_def = db_workflow.definition # This is already a dict/list due to SQLJSON
        await redis.set(cache_key, json.dumps(workflow_def), ex=3600) # Cache for 1 hour
        return workflow_def
    return None

async def cache_workflow_def(workflow_id_api: str, workflow_def: WFWorkflowDefinition, redis: AsyncRedis):
    cache_key = f"workflow_def:{workflow_id_api}"
    await redis.set(cache_key, json.dumps(workflow_def), ex=3600)

async def invalidate_workflow_def_cache(workflow_id_api: str, redis: AsyncRedis):
    cache_key = f"workflow_def:{workflow_id_api}"
    await redis.delete(cache_key)


def get_workflow_manager_instance(workflow_definition: WFWorkflowDefinition) -> EnterpriseWorkflowManager:
    """Instantiates EWM. Tool registry is handled within EWM based on app_config."""
    return EnterpriseWorkflowManager(
        workflow_definition=workflow_definition,
        app_config=WF_CONFIG,
        persistence_db=":memory:" # LangGraph checkpointer, not workflow def storage
    )

# --- API Endpoints ---
@multi_agent_router.post("/define", response_model=WorkflowDefinitionResponse, status_code=201)
async def define_workflow(
    payload: WorkflowDefinitionIn,
    db: Session = Depends(get_db),
    redis: AsyncRedis = Depends(get_redis)
):
    # Generate a unique API-facing ID for the workflow
    # This could also be derived from payload.name if desired, ensuring uniqueness
    workflow_id_api = f"{payload.name.lower().replace(' ', '_')}_{str(uuid.uuid4())[:8]}"
    
    existing_workflow_by_api_id = db.query(WorkflowDefinitionDB).filter(WorkflowDefinitionDB.workflow_id_api == workflow_id_api).first()
    if existing_workflow_by_api_id:
        raise HTTPException(status_code=409, detail=f"Generated workflow_id_api '{workflow_id_api}' already exists. Try a different name or it's a hash collision.")

    # Basic validation of the definition structure (can be more sophisticated)
    if not all(k in payload.definition_payload for k in ["name", "agent_configs", "nodes", "edges", "start_node_id"]):
        raise HTTPException(status_code=400, detail="Invalid workflow definition payload. Missing required fields.")
    if payload.definition_payload["name"] != payload.name:
         logger.warning("Mismatch between payload.name and definition_payload.name. Using payload.name for DB.")
         payload.definition_payload["name"] = payload.name # Ensure consistency

    db_workflow = WorkflowDefinitionDB(
        workflow_id_api=workflow_id_api,
        name=payload.name,
        wallet_address=payload.wallet_address,
        definition=payload.definition_payload # Stored as JSON
    )
    db.add(db_workflow)
    try:
        db.commit()
        db.refresh(db_workflow)
        await cache_workflow_def(workflow_id_api, db_workflow.definition, redis)
        logger.info(f"Defined and cached new workflow: ID='{db_workflow.id}', API_ID='{workflow_id_api}' by wallet '{payload.wallet_address}'")
        
        # Construct response manually to ensure definition_payload is included correctly
        return WorkflowDefinitionResponse(
            workflow_id_api=db_workflow.workflow_id_api,
            name=db_workflow.name,
            wallet_address=db_workflow.wallet_address,
            definition_payload=db_workflow.definition, # This should be the dict
            created_at=db_workflow.created_at,
            updated_at=db_workflow.updated_at
        )
    except Exception as e: # Catch potential DB errors
        db.rollback()
        logger.error(f"Error defining workflow: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Could not save workflow definition: {str(e)}")


@multi_agent_router.get("/{workflow_id_api}", response_model=WorkflowDefinitionResponse)
async def get_workflow_definition(
    workflow_id_api: str,
    db: Session = Depends(get_db),
    redis: AsyncRedis = Depends(get_redis)
):
    workflow_def_payload = await get_workflow_def_from_cache_or_db(workflow_id_api, db, redis)
    if not workflow_def_payload:
        raise HTTPException(status_code=404, detail=f"Workflow with API ID '{workflow_id_api}' not found.")
    
    # We need other DB fields for the full response, so fetch from DB if only payload was from cache
    # OR, cache the full WorkflowDefinitionResponse object (more complex due to datetime)
    # For now, let's ensure we have the DB object for full details.
    db_workflow = db.query(WorkflowDefinitionDB).filter(WorkflowDefinitionDB.workflow_id_api == workflow_id_api).first()
    if not db_workflow: # Should not happen if get_workflow_def_from_cache_or_db found it from DB
         raise HTTPException(status_code=404, detail=f"Workflow with API ID '{workflow_id_api}' not found in DB after cache check.")

    return WorkflowDefinitionResponse.from_orm(db_workflow)


@multi_agent_router.get("/by-wallet/{wallet_address}", response_model=List[WorkflowDefinitionResponse])
async def get_workflows_by_wallet(
    wallet_address: str,
    db: Session = Depends(get_db)
):
    workflows = db.query(WorkflowDefinitionDB).filter(WorkflowDefinitionDB.wallet_address == wallet_address).order_by(WorkflowDefinitionDB.created_at.desc()).all()
    if not workflows:
        logger.info(f"No workflows found for wallet: {wallet_address}")
        return []
    return [WorkflowDefinitionResponse.from_orm(wf) for wf in workflows]

@multi_agent_router.put("/{workflow_id_api}", response_model=WorkflowDefinitionResponse)
async def update_workflow_definition(
    workflow_id_api: str,
    payload: WorkflowDefinitionIn, # Reuses the create schema
    db: Session = Depends(get_db),
    redis: AsyncRedis = Depends(get_redis)
):
    db_workflow = db.query(WorkflowDefinitionDB).filter(WorkflowDefinitionDB.workflow_id_api == workflow_id_api).first()
    if not db_workflow:
        raise HTTPException(status_code=404, detail=f"Workflow with API ID '{workflow_id_api}' not found.")

    # Update fields
    db_workflow.name = payload.name
    db_workflow.wallet_address = payload.wallet_address # Or disallow changing owner
    db_workflow.definition = payload.definition_payload
    # updated_at is handled by onupdate

    try:
        db.commit()
        db.refresh(db_workflow)
        await cache_workflow_def(workflow_id_api, db_workflow.definition, redis) # Re-cache
        logger.info(f"Updated and re-cached workflow: API_ID='{workflow_id_api}'")
        return WorkflowDefinitionResponse.from_orm(db_workflow)
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating workflow {workflow_id_api}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Could not update workflow: {str(e)}")


@multi_agent_router.delete("/{workflow_id_api}", status_code=204)
async def delete_workflow_definition(
    workflow_id_api: str,
    db: Session = Depends(get_db),
    redis: AsyncRedis = Depends(get_redis)
):
    db_workflow = db.query(WorkflowDefinitionDB).filter(WorkflowDefinitionDB.workflow_id_api == workflow_id_api).first()
    if not db_workflow:
        raise HTTPException(status_code=404, detail=f"Workflow with API ID '{workflow_id_api}' not found.")
    
    try:
        db.delete(db_workflow)
        db.commit()
        await invalidate_workflow_def_cache(workflow_id_api, redis)
        logger.info(f"Deleted workflow: API_ID='{workflow_id_api}'")
        return # No content for 204
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting workflow {workflow_id_api}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Could not delete workflow: {str(e)}")


@multi_agent_router.post("/run/{workflow_id_api}", response_model=WorkflowRunResponse)
async def run_workflow_by_id(
    workflow_id_api: str,
    run_request: WorkflowRunDetailRequest,
    background_tasks: BackgroundTasks, # Keep for async potential
    db: Session = Depends(get_db),
    redis: AsyncRedis = Depends(get_redis)
):
    workflow_def_payload = await get_workflow_def_from_cache_or_db(workflow_id_api, db, redis)
    if not workflow_def_payload:
        raise HTTPException(status_code=404, detail=f"Workflow with API ID '{workflow_id_api}' not found.")

    logger.info(f"Running workflow API_ID='{workflow_id_api}', Name='{workflow_def_payload['name']}' with task: {run_request.task_description}")

    try:
        manager = get_workflow_manager_instance(workflow_def_payload)
        initial_input = {
            "task_description": run_request.task_description,
            "initial_scratchpad": run_request.initial_scratchpad
        }
        thread_id = run_request.thread_id or str(uuid.uuid4())

        # For actual background execution:
        # background_tasks.add_task(manager.run_workflow, initial_input, thread_id)
        # return WorkflowRunResponse(thread_id=thread_id, status="PENDING", message="Workflow started in background.")
        
        # Synchronous execution for this example:
        final_state = manager.run_workflow(initial_input, thread_id=thread_id)
        
        return WorkflowRunResponse(
            thread_id=thread_id,
            status="COMPLETED" if "error" not in final_state else "ERROR",
            final_state=final_state,
            message=final_state.get("error")
        )
    except Exception as e:
        logger.error(f"Error running workflow '{workflow_id_api}': {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to run workflow: {str(e)}")


# --- AI Dataset Verification Endpoints (adapted) ---
DATASET_VERIFIER_WORKFLOW_NAME_TEMPLATE = "AIDatasetContributionVerifier_SystemDefault" # Used to find/create the definition

async def get_or_create_dataset_verifier_workflow_def(db: Session, redis: AsyncRedis) -> WFWorkflowDefinition:
    # Check if a system-default verifier workflow exists by a known name or API ID
    # For simplicity, we use a fixed name. In production, this might have a specific flag or tag.
    api_id_candidate = DATASET_VERIFIER_WORKFLOW_NAME_TEMPLATE.lower().replace(" ", "_") # simplified ID generation
    
    existing_def = await get_workflow_def_from_cache_or_db(api_id_candidate, db, redis)
    if existing_def:
        return existing_def

    logger.info(f"Default dataset verifier workflow not found or not cached. Defining '{DATASET_VERIFIER_WORKFLOW_NAME_TEMPLATE}'.")
    verifier_workflow_payload: WFWorkflowDefinition = { # This is the WFWorkflowDefinition TypedDict
        "name": DATASET_VERIFIER_WORKFLOW_NAME_TEMPLATE,
        "agent_configs": [
             {
                "name": "ContributionDataFetcherAgent",
                "system_message_template": (
                    "You are a Data Fetcher Agent ({agent_name}). Your task is to retrieve data for a specific campaign contribution "
                    "using the 'campaign_data_query' tool. Input provides 'contribution_id', 'onchain_campaign_id', 'data_url_input'. "
                    "First, use query_type='get_campaign_contributions' with onchain_campaign_id to find the specific contribution if only onchain_id is known. "
                    "Then, if you have the contribution_id, use query_type='get_contribution_details' with contribution_id to get its data_url. "
                    "If data_url_input is directly provided, use that. "
                    "Once you have the data_url, fetch its content (e.g., using 'web_search' if it's a public URL). "
                    "Pass the 'contribution_id' and the fetched data content to the VerificationAgent."
                ),
                "llm_choice": "google",
                "allowed_tools": [CampaignDataTool.name, "web_search"]
            },
            {
                "name": "DatasetQualityVerifierAgent",
                "system_message_template": (
                    "You are a Dataset Quality Verifier Agent ({agent_name}). You received data content and 'contribution_id'. "
                    "Analyze the data based on quality criteria (clarity, relevance, format). "
                    "Provide 'ai_verification_score' (0.0-1.0) and 'is_verified' (bool). "
                    "Use 'update_contribution_verification' tool to record findings for the 'contribution_id'."
                ),
                "llm_choice": "google",
                "allowed_tools": [UpdateContributionVerificationTool.name]
            }
        ],
        "nodes": [
            {"id": "fetch_contribution_data_step", "agent_config_name": "ContributionDataFetcherAgent"},
            {"id": "verify_quality_step", "agent_config_name": "DatasetQualityVerifierAgent"}
        ],
        "edges": [
            {"source_node_id": "fetch_contribution_data_step", "target_node_id": "tool_executor", "condition": "ON_TOOL_CALL"},
            {"source_node_id": "fetch_contribution_data_step", "target_node_id": "verify_quality_step", "condition": "ON_NO_TOOL_CALL"},
            {"source_node_id": "verify_quality_step", "target_node_id": "tool_executor", "condition": "ON_TOOL_CALL"},
            {"source_node_id": "verify_quality_step", "target_node_id": "END", "condition": "ON_NO_TOOL_CALL"},
        ],
        "start_node_id": "fetch_contribution_data_step"
    }
    # Save this default verifier workflow to DB and cache it
    db_workflow = WorkflowDefinitionDB(
        workflow_id_api=api_id_candidate, # Use the generated candidate ID
        name=DATASET_VERIFIER_WORKFLOW_NAME_TEMPLATE,
        wallet_address="system_default", # Indicates it's a system workflow
        definition=verifier_workflow_payload
    )
    db.add(db_workflow)
    try:
        db.commit(); db.refresh(db_workflow)
        await cache_workflow_def(api_id_candidate, verifier_workflow_payload, redis)
        logger.info(f"Created and cached system default verifier workflow: API_ID='{api_id_candidate}'")
        return verifier_workflow_payload
    except Exception as e: # Could be unique constraint violation if another process created it
        db.rollback()
        logger.warning(f"Failed to save default verifier workflow, might exist: {e}. Attempting to fetch again.")
        # Try fetching again in case of race condition
        refetched_def = await get_workflow_def_from_cache_or_db(api_id_candidate, db, redis)
        if refetched_def: return refetched_def
        raise HTTPException(status_code=500, detail="Could not create or retrieve default verifier workflow.")


@multi_agent_router.post("/verify-contribution", response_model=WorkflowRunResponse)
async def verify_dataset_contribution(
    request: ContributionVerificationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    redis: AsyncRedis = Depends(get_redis)
):
    verifier_workflow_def = await get_or_create_dataset_verifier_workflow_def(db, redis)
    task_description = (
        f"Verify contribution with ID '{request.contribution_id}'. "
        f"Associated onchain_campaign_id is '{request.onchain_campaign_id}', data_url provided is '{request.data_url}'. "
        "Fetch data and verify quality."
    )
    initial_scratchpad = {
        "contribution_id": request.contribution_id,
        "onchain_campaign_id": request.onchain_campaign_id,
        "data_url_input": request.data_url
    }
    logger.info(f"Starting verification for contribution_id='{request.contribution_id}' using workflow '{verifier_workflow_def['name']}'")
    try:
        manager = get_workflow_manager_instance(verifier_workflow_def)
        initial_input = {"task_description": task_description, "initial_scratchpad": initial_scratchpad}
        thread_id = f"verify_contrib_{request.contribution_id}_{str(uuid.uuid4())[:8]}"
        final_state = manager.run_workflow(initial_input, thread_id=thread_id) # Synchronous for now
        return WorkflowRunResponse(
            thread_id=thread_id,
            status="COMPLETED" if "error" not in final_state else "ERROR",
            final_state=final_state,
            message=f"Verification for {request.contribution_id} finished."
        )
    except Exception as e:
        logger.error(f"Error running verification for {request.contribution_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Verification workflow failed: {str(e)}")


@multi_agent_router.post("/verify-campaign-dataset", response_model=Dict[str, Any])
async def verify_campaign_dataset(
    request: CampaignVerificationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db), # For get_or_create_dataset_verifier_workflow_def
    redis: AsyncRedis = Depends(get_redis) # For get_or_create_dataset_verifier_workflow_def
):
    logger.info(f"Verifying dataset for campaign: {request.onchain_campaign_id}, sample: {request.sample_size}")
    if not WF_CONFIG.FASTAPI_BASE_URL or not requests:
        raise HTTPException(status_code=500, detail="Campaign data access not configured.")

    contributions_endpoint = f"{WF_CONFIG.FASTAPI_BASE_URL}/campaigns/get-contributions/{request.onchain_campaign_id}"
    try:
        response = requests.get(contributions_endpoint, timeout=15)
        response.raise_for_status()
        contributions_data = response.json()
        contributions_to_verify = contributions_data.get("contributions", [])
        if not contributions_to_verify:
            return {"message": f"No contributions for campaign {request.onchain_campaign_id}."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not fetch campaign contributions: {str(e)}")

    if request.sample_size and request.sample_size < len(contributions_to_verify):
        contributions_to_verify = contributions_to_verify[:request.sample_size]

    verifier_workflow_def = await get_or_create_dataset_verifier_workflow_def(db, redis)
    manager = get_workflow_manager_instance(verifier_workflow_def)
    num_triggered = 0
    for contrib_item in contributions_to_verify:
        contribution_id = contrib_item.get("contribution_id")
        data_url = contrib_item.get("data_url")
        if not contribution_id: continue
        task_desc = f"Verify contribution ID '{contribution_id}'. Data URL: '{data_url}'."
        init_scratch = {"contribution_id": contribution_id, "onchain_campaign_id": request.onchain_campaign_id, "data_url_input": data_url}
        thread_id = f"verify_campaign_{request.onchain_campaign_id}_contrib_{contribution_id}_{str(uuid.uuid4())[:4]}"
        background_tasks.add_task(manager.run_workflow, {"task_description": task_desc, "initial_scratchpad": init_scratch}, thread_id)
        num_triggered += 1
    return {
        "message": f"Triggered verification for {num_triggered} contributions. Processing in background.",
        "triggered_count": num_triggered,
        "total_found_in_campaign": len(contributions_data.get("contributions", []))
    }

app.include_router(multi_agent_router)

# Lifespan events for Redis client
@app.on_event("startup")
async def startup_event():
    global redis_client
    redis_client = await get_redis_pool()
    logger.info("Redis client initialized.")
    # You can also initialize other resources here

@app.on_event("shutdown")
async def shutdown_event():
    global redis_client
    if redis_client:
        await redis_client.close()
        logger.info("Redis client closed.")

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting Uvicorn server for Multi-Agent API v2 on http://localhost:8001")
    if not WF_CONFIG.FASTAPI_BASE_URL:
        logger.error("CRITICAL: FASTAPI_BASE_URL (for campaign service) is not set. Set this environment variable.")
    if "sqlite" in SQLALCHEMY_DATABASE_URL:
        logger.warning("Using SQLite, ensure connect_args={'check_same_thread': False} is set in create_engine if running threaded/async.")
    uvicorn.run(app, host="0.0.0.0", port=8001)
