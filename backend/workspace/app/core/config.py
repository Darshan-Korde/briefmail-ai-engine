import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Base Application Metadata
    PROJECT_NAME: str = "BriefMail AI Summarizer Engine"
    
    # AI Pipeline Models
    SUMMARY_MODEL_ID: str = "wordcab/t5-small-email-summarizer"
    
    # Google OAuth 2.0 Configuration
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    
    # This must match EXACTLY what you registered under 'Authorized Redirect URIs'
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/auth/callback"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()