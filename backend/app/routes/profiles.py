from fastapi import APIRouter, HTTPException, Depends
from typing import Optional

from app import models
from app.database import get_profile_data, update_profile_data
from app.embeddings import add_profile_to_vector_db

router = APIRouter()

@router.get("/", response_model=models.ProfileData)
async def get_profile():
    """
    Get the profile data
    """
    try:
        profile_data = get_profile_data()
        if not profile_data:
            # Return a default profile if none exists
            return models.ProfileData(
                bio="No bio available yet.",
                skills="No skills listed yet.",
                experience="No experience listed yet.",
                projects="No projects listed yet.",
                interests="No interests listed yet."
            )
        return models.ProfileData(**profile_data)
    
    except Exception as e:
        print(f"Error getting profile data: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get profile data: {str(e)}"
        )

@router.put("/", response_model=models.ProfileData)
async def update_profile(profile_data: models.ProfileData):
    """
    Update the profile data
    """
    try:
        # Convert to dict for database
        data_dict = profile_data.dict()
        
        # Update in database
        updated_data = update_profile_data(data_dict)
        if not updated_data:
            raise HTTPException(
                status_code=500,
                detail="Failed to update profile data in database"
            )
        
        # Add to vector database for search
        vector_update_success = add_profile_to_vector_db(data_dict)
        if not vector_update_success:
            print("Warning: Failed to update vector database")
        
        return models.ProfileData(**updated_data[0] if updated_data else data_dict)
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating profile data: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update profile data: {str(e)}"
        ) 