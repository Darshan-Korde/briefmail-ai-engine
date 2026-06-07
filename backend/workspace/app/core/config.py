import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Base Application Metadata
    PROJECT_NAME: str = "BriefMail AI Summarizer Engine"
    
    # AI Pipeline Models
    SUMMARY_MODEL_ID: str = "wordcab/t5-small-email-summarizer"
    
    # Google OAuth 2.0 Configuration
    # FIXED: Just declare the type and default value. Pydantic automatically 
    # handles pulling this from both your local `.env` and Render's dashboard!
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    
    # This must match EXACTLY what you registered under 'Authorized Redirect URIs'
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/auth/callback"
    
    class Config:
        # Pydantic will automatically scan this file for values first
        env_file = ".env"
        env_file_encoding = "utf-8"
        # Ignores extra environment fields natively
        extra = "ignore"

settings = Settings()