# Script executed during Docker build time to bake weights into image layer
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel
from app.core.config import settings

print("📥 Caching weights into container image layers...")
tokenizer = AutoTokenizer.from_pretrained(settings.BASE_MODEL_ID)
base_model = AutoModelForCausalLM.from_pretrained(settings.BASE_MODEL_ID)
PeftModel.from_pretrained(base_model, settings.ADAPTER_MODEL_ID)
print("📦 Weights cached perfectly!")