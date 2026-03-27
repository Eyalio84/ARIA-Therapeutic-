<!-- last-verified: 2026-03-26 -->
> Parent: [../start-here.md](../start-here.md)

# scripts/ — Start Here

> Read this first. Jump to [scripts.md](scripts.md) or [scripts.ctx](scripts.ctx) only for the script you need.

## Scripts

| Script | What it does | scripts.md | scripts.ctx |
|---|---|---|---|
| **download_functiongemma.py** | Downloads fine-tuned FunctionGemma GGUF or LoRA adapter from HuggingFace Hub | [download_functiongemma](scripts.md#download_functiongemma) | dl node |
| **functiongemma_inference.py** | Loads GGUF model via llama-cpp-python and routes voice text to function calls. Supports CLI, REPL, and HTTP server modes | [functiongemma_inference](scripts.md#functiongemma_inference) | gguf node |
| **functiongemma_inference_ct2.py** | CTranslate2 int8 inference variant (~258 MB, ~2-3s on phone CPU). Same three modes as GGUF variant | [functiongemma_inference_ct2](scripts.md#functiongemma_inference_ct2) | ct2 node |
| **functiongemma_inference_hf.py** | HuggingFace Transformers inference variant using merged safetensors directly. Same three modes | [functiongemma_inference_hf](scripts.md#functiongemma_inference_hf) | hf node |
| **test-live.mjs** | Connects to Gemini Live WebSocket API, sends a test message, and verifies connectivity | [test-live](scripts.md#test-live) | live node |
