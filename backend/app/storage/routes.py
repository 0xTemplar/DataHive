from fastapi import APIRouter, UploadFile, File, HTTPException, Query, BackgroundTasks, Depends
from typing import Optional, Union
import tempfile
import mimetypes
import logging
import os # For path manipulation
import shutil # For removing directory tree
from pathlib import Path
from fastapi.responses import FileResponse
import httpx
from sqlalchemy.orm import Session

from app.storage.walrus import WalrusClient
from app.storage.schemas import WalrusStoreResponse
from app.core.database import get_session
from app.campaigns.models import Campaign, Contribution

router = APIRouter(
    prefix="/walrus",
    tags=["Storage"],
)

logger = logging.getLogger(__name__)

CAMPAIGN_TYPE_TO_EXTENSION = {
    
}
DEFAULT_FILE_EXTENSION = ".dat"

def _remove_temp_directory(temp_dir_path: str):
    """Safely removes a directory tree."""
    try:
        shutil.rmtree(temp_dir_path)
        # print(f"DEBUG: Successfully removed temporary directory: {temp_dir_path}") # Optional: for debugging
    except OSError as e: # More specific exception for file system errors
        # print(f"DEBUG: Error removing temporary directory {temp_dir_path}: {e}") # Optional: for debugging
        # Consider logging this error if it occurs
        pass

@router.post("/upload")
async def upload_file_to_walrus(
    file: UploadFile = File(...),
    epochs: Optional[int] = Query(None, description="Number of storage epochs"),
    send_object_to: Optional[str] = Query(None, description="Sui address to transfer the Blob object to"),
    deletable: bool = Query(False, description="Store as a deletable blob"),
) -> WalrusStoreResponse:
    """
    Uploads a file to Walrus storage.
    """
    try:
        walrus_client = WalrusClient()
        contents = await file.read()
        response = await walrus_client.store_blob(
            data=contents,
            epochs=epochs,
            send_object_to=send_object_to,
            deletable=deletable,
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file to Walrus: {e}")



@router.get("/download") # Route changed, no {blob_id} here
async def download_file_from_walrus(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_session),
    onchain_campaign_id: Optional[str] = None,
    onchain_contribution_id: Optional[str] = None, # New query param
) -> FileResponse:
    """
    Downloads a file from Walrus to a temporary server location,
    then streams it to the client. Cleans up the temporary file afterwards.
    """
    print(f"Attempting download for contribution onchain_id: {onchain_contribution_id}, campaign onchain_id: {onchain_campaign_id}")
    temp_dir_path: Optional[str] = None

    if not onchain_campaign_id:
        raise HTTPException(status_code=400, detail="onchain_campaign_id query parameter is required.")
    if not onchain_contribution_id:
        raise HTTPException(status_code=400, detail="onchain_contribution_id query parameter is required.")

    campaign = db.query(Campaign).filter(Campaign.onchain_campaign_id == onchain_campaign_id).first()
    if campaign is None:
        raise HTTPException(status_code=404, detail=f"Campaign not found for onchain_campaign_id: {onchain_campaign_id}")
    
    actual_contribution = db.query(Contribution).filter(
        Contribution.campaign_id == campaign.id,
        Contribution.onchain_contribution_id == onchain_contribution_id,
    ).first()
    
    # Corrected order: Check if actual_contribution is None BEFORE accessing its attributes
    if not actual_contribution:
        raise HTTPException(status_code=404, detail=f"Contribution with onchain_id '{onchain_contribution_id}' not found for campaign '{campaign.title}'.")

    print(f"Found actual contribution. DB file_type: {actual_contribution.file_type}") # Now safe to access
    
    try:
        temp_dir_path = tempfile.mkdtemp(prefix="walrus_dl_")
        print(f"Created temporary directory: {temp_dir_path}")

        if not actual_contribution.data_url:
            raise HTTPException(status_code=404, detail=f"Contribution '{onchain_contribution_id}' does not have a data_url.")
        
        blob_id = actual_contribution.data_url.split("/")[-1]
        if not blob_id:
            raise HTTPException(status_code=400, detail=f"Could not derive a valid blob_id from data_url for contribution '{onchain_contribution_id}'.")
        print(f"Derived Blob ID from data_url: {blob_id}")

        filename_base_from_blob = Path(blob_id).name
        print(f"Filename base from blob: {filename_base_from_blob}")
        
        db_file_type = actual_contribution.file_type
        print(f"Database file_type for actual_contribution (re-confirm): {db_file_type}")
        
        final_derived_extension = ""
        if db_file_type:
            if db_file_type.startswith("."):
                final_derived_extension = db_file_type
            else:
                guessed_ext = mimetypes.guess_extension(db_file_type)
                if guessed_ext:
                    final_derived_extension = guessed_ext
        print(f"Derived final extension: '{final_derived_extension}'")

        base_name_part, _ = os.path.splitext(filename_base_from_blob)
        print(f"Base name part from blob: '{base_name_part}'")

        if not base_name_part and filename_base_from_blob.startswith("."):
            user_download_filename = filename_base_from_blob + final_derived_extension
        elif base_name_part:
            user_download_filename = base_name_part + final_derived_extension
        else: 
            user_download_filename = filename_base_from_blob + final_derived_extension
        print(f"Constructed filename (1st pass): '{user_download_filename}'")

        if not user_download_filename.strip() or user_download_filename == final_derived_extension:
            user_download_filename = f"downloaded_file{final_derived_extension}"
            if not Path(user_download_filename).stem and final_derived_extension:
                 user_download_filename = f"file{final_derived_extension}"
        print(f"User download filename for client (final): '{user_download_filename}'")

        temp_file_on_server = Path(temp_dir_path) / user_download_filename
        print(f"Temporary file on server: {temp_file_on_server}")

        async with WalrusClient() as walrus_client:
            await walrus_client.read_blob(blob_id=blob_id, output_path=temp_file_on_server)
            print(f"Downloaded file to temporary path: {temp_file_on_server}")

        if not temp_file_on_server.is_file() or temp_file_on_server.stat().st_size == 0:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to retrieve or save blob '{blob_id}' to temporary storage."
            )

        # Add cleanup task to BackgroundTasks object
        background_tasks.add_task(_remove_temp_directory, temp_dir_path)
        print(f"Scheduled cleanup for directory: {temp_dir_path}")

        media_type_for_response, _ = mimetypes.guess_type(user_download_filename)
        if not media_type_for_response:
            media_type_for_response = 'application/octet-stream'

        # Remove background_tasks argument from FileResponse constructor
        return FileResponse(
            path=str(temp_file_on_server),
            filename=user_download_filename,
            media_type=media_type_for_response
            # No background_tasks=background_tasks here
        )

    except httpx.HTTPStatusError as e: # Ensure httpx is imported if you use it
        if temp_dir_path:
            _remove_temp_directory(temp_dir_path) 
        if e.response.status_code == 404:
            raise HTTPException(status_code=404, detail=f"Blob with ID '{blob_id}' not found in Walrus storage.")
        else:
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Error from Walrus storage while retrieving blob '{blob_id}': {e.response.text}"
            )
    except httpx.HTTPError as e: # Ensure httpx is imported
        if temp_dir_path:
            _remove_temp_directory(temp_dir_path)
        raise HTTPException(
            status_code=503, 
            detail=f"Network error while attempting to retrieve blob '{blob_id}' from Walrus storage."
        )
    except Exception as e:
        if temp_dir_path:
            # For unhandled exceptions, ensure cleanup is attempted.
            # Calling it directly here means it runs before the 500 response fully leaves,
            # which is generally okay for cleanup on error.
            _remove_temp_directory(temp_dir_path) 
        print(f"Unexpected server error processing blob_id (derived as {blob_id if 'blob_id' in locals() else 'N/A'}): {type(e).__name__} - {e}")
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected server error occurred." # Avoid exposing too much detail from generic errors
        )