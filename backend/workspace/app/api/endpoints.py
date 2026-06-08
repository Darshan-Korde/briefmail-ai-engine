import base64
import asyncio
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field, EmailStr
from typing import List, Dict

# Official Google Auth & API Engine Imports
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials

from app.core.config import settings

router = APIRouter()

USER_CREDENTIALS: Dict[str, Credentials] = {}
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

class FetchEmailsRequest(BaseModel):
    email_address: EmailStr

class SummaryRequest(BaseModel):
    email_address: EmailStr
    email_id: str = Field(..., description="The unique Gmail message ID string to summarize")

class SummarizeResponse(BaseModel):
    summary: str
    engine: str = "T5-Small-Email-Summarizer"


@router.get("/auth/login")
async def google_login():
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=SCOPES,
        redirect_uri=settings.GOOGLE_REDIRECT_URI
    )
    flow.autogenerate_code_verifier = False
    auth_url, _ = flow.authorization_url(prompt='consent', access_type='offline')
    return {"auth_url": auth_url}


@router.get("/auth/callback")
async def google_callback(code: str):
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=SCOPES,
        redirect_uri=settings.GOOGLE_REDIRECT_URI
    )
    flow.autogenerate_code_verifier = False
    
    try:
        flow.fetch_token(code=code)
        creds = flow.credentials
        
        service = build('gmail', 'v1', credentials=creds)
        profile = service.users().getProfile(userId='me').execute()
        email_address = profile.get('emailAddress')
        
        USER_CREDENTIALS[email_address] = creds
        return RedirectResponse(url="http://localhost:5173/?login=success")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OAuth code trade failed: {str(e)}")


@router.get("/emails/list", response_model=List[str])
async def list_emails():
    return list(USER_CREDENTIALS.keys())


@router.post("/emails/remove")
async def remove_email(payload: FetchEmailsRequest):
    if payload.email_address in USER_CREDENTIALS:
        del USER_CREDENTIALS[payload.email_address]
        return {"status": "success", "message": f"Dropped OAuth link for {payload.email_address}"}
    raise HTTPException(status_code=404, detail="Email address token map not found.")


@router.post("/emails/fetch-top-10")
async def fetch_top_10(payload: FetchEmailsRequest):
    if payload.email_address not in USER_CREDENTIALS:
        raise HTTPException(status_code=400, detail="Target profile is unauthenticated via OAuth.")
    
    creds = USER_CREDENTIALS[payload.email_address]
    service = build('gmail', 'v1', credentials=creds)
    
    try:
        results = service.users().messages().list(userId='me', maxResults=10).execute()
        messages = results.get('messages', [])
        
        email_list = []
        for msg in messages:
            full_msg = service.users().messages().get(userId='me', id=msg['id'], format='metadata').execute()
            headers = full_msg.get('payload', {}).get('headers', [])
            
            subject = next((h['value'] for h in headers if h['name'].lower() == 'subject'), 'No Subject')
            sender = next((h['value'] for h in headers if h['name'].lower() == 'from'), 'Unknown Sender')
            date = next((h['value'] for h in headers if h['name'].lower() == 'date'), '')
            
            email_list.append({
                "id": msg['id'],
                "subject": subject,
                "from": sender,
                "date": date
            })
            
        return {"status": "success", "emails": email_list}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gmail API fetching failure: {str(e)}")


@router.post("/summarize-fetched", response_model=SummarizeResponse)
async def summarize_fetched_email(request: Request, payload: SummaryRequest):
    engine = getattr(request.app.state, "ai_engine", None)
    if not engine:
        raise HTTPException(status_code=503, detail="AI Inference Engine warming up inside app lifespan.")
        
    if payload.email_address not in USER_CREDENTIALS:
        raise HTTPException(status_code=400, detail="Target mailbox context token unavailable.")
        
    creds = USER_CREDENTIALS[payload.email_address]
    service = build('gmail', 'v1', credentials=creds)
    
    try:
        full_msg = service.users().messages().get(userId='me', id=payload.email_id, format='full').execute()
        email_body = ""
        
        def parse_parts(parts):
            body_text = ""
            for part in parts:
                mime_type = part.get('mimeType')
                body_data = part.get('body', {}).get('data')
                
                if mime_type == 'text/plain' and body_data:
                    body_text += base64.urlsafe_b64decode(body_data).decode('utf-8', errors='ignore')
                elif 'parts' in part:
                    body_text += parse_parts(part['parts'])
            return body_text

        payload_data = full_msg.get('payload', {})
        if 'parts' in payload_data:
            email_body = parse_parts(payload_data['parts'])
        else:
            base64_body = payload_data.get('body', {}).get('data', '')
            if base64_body:
                email_body = base64.urlsafe_b64decode(base64_body).decode('utf-8', errors='ignore')
        
        if not email_body.strip():
            email_body = "Empty content payload parsed from email target layout structures."
            
        summary_output = await engine.generate_summary(email_body)
        return SummarizeResponse(summary=str(summary_output))
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Summary Extraction failed: {str(e)}")