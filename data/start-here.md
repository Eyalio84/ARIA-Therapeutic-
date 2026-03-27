<!-- last-verified: 2026-03-26 -->
> Parent: [../start-here.md](../start-here.md)

# data/ — Start Here

> Read this first. Jump to [data.md](data.md) or [data.ctx](data.ctx) only for the component you need.

| Component | What it is | data.md | data.ctx |
|---|---|---|---|
| **generate_dataset.py** | Builds 1,448 FunctionGemma training examples from 45 SU Lab functions with subset variants and negatives | [generate_dataset](data.md#generate_dataset) | genDataset node |
| **train_on_hf.py** | Launches Unsloth + LoRA fine-tuning on a HuggingFace A10G Docker Space, pushes model + GGUF | [train_on_hf](data.md#train_on_hf) | trainHF node |
| **finetune-functiongemma-colab.ipynb** | Interactive Colab notebook running the same training pipeline step-by-step with inline eval | [finetune-functiongemma-colab](data.md#finetune-functiongemma-colab) | colabNB node |
| **su-lab-functiongemma-full.jsonl** | Complete dataset — 1,448 FunctionGemma-format examples (45 SU Lab + 17 AI-LAB functions) | [su-lab-functiongemma-full](data.md#su-lab-functiongemma-full) | fullJSONL node |
| **su-lab-functiongemma-train.jsonl** | Training split — 1,303 examples (90%) | [su-lab-functiongemma-train](data.md#su-lab-functiongemma-train) | trainJSONL node |
| **su-lab-functiongemma-eval.jsonl** | Evaluation split — 145 examples (10%) | [su-lab-functiongemma-eval](data.md#su-lab-functiongemma-eval) | evalJSONL node |
| **TRAINING-README.md** | End-to-end guide covering dataset composition, hyperparameters, local inference, and auto-capture | [TRAINING-README](data.md#TRAINING-README) | readme node |
