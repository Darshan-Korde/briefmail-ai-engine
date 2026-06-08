import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
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
    # Shutdown Lifecycle: Unload pointers from GPU/RAM space
    print("Flushing cache memory allocations...")
    if hasattr(app.state, "ai_engine"):
        del app.state.ai_engine
    if torch.cuda.is_available():
        torch.cuda.empty_cache()

# 1. First instantiate the application instance container
app = FastAPI(title="Email Summarizer Production Backend", lifespan=lifespan)

# 2. Attach security CORS layers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Connect endpoint routers
app.include_router(api_router, prefix="/api")

# 4. Safely serve production React client bundles via FastAPI if compiled
DIST_DIR = os.path.join(os.getcwd(), "frontend", "dist")

if os.path.exists(DIST_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(DIST_DIR, "assets")), name="assets")

    @app.get("/{catchall:path}")
    async def serve_frontend(catchall: str):
        if catchall.startswith("api"):
            return None
        return FileResponse(os.path.join(DIST_DIR, "index.html"))