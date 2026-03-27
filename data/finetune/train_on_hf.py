"""
Launch FunctionGemma fine-tuning on HuggingFace Spaces.
Creates a Space with a training script, runs on A10G GPU.
"""
import json
from huggingface_hub import HfApi, create_repo, upload_file

api = HfApi()
SPACE_ID = "eyalnof123/functiongemma-trainer"

# Training script that will run on the Space
TRAIN_SCRIPT = '''#!/usr/bin/env python3
"""FunctionGemma 270M Fine-Tuning with Unsloth + LoRA"""
import os
os.environ["WANDB_DISABLED"] = "true"

print("=== Installing dependencies ===")
import subprocess
subprocess.check_call(["pip", "install", "-q", "unsloth", "trl", "datasets", "peft", "accelerate", "bitsandbytes"])

print("=== Loading model ===")
from unsloth import FastLanguageModel

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="google/functiongemma-270m-it",
    max_seq_length=4096,
    load_in_4bit=False,
)

print("=== Applying LoRA ===")
model = FastLanguageModel.get_peft_model(
    model,
    r=32,
    lora_alpha=64,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    lora_dropout=0,
    bias="none",
    use_gradient_checkpointing="unsloth",
)

print("=== Loading dataset ===")
from datasets import load_dataset

dataset = load_dataset("eyalnof123/su-lab-functiongemma-dataset")
train_dataset = dataset["train"] if "train" in dataset else dataset

# If single split, use train.jsonl
if "train" not in dataset:
    train_dataset = load_dataset("eyalnof123/su-lab-functiongemma-dataset", data_files="train.jsonl", split="train")

print(f"Training examples: {len(train_dataset)}")

print("=== Starting training ===")
from trl import SFTTrainer, SFTConfig

training_args = SFTConfig(
    output_dir="./output",
    num_train_epochs=3,
    per_device_train_batch_size=2,
    gradient_accumulation_steps=4,
    learning_rate=2e-4,
    weight_decay=0.01,
    lr_scheduler_type="linear",
    warmup_steps=5,
    logging_steps=10,
    save_strategy="epoch",
    fp16=True,
    optim="adamw_8bit",
    max_seq_length=4096,
    dataset_text_field="text",
    seed=42,
)

trainer = SFTTrainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    tokenizer=tokenizer,
)

trainer.train()

print("=== Saving model ===")
model.save_pretrained("./output/final")
tokenizer.save_pretrained("./output/final")

print("=== Pushing to Hub ===")
from huggingface_hub import HfApi
api = HfApi()

# Create model repo
try:
    from huggingface_hub import create_repo
    create_repo("eyalnof123/functiongemma-270m-su-lab", private=False)
except:
    pass

api.upload_folder(
    folder_path="./output/final",
    repo_id="eyalnof123/functiongemma-270m-su-lab",
    repo_type="model",
)

print("=== DONE! Model at: https://huggingface.co/eyalnof123/functiongemma-270m-su-lab ===")

# Also export GGUF
print("=== Exporting GGUF ===")
try:
    model.save_pretrained_gguf("./output/gguf", tokenizer, quantization_method="q4_k_m")
    api.upload_folder(
        folder_path="./output/gguf",
        repo_id="eyalnof123/functiongemma-270m-su-lab",
        repo_type="model",
        path_in_repo="gguf",
    )
    print("GGUF uploaded!")
except Exception as e:
    print(f"GGUF export failed (non-critical): {e}")

print("\\n\\n=== ALL DONE ===")
print("Model: https://huggingface.co/eyalnof123/functiongemma-270m-su-lab")
'''

# Dockerfile for the Space
DOCKERFILE = '''FROM nvidia/cuda:12.1.0-devel-ubuntu22.04

RUN apt-get update && apt-get install -y python3 python3-pip git && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY train.py .

# Run training on startup
CMD ["python3", "train.py"]
'''

print("Creating training Space...")

# Create or reuse Space
try:
    create_repo(SPACE_ID, repo_type="space", space_sdk="docker", space_hardware="a10g-small", private=False)
    print(f"Created Space: {SPACE_ID}")
except Exception as e:
    print(f"Space exists or error: {e}")

# Upload training script
upload_file(
    path_or_fileobj=TRAIN_SCRIPT.encode(),
    path_in_repo="train.py",
    repo_id=SPACE_ID,
    repo_type="space",
)
print("Uploaded train.py")

# Upload Dockerfile
upload_file(
    path_or_fileobj=DOCKERFILE.encode(),
    path_in_repo="Dockerfile",
    repo_id=SPACE_ID,
    repo_type="space",
)
print("Uploaded Dockerfile")

print(f"\n=== Training Space launched! ===")
print(f"Monitor at: https://huggingface.co/spaces/{SPACE_ID}")
print(f"Check logs for progress.")
print(f"When done, model will be at: https://huggingface.co/eyalnof123/functiongemma-270m-su-lab")
