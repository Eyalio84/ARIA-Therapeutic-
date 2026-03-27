#!/usr/bin/env python3
"""
Download fine-tuned FunctionGemma GGUF from HuggingFace.
Run after training completes on the HF Space.

Usage:
    python3 scripts/download_functiongemma.py
    python3 scripts/download_functiongemma.py --quantization q8_0
"""
import os
import sys
import argparse

# Model paths
HF_REPO = "eyalnof123/functiongemma-270m-su-lab"
LOCAL_DIR = "/storage/emulated/0/models"
FALLBACK_DIR = os.path.expanduser("~/models")


def download():
    parser = argparse.ArgumentParser(description="Download fine-tuned FunctionGemma")
    parser.add_argument("--quantization", "-q", default="q4_k_m",
                        help="GGUF quantization: q4_k_m (242MB) or q8_0 (480MB)")
    parser.add_argument("--output", "-o", default=None,
                        help="Output directory (default: /storage/emulated/0/models)")
    args = parser.parse_args()

    # Determine output dir
    out_dir = args.output or LOCAL_DIR
    if not os.path.exists(out_dir):
        out_dir = FALLBACK_DIR
    os.makedirs(out_dir, exist_ok=True)

    quant = args.quantization
    gguf_filename = f"functiongemma-su-lab-{quant}.gguf"
    output_path = os.path.join(out_dir, gguf_filename)

    print(f"Downloading from: {HF_REPO}")
    print(f"Quantization: {quant}")
    print(f"Output: {output_path}")

    from huggingface_hub import HfApi, hf_hub_download

    api = HfApi()

    # List available files
    try:
        files = api.list_repo_files(HF_REPO)
        gguf_files = [f for f in files if f.endswith(".gguf")]
        print(f"\nAvailable GGUF files: {gguf_files}")

        if not gguf_files:
            # Try the gguf/ subfolder
            gguf_files = [f for f in files if "gguf" in f.lower()]
            print(f"Files with 'gguf': {gguf_files}")

            if not gguf_files:
                print("\nNo GGUF files found yet. Training may still be in progress.")
                print(f"Check: https://huggingface.co/spaces/eyalnof123/functiongemma-trainer")
                print(f"\nAlternatively, download the LoRA adapter and merge locally.")

                # Download LoRA adapter instead
                print("\nDownloading LoRA adapter files...")
                adapter_dir = os.path.join(out_dir, "functiongemma-su-lab-lora")
                os.makedirs(adapter_dir, exist_ok=True)

                for f in files:
                    if f in (".gitattributes", "README.md"):
                        continue
                    print(f"  Downloading: {f}")
                    hf_hub_download(
                        repo_id=HF_REPO,
                        filename=f,
                        local_dir=adapter_dir,
                    )

                print(f"\nLoRA adapter saved to: {adapter_dir}")
                print("Use merge_and_quantize.py to create GGUF locally.")
                return adapter_dir

        # Download GGUF
        target = None
        for f in gguf_files:
            if quant in f.lower():
                target = f
                break
        if not target:
            target = gguf_files[0]
            print(f"Exact quantization not found, downloading: {target}")

        print(f"\nDownloading: {target}")
        path = hf_hub_download(
            repo_id=HF_REPO,
            filename=target,
            local_dir=out_dir,
        )

        # Rename to our standard name
        final_path = os.path.join(out_dir, gguf_filename)
        if path != final_path:
            os.rename(path, final_path)

        size_mb = os.path.getsize(final_path) / (1024 * 1024)
        print(f"\nDownloaded: {final_path} ({size_mb:.1f} MB)")
        return final_path

    except Exception as e:
        print(f"Error: {e}")
        print(f"\nMake sure training is complete at:")
        print(f"https://huggingface.co/spaces/eyalnof123/functiongemma-trainer")
        sys.exit(1)


if __name__ == "__main__":
    download()
