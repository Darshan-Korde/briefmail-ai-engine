from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import torch
from app.services.llm import LlamaSummaryEngine
from app.api.endpoints import router as api_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup Lifecycle: Load model into cache memory once
    engine = LlamaSummaryEngine()
    engine.load_model()
    app.state.ai_engine = engine
    yield
    # Shutdown Lifecycle: Unload pointers from GPU/RAM VRAM space
    print("Flushing cache memory allocations...")
    if hasattr(app.state, "ai_engine"):
        del app.state.ai_engine
    if torch.cuda.is_available():
        torch.cuda.empty_cache()

app = FastAPI(title="Email Summarizer Production Backend", lifespan=lifespan)

# Enable wide CORS parameters to allow remote client decoupling
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")