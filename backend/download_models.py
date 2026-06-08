# Script executed during Docker build time to bake weights into image layer
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
from app.core.config import settings

print("📥 Caching pipeline weights into container image layers...")
# Pre-download and store the T5 model configuration inside local environment paths
tokenizer = AutoTokenizer.from_pretrained(settings.SUMMARY_MODEL_ID)
model = AutoModelForSeq2SeqLM.from_pretrained(settings.SUMMARY_MODEL_ID)
print("📦 Weights cached perfectly!")