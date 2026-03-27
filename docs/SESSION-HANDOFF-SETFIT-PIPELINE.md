# Session Handoff: SetFit Voice Router Pipeline

**Date**: March 24, 2026
**Status**: RESEARCH COMPLETE — Ready for implementation
**Priority**: High — replaces FunctionGemma (42% accuracy) with ~85-92% accuracy
**Project**: aria-personal (SU Lab voice-to-function routing)

---

## SECTION 1: THE PROBLEM

SU Lab is a voice-controlled canvas/logic editor in `~/aria-personal`. Users speak commands like "make it red" and the system must route to the correct function (e.g., `set_color`) with extracted parameters (`{color: "red"}`).

### Current System (FunctionGemma — FAILING)
- **Model**: FunctionGemma 270M, fine-tuned on 1,448 examples, CTranslate2 int8
- **Size**: 258MB on device
- **Accuracy**: **42%** with all 45 functions declared (67% with only 6)
- **Latency**: 2-3 seconds per query
- **Root cause**: Small generative model can't discriminate 45+ semantically similar functions. "make it spin" → called `transform_shape` instead of `animate`

### What We're Building Instead
**SetFit** — contrastive fine-tuning of MiniLM sentence-transformer as a classifier:
- **Expected accuracy**: 85-92% (SetFit paper shows 94% on 24-class with 8 examples/class)
- **Latency**: <10ms on ARM CPU
- **Size**: ~25MB (MiniLM Q8) + tiny classification head (~KB)
- **Key advantage**: Classification is fundamentally easier than generation for this task

---

## SECTION 2: THE ARCHITECTURE (DECIDED)

```
Voice → Moonshine Tiny CT2 (26MB, ~150ms)
  ↓
SetFit MiniLM Q8 classifier (25MB, <10ms)
  ↓
  ├─ confidence ≥ 0.82 → EXECUTE immediately (fast path, ~200ms total)
  ├─ confidence 0.50-0.82 → Qwen2.5-0.5B Q5_K_M with TOP-3 ONLY (~700ms)
  └─ confidence < 0.50 → ask user to clarify
  ↓
Kokoro TTS ONNX (141MB, already working)
```

### RAM Budget
```
Always loaded:  Moonshine (30MB) + MiniLM+head (30MB) + Kokoro (141MB) = ~200MB
Lazy fallback:  Qwen2.5-0.5B Q5_K_M (~380MB) = loaded on first ambiguous query
Peak:           ~580MB — safe in 4GB usable RAM
```

### The "Less-is-More" Principle (CRITICAL)
When falling back to Qwen2.5-0.5B, pass ONLY the top-3 SetFit candidates' function schemas, NOT all 66 functions. Paper [arXiv:2411.15399] proves small LLMs degrade severely with large tool sets. This is exactly why FunctionGemma scored 67% with 6 functions but 42% with 45.

---

## SECTION 3: EXACT FUNCTION INVENTORY

**Total functions: 66** (was 45 when dataset was generated — NEEDS UPDATE)

### Context-Aware Loading (already implemented in SUShell.tsx)
- **Canvas mode**: SHARED(7) + CANVAS(51) = **58 functions**
- **Logic mode**: SHARED(7) + LOGIC(8) = **15 functions**

### SHARED_FUNCTIONS (7) — available in all contexts
```
select_object, get_state, list_objects, clipboard_copy,
toggle_torch, check_battery, set_volume
```

### CANVAS_FUNCTIONS (51) — object manipulation + creation
```
Object manipulation:  set_size, set_color, set_opacity, move_object, set_position,
                      transform_shape, set_width, set_height, rename_object
CRUD:                 add_object, duplicate_object, delete_object, reset_objects
Config:               open_config, close_config, edit_shape, done_editing
Canvas:               zoom_canvas, set_background, toggle_grid, clear_canvas, snap_to_grid
Presets:              save_preset, load_preset
Project:              save_project, load_project
Text:                 add_text, set_text
Input:                add_input, set_placeholder
Timer:                add_timer, start_timer, stop_timer, reset_timer
Undo:                 undo, redo
Relationships:        align_objects, set_layer, group_objects, ungroup_objects,
                      distribute_evenly, export_layout
Animation:            animate, stop_animation, orbit
Device:               send_notification
Typed creation:       add_image, add_button, set_image, take_photo
Navigation:           open_logic_editor
```

### LOGIC_FUNCTIONS (8) — wiring and blocks
```
add_logic_block, delete_logic_block, connect_wire, disconnect_wire,
configure_logic, add_canvas_object, close_logic_editor, show_logic_state
```

### Function Definitions Location
- **Live source of truth**: `/root/aria-personal/src/components/su/SUShell.tsx` lines 24-115
- **Old dataset generator**: `/root/aria-personal/data/finetune/generate_dataset.py` (45 functions — STALE, needs updating to 66)

---

## SECTION 4: EXISTING TRAINING DATA

### Files
```
/root/aria-personal/data/finetune/
├── generate_dataset.py                    # Generator script (45 functions — NEEDS UPDATE to 66)
├── su-lab-functiongemma-full.jsonl         # 1,448 examples (FunctionGemma format)
├── su-lab-functiongemma-train.jsonl        # 1,303 examples (90% train)
├── su-lab-functiongemma-eval.jsonl         # 145 examples (10% eval)
```

### Current Format (FunctionGemma — NOT reusable for SetFit directly)
```json
{"text": "<start_of_turn>developer\nYou can call...<start_function_declaration>declaration:set_color{...}...\n<start_of_turn>user\nmake it red<end_of_turn>\n<start_of_turn>model\n<start_function_call>call:set_color{color:red}<end_function_call>"}
```

### What SetFit Needs Instead
SetFit needs simple `(text, label)` pairs:
```python
# Extract from existing JSONL:
{"text": "make it red", "label": "set_color"}
{"text": "turn it blue", "label": "set_color"}
{"text": "make it bigger", "label": "set_size"}
```

### Data Gap
- **Have**: 1,448 examples for 45 functions (~32 examples/function)
- **Need**: Examples for 21 NEW functions (the ones added after dataset generation)
- **SetFit minimum**: 8 examples/class is sufficient (paper-validated)
- **Recommendation**: Generate 10-12 utterances per new function, add to dataset

### New Functions Needing Training Data (21)
These exist in SUShell.tsx but NOT in generate_dataset.py:
```
save_project, load_project, add_text, set_text, add_input, set_placeholder,
add_timer, start_timer, stop_timer, reset_timer, undo, redo,
distribute_evenly, export_layout, open_logic_editor,
add_logic_block, delete_logic_block, connect_wire, disconnect_wire,
configure_logic, add_canvas_object, close_logic_editor, show_logic_state
```
(Verify exact delta — some may already be in generator under different names)

---

## SECTION 5: MODELS ON DEVICE

### Embedding Models (for SetFit)
```
/storage/emulated/0/models/
├── all-minilm-l6-v2-q4_k_m.gguf     # 21MB — 384-dim, GGUF format
├── all-minilm-l6-v2-q8_0.gguf       # 25MB — 384-dim, GGUF format ← USE THIS
├── nomic-embed-text-v1.5.Q5_K_M.gguf # 95MB — 768-dim, GGUF format (backup)
```

### STT Models
```
/storage/emulated/0/models/
├── whisper-small-q8_0.gguf           # 253MB — REPLACE with Moonshine
```
Moonshine Tiny ONNX (~26MB) NOT yet on device — needs download.

### FunctionGemma (current, being replaced)
```
/storage/emulated/0/models/
├── functiongemma-270m-su-lab-merged-q8_0.gguf  # MERGED fine-tune
├── functiongemma-su-lab-q4_k_m.gguf            # DELETE (broken — llama.cpp vocab issue)
/storage/emulated/0/models/latests/
├── fg-kg-v1-f16.gguf                           # KG-trained variant
├── fg-kg-v1-q8.gguf                            # KG-trained variant
├── fg-base-hf/                                 # Base HuggingFace weights
├── fg-kg-v1-merged/                            # Merged HuggingFace

/root/aria-personal/models/
├── functiongemma-su-lab/                        # LoRA adapter
├── functiongemma-su-lab-merged/                 # Merged HF weights
├── functiongemma-su-lab-ct2/                    # CTranslate2 int8 (258MB) ← current production
```

### Qwen2.5-0.5B (fallback — NOT yet on device)
Needs download: `Qwen2.5-0.5B-Instruct` GGUF Q5_K_M (~380MB)

### TTS
```
Kokoro-82M ONNX (141MB) — ALREADY WORKING, no changes needed
```

### Runtimes Installed
```
llama-cpp-python 0.3.16    # GGUF inference
onnxruntime 1.24.1         # ONNX inference (CPU)
ctranslate2 4.7.1          # CT2 inference
transformers 4.57.6        # HuggingFace (slow on ARM, ~33s for 270M)
torch 2.6.0                # PyTorch backend
```

---

## SECTION 6: IMPLEMENTATION PLAN (4 PHASES)

### Phase 1: SetFit Classifier (HIGHEST PRIORITY)

**Where to train**: Google Colab (free T4 GPU) — training takes ~5 minutes
**Where to deploy**: On device via onnxruntime

#### Step 1A: Prepare Training Data
```python
# Convert existing FunctionGemma JSONL → SetFit format
# Input: su-lab-functiongemma-full.jsonl (1,448 examples)
# Output: setfit-training-data.jsonl with {"text": "...", "label": "..."}

# Also: generate 10-12 utterances for each of the 21 new functions
# Total target: ~1,700 examples across 66 functions
```

#### Step 1B: Train SetFit on Colab
```python
from setfit import SetFitModel, Trainer, TrainingArguments
from datasets import Dataset

# Load training data
data = Dataset.from_json("setfit-training-data.jsonl")

# Initialize with MiniLM
model = SetFitModel.from_pretrained(
    "sentence-transformers/all-MiniLM-L6-v2",
    labels=list_of_66_function_names
)

# Train
args = TrainingArguments(
    num_epochs=1,
    batch_size=16,
    num_iterations=20  # contrastive pairs per epoch
)
trainer = Trainer(model=model, args=args, train_dataset=data)
trainer.train()

# Evaluate
metrics = trainer.evaluate(eval_data)
print(f"Accuracy: {metrics['accuracy']}")

# Export
model.save_pretrained("setfit-su-lab-v1")
# This saves: model weights + classification head
```

#### Step 1C: Export for On-Device (ONNX)
```python
# Option A: Export sentence-transformer to ONNX
from optimum.onnxruntime import ORTModelForFeatureExtraction
ort_model = ORTModelForFeatureExtraction.from_pretrained("setfit-su-lab-v1", export=True)
ort_model.save_pretrained("setfit-su-lab-onnx")

# Option B: Use the existing MiniLM GGUF on device + export just the classification head
# The head is a sklearn LogisticRegression — save with joblib (~few KB)
import joblib
joblib.dump(model.model_head, "setfit_head.joblib")
```

**DECISION NEEDED**: Option A (full ONNX, ~25MB, self-contained) vs Option B (reuse existing GGUF + tiny head). Option B is trickier because GGUF embeddings may differ slightly from the sentence-transformers embeddings the head was trained on.

**Recommendation**: Use Option A (ONNX export). Clean, self-contained, guaranteed compatible embeddings.

#### Step 1D: On-Device Inference
```python
# inference_router.py — the new voice command router
import onnxruntime as ort
import numpy as np
import joblib  # or load ONNX classification head

class SetFitRouter:
    def __init__(self, model_path="setfit-su-lab-onnx"):
        self.session = ort.InferenceSession(f"{model_path}/model.onnx")
        self.head = joblib.load(f"{model_path}/head.joblib")
        self.label_map = json.load(open(f"{model_path}/labels.json"))

    def route(self, text: str) -> dict:
        # 1. Tokenize + embed
        embedding = self._embed(text)

        # 2. Classify
        probs = self.head.predict_proba([embedding])[0]
        top_idx = np.argmax(probs)
        confidence = probs[top_idx]

        # 3. Confidence gating
        if confidence >= 0.82:
            return {"function": self.label_map[top_idx], "confidence": confidence, "path": "fast"}
        elif confidence >= 0.50:
            top3 = np.argsort(probs)[-3:][::-1]
            return {
                "candidates": [self.label_map[i] for i in top3],
                "confidence": confidence,
                "path": "fallback"
            }
        else:
            return {"function": None, "confidence": confidence, "path": "clarify"}
```

### Phase 2: Moonshine STT Swap

Replace Whisper Small (253MB, slow) with Moonshine Tiny CT2 (26MB, 5x faster).

```bash
# Install
pip install useful-moonshine-onnx@git+https://github.com/moonshine-ai/moonshine.git#subdirectory=moonshine-onnx
```

```python
import moonshine_onnx as moonshine
result = moonshine.transcribe("command.wav", "moonshine/tiny")
# result: ["make it red"]
```

**Note**: ctranslate2 format may be even faster. Check if Moonshine CT2 weights are available.
**Bug**: ONNX export fails for audio >9.27s — irrelevant for 1-3s voice commands.

### Phase 3: Qwen2.5-0.5B Fallback (ONLY if Phase 1 accuracy insufficient)

1. Download `Qwen2.5-0.5B-Instruct` GGUF Q5_K_M (~380MB)
2. Load lazily on first ambiguous query
3. Pass ONLY top-3 SetFit candidates (Less-is-More)
4. Use Hermes tool-call template (native in llama.cpp)
5. Output: `<tool_call>{"name": "set_color", "arguments": {"color": "red"}}</tool_call>`

### Phase 4: Native llama.cpp Optimization (LATER)

Build llama.cpp natively in Termux with OpenBLAS + cmake for 28% speed gain:
```bash
pkg install clang cmake ninja openblas
git clone https://github.com/ggerganov/llama.cpp && cd llama.cpp
cmake -B build -DGGML_BLAS=ON -DGGML_BLAS_VENDOR=OpenBLAS -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release -j$(nproc)
# Pin to big cores:
taskset -c 4,5,6,7 ./llama-cli -t 4 -m model.gguf ...
```

---

## SECTION 7: KEY RESEARCH FINDINGS (FROM PERPLEXITY DEEP DIVE)

### SetFit vs Raw Cosine
- SetFit contrastively fine-tunes MiniLM to bring intra-class embeddings closer
- Then trains a lightweight classification head (LogisticRegression)
- AWS case study: **94% accuracy** on 24-class with paraphrase-MiniLM (+16% over baseline)
- Original paper: competitive with RoBERTa-Large using only 8 examples/class
- **Citation**: [arXiv:2209.11055] "Efficient Few-Shot Learning Without Prompts"

### Qwen2.5-0.5B vs SmolLM2-360M
| | SmolLM2-360M | Qwen2.5-0.5B |
|---|---|---|
| Training tokens | 4T | 18T |
| Native tool-call in llama.cpp | Generic/ChatML only | Yes — Hermes template |
| Expected accuracy (45 functions, fine-tuned) | ~60-70% | ~65-80% |
| GGUF Q5_K_M size | ~280MB | ~380MB |
| **Winner** | | **Qwen2.5-0.5B** |

### Quantization at Sub-500M Scale (CRITICAL)
- **Q4_K_M**: 10-15% accuracy loss at 360-500M params — TOO AGGRESSIVE
- **Q5_K_M**: 5-8% loss — SWEET SPOT for sub-1B models
- **Q8_0**: <2% loss — safe for any size
- **Threshold where Q4_K_M becomes safe**: ~1B parameters
- For MiniLM embeddings: Q4 vs Q8 difference is negligible (~0.5-1%)
- **Use Q5_K_M for Qwen, Q8 for MiniLM**

### Moonshine vs Whisper (for 2-5 word commands)
| | Moonshine Tiny | Whisper Small |
|---|---|---|
| Size | 26MB ONNX | 253MB Q8 GGUF |
| WER | 12.0% | 8.59% |
| Speed (Linux) | 69ms | 3,425ms |
| Speed (RPi5/ARM) | 237ms | 10,397ms |
| **For commands** | **Better** (outperforms Whisper Small for imperative commands) | Slower, larger |

### Python Overhead on ARM
- llama-cpp-python is ~28% slower than native llama.cpp binary
- Keep a persistent Python process (FastAPI + asyncio) — don't spawn per query
- onnxruntime with ARM NEON is faster than transformers.js WASM
- OpenBLAS + cmake + taskset to big cores = 33% faster prompt eval

### Confidence Thresholds
- ≥ 0.82: execute immediately
- 0.50-0.82: pass to LLM fallback with top-3 candidates
- < 0.50: ask user for clarification
- Calibrate on held-out eval set

---

## SECTION 8: CONTEXT-AWARE SETFIT (DESIGN DECISION)

The SU Lab already has context-aware function loading:
- **Canvas mode**: 58 functions (SHARED + CANVAS)
- **Logic mode**: 15 functions (SHARED + LOGIC)

### Option A: Single SetFit model (66 classes)
Train one model on all 66 functions. Simpler, but may confuse canvas vs logic functions.

### Option B: Two SetFit models (recommended)
- `setfit-canvas` trained on 58 functions
- `setfit-logic` trained on 15 functions
- Select model based on current UI context (already tracked in SUShell.tsx state)
- Logic model will be extremely accurate (only 15 classes, very distinct)

### Option C: Single model + context filter
Train on 66 classes but post-filter predictions to only allow functions valid in current context. Simpler training, but wastes model capacity on impossible predictions.

**Recommendation**: Start with Option A (simplest), measure accuracy. If canvas-only accuracy is <85%, switch to Option B.

---

## SECTION 9: INTEGRATION POINTS

### Where SetFit Router Plugs In

**Current flow** (SUShell.tsx → Gemini Live → FunctionGemma CT2):
```
SUShell.tsx line 122-126: getFunctionsForContext() → sends to Gemini Live
Gemini Live → STT → sends to FunctionGemma CT2
FunctionGemma → returns function call → SUShell executes
```

**New flow** (SUShell.tsx → Moonshine → SetFit → execute):
```
SUShell.tsx: mic → Moonshine STT → SetFit Router → execute
                                  ↘ (low confidence) → Qwen2.5-0.5B fallback → execute
```

### Backend Changes Needed
- New endpoint: `POST /api/su/route-command` — accepts text, returns function + params
- Or: run entirely client-side in Node.js via transformers.js (ONNX)
- Or: run in Python backend at `~/aria-personal/backend/serve_game.py`

### Frontend Changes Needed
- Replace Gemini Live function-calling with local STT + HTTP call to SetFit router
- Keep Gemini Live as fallback for complex multi-turn conversation

---

## SECTION 10: FILES TO CREATE

```
~/aria-personal/
├── scripts/
│   ├── setfit_train.py          # Colab training script
│   ├── setfit_export.py         # ONNX export script
│   ├── setfit_inference.py      # On-device inference class
│   └── prepare_setfit_data.py   # Convert FunctionGemma JSONL → SetFit format
├── models/
│   └── setfit-su-lab-v1/        # Exported model (after training)
├── data/finetune/
│   ├── generate_dataset.py      # UPDATE: 45 → 66 functions
│   └── setfit-training-data.jsonl  # New format training data
```

---

## SECTION 11: OPEN QUESTIONS (DECIDE DURING IMPLEMENTATION)

1. **ONNX vs GGUF for MiniLM**: SetFit exports ONNX naturally. The GGUF MiniLM on device is for llama-cpp embeddings. Use ONNX (self-contained with trained head).

2. **Parameter extraction**: SetFit classifies the function name. Parameters still need extraction. Options:
   - Regex/rules for simple params ("make it red" → color="red")
   - Qwen fallback for complex params
   - Both (rules first, Qwen if rules fail)

3. **Where to run inference**: Python backend (serve_game.py) vs Node.js (transformers.js). Python has onnxruntime with ARM NEON optimization — likely faster.

4. **Two models vs one**: Single 66-class model vs separate canvas/logic models. Start with one.

5. **Moonshine availability**: Verify Moonshine Tiny ONNX or CT2 can be downloaded in Termux/PRoot.

---

## SECTION 12: SUCCESS CRITERIA

- [ ] SetFit accuracy ≥ 85% on held-out eval set (66 functions)
- [ ] End-to-end latency < 500ms (STT + routing + param extraction)
- [ ] RAM usage < 300MB (without Qwen fallback loaded)
- [ ] Works offline (zero network calls)
- [ ] Handles all 66 functions (not just the original 45)
- [ ] Context-aware: canvas vs logic function filtering
- [ ] Fallback path works for ambiguous commands

---

## SECTION 13: REFERENCE PAPERS & LINKS

- **SetFit paper**: [arXiv:2209.11055](https://arxiv.org/abs/2209.11055) — Few-shot without prompts
- **Less-is-More**: [arXiv:2411.15399](https://arxiv.org/abs/2411.15399) — Tool selection for edge LLMs
- **In-Vehicle SLM**: [arXiv:2501.02342](https://arxiv.org/abs/2501.02342) — Phi-3 pruned, 88% function calling
- **Moonshine**: [arXiv:2410.15608](https://arxiv.org/abs/2410.15608) — 5x faster than Whisper
- **Qwen2.5 tech report**: [arXiv:2412.15115](https://arxiv.org/pdf/2412.15115.pdf)
- **SetFit HuggingFace blog**: https://huggingface.co/blog/setfit
- **SetFit GitHub**: https://github.com/cohere-ai/setfit_hf
- **Moonshine Python SDK**: http://dev.moonshine.ai/py/
- **llama.cpp Qwen function calling**: https://github.com/ggml-org/llama.cpp/blob/master/docs/function-calling.md

---

## SECTION 14: QUICK START FOR NEXT SESSION

```
1. Read this file
2. Read SUShell.tsx lines 24-127 for live function definitions
3. Read generate_dataset.py for existing utterance templates
4. Update generate_dataset.py: add 21 new functions with 10-12 utterances each
5. Run prepare_setfit_data.py to convert JSONL → SetFit format
6. Upload to Colab, train SetFit (~5 min)
7. Export ONNX, download to device
8. Build inference_router.py
9. Wire into backend serve_game.py
10. Test accuracy on eval set
```

---

*Session handoff generated March 24, 2026*
*Source research: LOCAL-INFERENCE-ALTERNATIVES-REPORT.md + Perplexity deep dive (40+ citations)*
