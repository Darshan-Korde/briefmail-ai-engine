import asyncio
from transformers import pipeline
from app.core.config import settings

class LlamaSummaryEngine:  # Kept the name same so main.py doesn't break
    def __init__(self):
        self.pipe = None

    def load_model(self):
        print(f"🤖 Initializing Lightweight T5 Summarization Pipeline: {settings.SUMMARY_MODEL_ID}...")
        self.pipe = pipeline("summarization", model=settings.SUMMARY_MODEL_ID)
        print("✅ T5 Email Summarizer Pipeline Successfully Loaded!")

    def _sync_inference(self, email_body: str) -> str:
        # Pass the raw email to the pipeline wrapper safely truncated to fit 512 context bounds
        result = self.pipe(
            email_body, 
            max_length=150, 
            min_length=50, 
            do_sample=False,
            truncation=True,
        )
        return result[0]['summary_text']

    async def generate_summary(self, email_body: str) -> str:
        # Offload synchronous pipeline processing to avoid blocking FastAPI
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self._sync_inference, email_body)