<!-- last-verified: 2026-03-26 -->

# data/ — Full Reference

## Manifest

| Field | Value |
|---|---|
| **Library (path)** | `data/` |
| **Purpose** | FunctionGemma fine-tuning pipeline — dataset generation, JSONL training data, and HuggingFace training scripts for on-device voice-to-function routing |
| **Framework / stack** | Python 3, HuggingFace Hub, Unsloth, LoRA, TRL (SFTTrainer), Google Colab |
| **Entry point** | `finetune/generate_dataset.py` (data), `finetune/train_on_hf.py` (training) |
| **External dependencies** | `huggingface_hub`, `unsloth`, `trl`, `datasets`, `peft`, `accelerate`, `bitsandbytes` |
| **File count** | 7 |
| **Architecture style** | Linear pipeline — generate JSONL, upload to HuggingFace, fine-tune with LoRA, export GGUF |

## File Tree

```
data/
└── finetune/
    ├── generate_dataset.py                # Builds 1,448 FunctionGemma examples from 45 functions
    ├── train_on_hf.py                     # Launches LoRA training on HuggingFace A10G Space
    ├── finetune-functiongemma-colab.ipynb  # Interactive Colab notebook (same pipeline)
    ├── su-lab-functiongemma-full.jsonl     # 1,448 examples — complete dataset
    ├── su-lab-functiongemma-train.jsonl    # 1,303 examples — 90% train split
    ├── su-lab-functiongemma-eval.jsonl     # 145 examples — 10% eval split
    └── TRAINING-README.md                 # End-to-end guide: dataset, training, inference
```

## File/Module Index

---

<a id="generate_dataset"></a>

### finetune/generate_dataset.py

**Generates the complete FunctionGemma training dataset from 45 SU Lab function definitions with diverse utterance templates, subset variants, and negative examples.**

- Defines all 45 voice functions (object manipulation, CRUD, canvas, presets, animation, device) with 10+ utterance/arg pairs each
- Builds FunctionGemma-native format with control tokens (`<start_function_declaration>`, `<start_function_call>`, `<escape>`)
- Generates full-set examples (all 45 functions declared), subset variants (5 or 15 functions), and 60 negative examples
- Merges with existing AI-LAB dataset (484 examples from 17 functions) if available on device
- Deduplicates via MD5, shuffles, exports 90/10 train/eval split
- **Connects to:** [su-lab-functiongemma-full.jsonl](#su-lab-functiongemma-full), [su-lab-functiongemma-train.jsonl](#su-lab-functiongemma-train), [su-lab-functiongemma-eval.jsonl](#su-lab-functiongemma-eval), [train_on_hf.py](#train_on_hf)

---

<a id="train_on_hf"></a>

### finetune/train_on_hf.py

**Launches FunctionGemma fine-tuning on a HuggingFace Docker Space with A10G GPU, using Unsloth + LoRA.**

- Creates a Space at `eyalnof123/functiongemma-trainer` with an embedded training script and Dockerfile
- Training config: LoRA r=32, alpha=64, targeting all projection layers, 3 epochs, lr=2e-4, bf16
- Loads dataset from `eyalnof123/su-lab-functiongemma-dataset` on HuggingFace
- Auto-pushes trained model to `eyalnof123/functiongemma-270m-su-lab`
- Exports GGUF Q4_K_M quantization for on-device inference (~242MB)
- **Connects to:** [generate_dataset.py](#generate_dataset) (produces the data it trains on), HuggingFace Hub (remote)

---

<a id="finetune-functiongemma-colab"></a>

### finetune/finetune-functiongemma-colab.ipynb

**Interactive Colab notebook that runs the same Unsloth + LoRA fine-tuning pipeline step-by-step with inline test evaluation.**

- 10 cells: install deps, load model, apply LoRA, load dataset, train, save, push to Hub, export GGUF, quick test
- Includes inference test harness with 6 test cases (5 positive, 1 negative)
- Targets T4 GPU runtime (~15-20 min)
- **Connects to:** [train_on_hf.py](#train_on_hf) (same pipeline, different runtime), HuggingFace Hub (remote)

---

<a id="su-lab-functiongemma-full"></a>

### finetune/su-lab-functiongemma-full.jsonl

**Complete dataset of 1,448 FunctionGemma-format training examples covering 45 SU Lab + 17 AI-LAB functions.**

- Each line is a JSON object with a `text` field containing the full conversation with control tokens
- Includes full-set, subset, and negative examples
- **Connects to:** [generate_dataset.py](#generate_dataset) (produced by), [su-lab-functiongemma-train.jsonl](#su-lab-functiongemma-train), [su-lab-functiongemma-eval.jsonl](#su-lab-functiongemma-eval)

---

<a id="su-lab-functiongemma-train"></a>

### finetune/su-lab-functiongemma-train.jsonl

**Training split — 1,303 examples (90% of full dataset).**

- **Connects to:** [su-lab-functiongemma-full.jsonl](#su-lab-functiongemma-full), [train_on_hf.py](#train_on_hf)

---

<a id="su-lab-functiongemma-eval"></a>

### finetune/su-lab-functiongemma-eval.jsonl

**Evaluation split — 145 examples (10% of full dataset).**

- **Connects to:** [su-lab-functiongemma-full.jsonl](#su-lab-functiongemma-full)

---

<a id="TRAINING-README"></a>

### finetune/TRAINING-README.md

**End-to-end guide covering dataset composition, training hyperparameters, local inference, backend integration, and auto-capture pipeline.**

- Documents dataset breakdown: 454 full-set, 450 subset, 60 negative, 484 merged AI-LAB
- Lists all hyperparameters (LoRA rank, lr, epochs, batch, precision, optimizer)
- Describes local inference via `scripts/functiongemma_inference.py` and HTTP server
- Covers backend integration endpoints in `serve_game.py`
- Documents auto-capture via `src/lib/trainingLogger.ts`
- **Connects to:** [generate_dataset.py](#generate_dataset), [train_on_hf.py](#train_on_hf), `src/lib/trainingLogger.ts`, `src/lib/localAria.ts`

---

## External Dependencies Summary

### HuggingFace Resources

| Resource | Type | Purpose |
|---|---|---|
| `google/functiongemma-270m-it` | Base model | 270M-param Gemma 3 model for function calling |
| `eyalnof123/su-lab-functiongemma-dataset` | Dataset repo | Hosted train/eval JSONL splits |
| `eyalnof123/functiongemma-270m-su-lab` | Model repo | Fine-tuned output + GGUF Q4_K_M |
| `eyalnof123/functiongemma-trainer` | Space (Docker) | A10G training runtime |

### Python Libraries

| Library | Used by | Purpose |
|---|---|---|
| `huggingface_hub` | train_on_hf.py, notebook | Space creation, file upload, model push |
| `unsloth` | train_on_hf.py, notebook | Fast LoRA fine-tuning with gradient checkpointing |
| `trl` | train_on_hf.py, notebook | SFTTrainer for supervised fine-tuning |
| `datasets` | train_on_hf.py, notebook | HuggingFace dataset loading |
| `peft` | train_on_hf.py, notebook | LoRA adapter framework |
| `accelerate` | train_on_hf.py, notebook | Distributed/mixed-precision training |
| `bitsandbytes` | train_on_hf.py, notebook | 8-bit optimizer (adamw_8bit) |
