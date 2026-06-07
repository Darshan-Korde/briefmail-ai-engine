from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import torch
from app.services.llm import LlamaSummaryEngine
from app.api.endpoints import router as api_router

DIST_DIR = os.path.join(os.getcwd(), "frontend", "dist")

if os.path.exists(DIST_DIR):
    # Mount the /assets subfolder for React JS/CSS chunks
    app.mount("/assets", StaticFiles(directory=os.path.join(DIST_DIR, "assets")), name="assets")

    # Catch-all fallback route to serve index.html for UI views
    @app.get("/{catchall:path}")
    async def serve_frontend(catchall: str):
        if catchall.startswith("api"):
            return None
        return FileResponse(os.path.join(DIST_DIR, "index.html"))

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