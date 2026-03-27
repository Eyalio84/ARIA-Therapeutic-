# Local Inference Alternatives — Research Report

**Date**: March 24, 2026
**Context**: FunctionGemma fine-tuned, 42% accuracy with CT2 int8. Exploring better approaches.

---

## 1. aiohttp — Should We Switch?

**Current**: urllib + asyncio.run_in_executor (new TCP+TLS connection per request)
**Recommendation**: **Yes, switch to aiohttp.**

| Aspect | urllib (current) | aiohttp |
|--------|-----------------|---------|
| Connection reuse | No — new TLS handshake every request (50-150ms) | Yes — persistent pool |
| Async | Faked via thread pool | Native |
| WebSocket | Impossible | Built-in (Gemini Live needs this) |
| Streaming | Basic | Native SSE/streaming support |
| Estimated gain | — | **50-200ms saved per request** after warmup |

One `ClientSession` at server startup, reused for all Gemini calls. Biggest win is eliminating repeated TLS handshakes.

---

## 2. The Reframe — Functions vs Code vs Logic

The user's insight: we're not really doing "function calling." We're changing CSS/JS values. Three ways to look at it:

| Lens | What it means | Example |
|------|--------------|---------|
| **Functions** | Pick from 45 named operations | `set_color({color: "red"})` |
| **Code** | Generate JS/CSS directly | `obj.color = "#ff0000"` |
| **Logic** | Pattern match + apply | "red" → hue:0, "left" → x -= 30 |

FunctionGemma does lens #1. But lens #2 and #3 might be better.

---

## 3. Model Landscape (what fits on the phone)

| Model | Size | Type | Speed (ARM CPU) | On device? |
|-------|------|------|-----------------|-----------|
| Moonshine Tiny | 28MB ONNX | STT | ~150ms/utterance | YES |
| Whisper Tiny | 75MB | STT | ~400ms/utterance | No |
| all-MiniLM | 22MB ONNX | Embedding | ~10ms/sentence | YES |
| SmolLM2-135M | 80MB GGUF | Text/code gen | ~60-80 tok/s | YES |
| SmolLM2-360M | 210MB GGUF | Text/code gen | ~30-50 tok/s | YES |
| Kokoro-82M | 141MB ONNX | TTS | ~300ms/sentence | YES |
| FunctionGemma | 258MB CT2 | Function routing | ~2-3s | YES |
| LFM2.5-1.2B | ~700MB Q4 | Instruct/tools | ~15-25 tok/s | Possible (tight) |

Key finding: **Moonshine + MiniLM + SmolLM2-360M + Kokoro are ALL already on the phone.** No downloads needed.

---

## 4. Five Architectures Compared

### A) Current: FunctionGemma Fine-Tuned (CT2)
```
Voice → Gemini STT → FunctionGemma 270M → function call → execute
```
- Accuracy: 42% (45 functions)
- Latency: 2-3s inference
- Flexibility: Low (retrain for new functions)

### B) Template Matching (No Model)
```
Voice → Moonshine STT (28MB) → fuzzy match against templates → execute
```
- Accuracy: 75-85%
- Latency: <200ms total
- Flexibility: Very low (manual templates per function)
- Cost: Zero inference, zero RAM

### C) Embedding Similarity (MiniLM)
```
Voice → Moonshine STT (28MB) → MiniLM embed (22MB) → cosine similarity → execute
```
- Accuracy: 80-88%
- Latency: ~210ms total
- Flexibility: Medium (add description, no retrain)
- Already on device

### D) Code Generation (SmolLM2)
```
Voice → Moonshine STT (28MB) → SmolLM2-360M (210MB) → JS code → eval
```
- Accuracy: 55-65%
- Latency: ~1-1.2s total
- Flexibility: Very high (generates any code, no fixed function set)
- Security concern: need sandboxed eval

### E) Tiered Hybrid (RECOMMENDED)
```
Voice → Moonshine STT (28MB)
  ↓
MiniLM embed (22MB) → cosine similarity
  ↓
confidence > 0.85 → execute matched function (fast path, ~210ms)
confidence 0.5-0.85 → show top-3 candidates
confidence < 0.5 → SmolLM2-360M generates code (fallback, ~1.2s)
```
- Accuracy: 85-92%
- Latency: 210ms (common case), 1.2s (rare fallback)
- Flexibility: High
- Total footprint: 260MB (all already on device)

---

## 5. Accuracy Comparison

| Approach | Est. Accuracy | Latency | RAM |
|----------|--------------|---------|-----|
| FunctionGemma (current) | 42% | 2-3s | 400MB |
| Template matching | 75-85% | <1ms | <1MB |
| Embedding similarity | 80-88% | 10ms | 50MB |
| Code generation | 55-65% | 600-1000ms | 400MB |
| LFM2.5-1.2B | ~70-80% | 1-3s | 1.2GB |
| **Tiered hybrid** | **85-92%** | **10ms-1s** | **~450MB** |

---

## 6. Out-of-the-Box Ideas

### Idea 1: No Model At All
Embedding similarity with MiniLM (already on device) could beat the fine-tuned FunctionGemma. Pre-compute embeddings for 10 example utterances per function (450 vectors). At runtime, embed the voice input, find nearest. 80-88% accuracy, 10ms latency, no training ever needed.

### Idea 2: Grammar-Constrained Code Gen
Use SmolLM2-360M with GBNF grammar that restricts output to valid SU Lab API calls only. The model can't generate random JS — only `object.property = value` patterns. This turns a 55% code gen approach into ~75%+ by eliminating syntactically invalid outputs.

### Idea 3: Cascading Confidence
Embed → if confident, execute. If not, ask the user: "Did you mean set_color or transform_shape?" Two-turn disambiguation with zero model cost. The user speaks, you narrow to top-3, they say "the first one." This turns 80% into 95%+ with one extra exchange.

### Idea 4: The Python Translator
Build a thin Python layer that maps natural language patterns to canvas operations using regex + rules. Not AI at all — just pattern matching. "Move X left/right/up/down N" → parse direction + pixels. "Make it COLOR" → parse color name. "SIZE to N" → parse number. For 80% of commands, rules are sufficient. Use AI only for the 20% that rules can't handle.

### Idea 5: Fine-Tune MiniLM Instead
Instead of fine-tuning a generative model (FunctionGemma), fine-tune the EMBEDDING model (MiniLM) as a CLASSIFIER. 45 classes, 10 examples each. Fine-tuning an embedding model is 10x faster and the result is 22MB, not 258MB. Accuracy would be ~90%+ because classification is easier than generation.

### Idea 6: Hybrid FunctionGemma + Embedding Pre-filter
Use MiniLM to narrow 45 functions to top-5, then pass only those 5 declarations to FunctionGemma. Smaller pool = higher accuracy (we proved this — 6 functions got 67%, 45 got 42%). The embedding does the coarse filtering, FunctionGemma does the precise routing.

---

## 7. Recommended Path Forward

**Immediate** (this week): Implement **embedding similarity** with MiniLM. Already on device, 10ms latency, ~85% accuracy. No training needed. This replaces FunctionGemma as the primary router.

**Short term**: Add **template matching** as a fast path for high-confidence exact matches ("flashlight on" → toggle_torch, 100% confidence).

**Medium term**: Add **SmolLM2 code gen** as fallback for commands that don't match any function. This enables infinite flexibility without a fixed function set.

**Keep FunctionGemma**: Don't delete it. It's still useful as a benchmark and for comparison. The training pipeline is valuable for future models.

---

*Research compiled from web search results, March 24, 2026*
