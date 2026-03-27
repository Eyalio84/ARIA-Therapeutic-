# FunctionGemma Fine-Tuning Guide

**Model**: google/functiongemma-270m-it (270M params, Gemma 3 architecture)
**Goal**: Replace Gemini Live function calling with local on-device inference
**Dataset**: 1,448 examples (45 SU Lab functions + 17 AI-LAB functions)

---

## Dataset

### Generation
```bash
python3 data/finetune/generate_dataset.py
```

Produces:
- `su-lab-functiongemma-train.jsonl` — 1,303 training examples
- `su-lab-functiongemma-eval.jsonl` — 145 eval examples
- `su-lab-functiongemma-full.jsonl` — 1,448 total

### Composition
| Source | Count |
|--------|-------|
| Full-set examples (all 45 functions declared) | 454 |
| Subset variants (5 or 15 functions) | 450 |
| Negative examples (no function call) | 60 |
| Merged from AI-LAB dataset (17 functions) | 484 |

### Format
FunctionGemma native format with control tokens:
```
<start_of_turn>developer
You can call the following functions:
<start_function_declaration>declaration:set_color{...}<end_function_declaration>
<end_of_turn>
<start_of_turn>user
make it red
<end_of_turn>
<start_of_turn>model
<start_function_call>call:set_color{color:<escape>red<escape>}<end_function_call>
<end_of_turn>
```

---

## Training

### HuggingFace AutoTrain (recommended)
```bash
python3 data/finetune/train_on_hf.py
```

Creates a Docker Space on A10G GPU with:
- Unsloth + LoRA (r=32, alpha=64)
- bf16 precision
- 3 epochs, lr=2e-4, batch_size=2, grad_accum=4
- Auto-pushes to `eyalnof123/functiongemma-270m-su-lab`
- Exports GGUF Q4_K_M

### Hyperparameters
| Param | Value |
|-------|-------|
| LoRA rank | 32 |
| LoRA alpha | 64 |
| Target modules | q,k,v,o,gate,up,down_proj |
| Learning rate | 2e-4 |
| Epochs | 3 |
| Batch size | 2 (effective 8 with grad_accum=4) |
| Max seq length | 4096 |
| Precision | bf16 |
| Optimizer | adamw_8bit |

---

## Local Inference

### Download
```bash
python3 scripts/download_functiongemma.py
# Downloads to /storage/emulated/0/models/functiongemma-su-lab-q4_k_m.gguf
```

### Interactive Test
```bash
python3 scripts/functiongemma_inference.py
# You: make it red
# → set_color({"color": "red"})  [45ms]
```

### HTTP Server
```bash
python3 scripts/functiongemma_inference.py --serve --port 8077
# POST /infer {"text": "make it spin"} → {"function_name": "animate", ...}
```

### Backend Integration
Already wired into `serve_game.py`:
- `POST /api/functiongemma/infer` — lazy-loads, runs in thread pool
- `GET /api/functiongemma/status` — check if loaded
- `POST /api/functiongemma/unload` — free RAM

---

## Auto-Capture (SU Lab)

Every voice→function pair is auto-captured by `src/lib/trainingLogger.ts`:
1. User speaks to Aria
2. Gemini calls a function
3. Logger captures (utterance, function_name, args) to localStorage
4. Export JSONL button in debug drawer
5. Re-run `generate_dataset.py` to merge captures with synthetic data

---

## Target Stack
```
FunctionGemma 270M (242MB Q4) — voice text → function routing
+ Kokoro 82M (141MB ONNX)    — text → speech
+ Small reasoning model       — conversational responses
= Fully local Aria (~400MB total, runs on phone)
```
