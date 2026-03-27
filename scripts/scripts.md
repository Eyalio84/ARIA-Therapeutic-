<!-- last-verified: 2026-03-26 -->

# scripts/ — Full Reference

## Manifest

| Field | Value |
|---|---|
| **Library (path)** | `scripts/` |
| **Purpose** | Download and run FunctionGemma inference locally — three runtime backends (GGUF via llama-cpp, CTranslate2 int8, HuggingFace Transformers) plus a Gemini Live connectivity test |
| **Framework / stack** | Python 3 (argparse, http.server), Node.js ESM, llama-cpp-python, CTranslate2, HuggingFace Transformers, Google GenAI SDK |
| **Entry point** | Each script is standalone (`if __name__ == "__main__"`) |
| **External dependencies** | `huggingface_hub`, `llama-cpp-python`, `ctranslate2`, `transformers`, `torch`, `@google/genai` |
| **File count** | 5 |
| **Architecture style** | Standalone CLI scripts — download then infer pipeline, three parallel inference backends |

## File Tree

```
scripts/
├── download_functiongemma.py          # Download GGUF or LoRA from HuggingFace
├── functiongemma_inference.py         # Inference via llama-cpp-python (GGUF)
├── functiongemma_inference_ct2.py     # Inference via CTranslate2 (int8)
├── functiongemma_inference_hf.py      # Inference via HuggingFace Transformers
└── test-live.mjs                      # Gemini Live WebSocket connectivity test
```

---

<a id="download_functiongemma"></a>

### download_functiongemma.py

**Downloads the fine-tuned FunctionGemma model (GGUF or LoRA adapter) from HuggingFace Hub.**

- `download()` — main routine, resolves output dir, lists repo files, downloads matching GGUF or falls back to LoRA adapter
- `--quantization` / `-q` — GGUF variant: `q4_k_m` (242 MB, default) or `q8_0` (480 MB)
- `--output` / `-o` — override output directory (default: `/storage/emulated/0/models`, fallback: `~/models`)
- HF repo: `eyalnof123/functiongemma-270m-su-lab`
- **Connects to:** HuggingFace Hub API (`huggingface_hub.HfApi`, `hf_hub_download`). Produces GGUF files consumed by [functiongemma_inference.py](#functiongemma_inference)

---

<a id="functiongemma_inference"></a>

### functiongemma_inference.py

**Loads a GGUF model via llama-cpp-python and converts natural-language voice commands into structured function calls across 45 declared functions.**

- `FunctionGemmaEngine` — main class
  - `load()` — finds and loads GGUF model (`Llama`, n_ctx=4096, n_threads=4)
  - `infer(user_text)` — builds FunctionGemma prompt, runs generation, parses `<start_function_call>` output
  - `_parse_output(raw)` — regex extraction of function name and typed arguments
  - `unload()` — frees memory
- `serve(engine, port)` — HTTP server with `POST /infer` and `GET /health` endpoints (CORS enabled)
- `interactive(engine)` — REPL mode for testing
- `--model` / `-m` — override GGUF path
- `--query` / `-q` — single-shot inference
- `--serve` / `-s` + `--port` / `-p` (default 8077) — HTTP server mode
- **Connects to:** `llama-cpp-python` (`Llama`). Consumes GGUF files produced by [download_functiongemma.py](#download_functiongemma). Serves JSON to SU Lab frontend

---

<a id="functiongemma_inference_ct2"></a>

### functiongemma_inference_ct2.py

**CTranslate2 int8 inference variant — ~258 MB model, ~2-3s inference on phone CPU.**

- `FunctionGemmaCT2` — main class
  - `load()` — loads CT2 `Generator` (device=cpu, compute_type=int8) + HF `AutoTokenizer`
  - `infer(text)` — streaming token generation via `generate_tokens`, regex function-call parsing
  - `unload()` — frees generator
- Same CLI modes as the GGUF variant: `--query`, `--serve`, interactive REPL
- Model path: `~/aria-personal/models/functiongemma-su-lab-ct2`
- Tokenizer path: `~/aria-personal/models/functiongemma-su-lab-merged`
- **Connects to:** `ctranslate2.Generator`, `transformers.AutoTokenizer`. Serves same JSON schema as [functiongemma_inference.py](#functiongemma_inference)

---

<a id="functiongemma_inference_hf"></a>

### functiongemma_inference_hf.py

**HuggingFace Transformers inference variant — uses merged safetensors directly, no GGUF conversion needed.**

- `FunctionGemmaHF` — main class
  - `load()` — `AutoModelForCausalLM.from_pretrained` (float16, cpu) + `AutoTokenizer`
  - `infer(text)` — `model.generate` with temperature=0.1, same function-call parsing
  - `unload()` — frees model
- Same CLI modes: `--query`, `--serve`, interactive REPL
- Model path: `~/aria-personal/models/functiongemma-su-lab-merged`
- **Connects to:** `transformers.AutoModelForCausalLM`, `torch`. Serves same JSON schema as [functiongemma_inference.py](#functiongemma_inference)

---

<a id="test-live"></a>

### test-live.mjs

**Connects to the Gemini Live WebSocket API and sends a test text message to verify connectivity.**

- Reads `GEMINI_API_KEY` from `/root/aria-personal/.env.local`
- Model: `gemini-2.5-flash-native-audio-preview-12-2025`
- Opens a live session with audio response modality + transcription
- Sends one text turn, waits up to 15s for a response, then closes
- **Connects to:** `@google/genai` SDK (Gemini Live WebSocket). Reads `.env.local`

---

## External Dependencies Summary

| Library | Used by | Purpose |
|---|---|---|
| `huggingface_hub` | download_functiongemma.py | Download models from HF Hub |
| `llama-cpp-python` | functiongemma_inference.py | GGUF model loading and inference |
| `ctranslate2` | functiongemma_inference_ct2.py | Int8 quantized inference engine |
| `transformers` | functiongemma_inference_ct2.py, functiongemma_inference_hf.py | Tokenizer and model loading |
| `torch` | functiongemma_inference_hf.py | Tensor operations for HF inference |
| `@google/genai` | test-live.mjs | Gemini Live WebSocket SDK |
