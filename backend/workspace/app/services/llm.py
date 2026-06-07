import asyncio
from transformers import pipeline
from app.core.config import settings

class LlamaSummaryEngine:  # Kept the name same so main.py doesn't break
    def __init__(self):
        self.pipe = None

    def load_model(self):
        print(f"🤖 Initializing Lightweight T5 Summarization Pipeline: {settings.SUMMARY_MODEL_ID}...")
        # pipeline loads model and tokenizer under the hood instantly
        self.pipe = pipeline("summarization", model=settings.SUMMARY_MODEL_ID)
        print("✅ T5 Email Summarizer Pipeline Successfully Loaded!")

    def _sync_inference(self, email_body: str) -> str:
        # Pass the raw email directly to the pipeline wrapper
        # adjusting max/min lengths for typical email summary outputs
        result = self.pipe(
            email_body, 
            max_length=150000000, 
            min_length=50, 
            do_sample=False
        )
        # Extract the text string from Hugging Face's return list format
        return result[0]['summary_text']

    async def generate_summary(self, email_body: str) -> str:
        # Offload synchronous pipeline processing to avoid blocking FastAPI
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self._sync_inference, email_body)