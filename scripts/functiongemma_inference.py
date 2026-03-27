#!/usr/bin/env python3
"""
FunctionGemma Local Inference Engine

Loads the fine-tuned GGUF model and routes voice text to function calls.
This replaces Gemini Live's function calling with fully local inference.

Usage:
    # Interactive mode
    python3 scripts/functiongemma_inference.py

    # Single query
    python3 scripts/functiongemma_inference.py --query "make it red"

    # As HTTP server (for SU Lab integration)
    python3 scripts/functiongemma_inference.py --serve --port 8077
"""
import os
import re
import json
import argparse
from typing import Optional, Dict, Any, List

# ── Model Path ───────────────────────────────────────────────────

MODEL_PATHS = [
    "/storage/emulated/0/models/functiongemma-su-lab-q4_k_m.gguf",
    os.path.expanduser("~/models/functiongemma-su-lab-q4_k_m.gguf"),
    "/storage/emulated/0/models/functiongemma-su-lab-q8_0.gguf",
    os.path.expanduser("~/models/functiongemma-su-lab-q8_0.gguf"),
]

# ── Function Declarations (same as SU Lab) ───────────────────────

FUNCTIONS = [
    {"name": "set_size", "description": "Set size", "parameters": {"size": "NUMBER"}},
    {"name": "set_color", "description": "Set color", "parameters": {"color": "STRING"}},
    {"name": "set_opacity", "description": "Set opacity 0-1", "parameters": {"opacity": "NUMBER"}},
    {"name": "move_object", "description": "Move direction", "parameters": {"direction": "STRING", "pixels": "NUMBER"}},
    {"name": "set_position", "description": "Set x,y", "parameters": {"x": "NUMBER", "y": "NUMBER"}},
    {"name": "transform_shape", "description": "Set shape", "parameters": {"shape": "STRING"}},
    {"name": "set_width", "description": "Set width", "parameters": {"width": "NUMBER"}},
    {"name": "set_height", "description": "Set height", "parameters": {"height": "NUMBER"}},
    {"name": "select_object", "description": "Select by label", "parameters": {"label": "STRING"}},
    {"name": "rename_object", "description": "Rename", "parameters": {"name": "STRING"}},
    {"name": "add_object", "description": "Create object", "parameters": {"shape": "STRING", "color": "STRING"}},
    {"name": "duplicate_object", "description": "Duplicate", "parameters": {}},
    {"name": "delete_object", "description": "Delete", "parameters": {}},
    {"name": "list_objects", "description": "List all", "parameters": {}},
    {"name": "get_state", "description": "Show states", "parameters": {}},
    {"name": "reset_objects", "description": "Reset all", "parameters": {}},
    {"name": "open_config", "description": "Open config", "parameters": {}},
    {"name": "close_config", "description": "Close config", "parameters": {}},
    {"name": "edit_shape", "description": "Resize handles on", "parameters": {}},
    {"name": "done_editing", "description": "Resize handles off", "parameters": {}},
    {"name": "zoom_canvas", "description": "Zoom 0.5-2", "parameters": {"level": "NUMBER"}},
    {"name": "set_background", "description": "Background color", "parameters": {"color": "STRING"}},
    {"name": "toggle_grid", "description": "Grid on/off", "parameters": {"visible": "BOOLEAN"}},
    {"name": "clear_canvas", "description": "Clear all", "parameters": {}},
    {"name": "snap_to_grid", "description": "Snap on/off", "parameters": {"enabled": "BOOLEAN"}},
    {"name": "save_preset", "description": "Save layout", "parameters": {"name": "STRING"}},
    {"name": "load_preset", "description": "Load layout", "parameters": {"name": "STRING"}},
    {"name": "align_objects", "description": "Align all", "parameters": {"axis": "STRING"}},
    {"name": "set_layer", "description": "Layer order", "parameters": {"position": "STRING"}},
    {"name": "group_objects", "description": "Group by labels", "parameters": {"labels": "STRING"}},
    {"name": "ungroup_objects", "description": "Ungroup", "parameters": {}},
    {"name": "distribute_evenly", "description": "Space evenly", "parameters": {"axis": "STRING"}},
    {"name": "export_layout", "description": "Export json/css/html", "parameters": {"format": "STRING"}},
    {"name": "animate", "description": "Animate spin/bounce/pulse", "parameters": {"type": "STRING", "speed": "NUMBER"}},
    {"name": "stop_animation", "description": "Stop animation", "parameters": {}},
    {"name": "orbit", "description": "Orbit around label", "parameters": {"target": "STRING", "speed": "NUMBER"}},
    {"name": "toggle_torch", "description": "Flashlight", "parameters": {"on": "BOOLEAN"}},
    {"name": "check_battery", "description": "Battery", "parameters": {}},
    {"name": "send_notification", "description": "Notify", "parameters": {"title": "STRING", "text": "STRING"}},
    {"name": "set_volume", "description": "Volume", "parameters": {"level": "NUMBER"}},
    {"name": "clipboard_copy", "description": "Copy clipboard", "parameters": {"text": "STRING"}},
    {"name": "add_image", "description": "Add image container", "parameters": {}},
    {"name": "add_button", "description": "Add interactive button", "parameters": {"button_label": "STRING", "target": "STRING", "action": "STRING"}},
    {"name": "set_image", "description": "Set image source", "parameters": {"source": "STRING"}},
    {"name": "take_photo", "description": "Camera photo", "parameters": {}},
]


class FunctionGemmaEngine:
    """Local FunctionGemma inference engine."""

    def __init__(self, model_path: Optional[str] = None):
        self.model = None
        self.model_path = model_path or self._find_model()
        self._declarations_text = self._build_declarations()

    def _find_model(self) -> str:
        for path in MODEL_PATHS:
            if os.path.exists(path):
                return path
        raise FileNotFoundError(
            f"No FunctionGemma GGUF found. Run download_functiongemma.py first.\n"
            f"Searched: {MODEL_PATHS}"
        )

    def _build_declarations(self) -> str:
        """Build the FunctionGemma declaration block."""
        decls = []
        for f in FUNCTIONS:
            params = f.get("parameters", {})
            if params:
                param_str = ",".join(f"{k}:{{type:{v}}}" for k, v in params.items())
                decl = f"<start_function_declaration>declaration:{f['name']}{{description:<escape>{f['description']}<escape>,parameters:{{{param_str}}}}}<end_function_declaration>"
            else:
                decl = f"<start_function_declaration>declaration:{f['name']}{{description:<escape>{f['description']}<escape>,parameters:{{}}}}<end_function_declaration>"
            decls.append(decl)
        return "\n".join(decls)

    def load(self):
        """Load the GGUF model."""
        from llama_cpp import Llama

        print(f"Loading: {self.model_path}")
        size_mb = os.path.getsize(self.model_path) / (1024 * 1024)
        print(f"Size: {size_mb:.1f} MB")

        self.model = Llama(
            model_path=self.model_path,
            n_ctx=4096,
            n_threads=4,
            verbose=False,
        )
        print("Model loaded!")

    def infer(self, user_text: str) -> Dict[str, Any]:
        """
        Run inference: user text → function call.

        Returns:
            {
                "function_name": "set_color" or None,
                "arguments": {"color": "red"} or {},
                "raw_output": "...",
                "is_function_call": True/False,
                "latency_ms": 45.2
            }
        """
        import time

        if not self.model:
            self.load()

        # Build prompt in FunctionGemma format
        prompt = (
            f"<start_of_turn>developer\n"
            f"You can call the following functions:\n"
            f"{self._declarations_text}\n"
            f"<end_of_turn>\n"
            f"<start_of_turn>user\n"
            f"{user_text}\n"
            f"<end_of_turn>\n"
            f"<start_of_turn>model\n"
        )

        start = time.time()

        output = self.model(
            prompt,
            max_tokens=150,
            temperature=0.1,
            stop=["<end_of_turn>", "<start_of_turn>"],
        )

        latency = (time.time() - start) * 1000
        raw = output["choices"][0]["text"].strip()

        # Parse function call
        result = self._parse_output(raw)
        result["raw_output"] = raw
        result["latency_ms"] = round(latency, 1)

        return result

    def _parse_output(self, raw: str) -> Dict[str, Any]:
        """Parse FunctionGemma output into structured result."""
        # Try to extract function call
        match = re.search(
            r'<start_function_call>(?:call:)?(\w+)\{(.*?)\}<end_function_call>',
            raw, re.DOTALL
        )

        if not match:
            # No function call — model responded with text
            return {
                "function_name": None,
                "arguments": {},
                "is_function_call": False,
                "text_response": raw,
            }

        func_name = match.group(1)
        args_str = match.group(2)

        # Parse arguments
        args = {}
        if args_str.strip():
            # Parse key:value or key:<escape>value<escape> pairs
            for kv in re.finditer(r'(\w+):(?:<escape>(.*?)<escape>|([^,}]+))', args_str):
                key = kv.group(1)
                value = kv.group(2) if kv.group(2) is not None else kv.group(3)

                # Type coercion
                if value is not None:
                    value = value.strip()
                    if value.lower() == "true":
                        value = True
                    elif value.lower() == "false":
                        value = False
                    else:
                        try:
                            if "." in value:
                                value = float(value)
                            else:
                                value = int(value)
                        except (ValueError, TypeError):
                            pass  # Keep as string

                args[key] = value

        return {
            "function_name": func_name,
            "arguments": args,
            "is_function_call": True,
        }

    def unload(self):
        """Free memory."""
        if self.model:
            del self.model
            self.model = None
            import gc
            gc.collect()
            print("Model unloaded")


# ── HTTP Server Mode ─────────────────────────────────────────────

def serve(engine: FunctionGemmaEngine, port: int = 8077):
    """Run as HTTP server for SU Lab integration."""
    from http.server import HTTPServer, BaseHTTPRequestHandler
    import json

    class Handler(BaseHTTPRequestHandler):
        def do_POST(self):
            if self.path == "/infer":
                length = int(self.headers.get("Content-Length", 0))
                body = json.loads(self.rfile.read(length)) if length else {}
                text = body.get("text", "")

                if not text:
                    self._json(400, {"error": "Missing 'text' field"})
                    return

                result = engine.infer(text)
                self._json(200, result)

            elif self.path == "/health":
                self._json(200, {"status": "ok", "model_loaded": engine.model is not None})
            else:
                self._json(404, {"error": "Not found"})

        def do_GET(self):
            if self.path == "/health":
                self._json(200, {"status": "ok", "model_loaded": engine.model is not None})
            else:
                self._json(404, {"error": "Not found"})

        def _json(self, code, data):
            self.send_response(code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(data).encode())

        def log_message(self, fmt, *args):
            # Quiet logging
            pass

    engine.load()
    server = HTTPServer(("0.0.0.0", port), Handler)
    print(f"\nFunctionGemma server running on http://localhost:{port}")
    print(f"POST /infer  — {{\"text\": \"make it red\"}} → function call")
    print(f"GET  /health — check status")
    print(f"\nPress Ctrl+C to stop\n")
    server.serve_forever()


# ── Interactive Mode ─────────────────────────────────────────────

def interactive(engine: FunctionGemmaEngine):
    """Interactive REPL for testing."""
    engine.load()
    print("\nFunctionGemma Interactive Mode")
    print("Type a voice command, or 'quit' to exit\n")

    while True:
        try:
            text = input("You: ").strip()
            if not text or text.lower() in ("quit", "exit", "q"):
                break

            result = engine.infer(text)

            if result["is_function_call"]:
                args_str = json.dumps(result["arguments"]) if result["arguments"] else "{}"
                print(f"  → {result['function_name']}({args_str})  [{result['latency_ms']}ms]")
            else:
                print(f"  → (text) {result.get('text_response', result['raw_output'])}  [{result['latency_ms']}ms]")
            print()

        except (KeyboardInterrupt, EOFError):
            break

    engine.unload()
    print("Bye!")


# ── Main ─────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="FunctionGemma Local Inference")
    parser.add_argument("--model", "-m", default=None, help="Path to GGUF model")
    parser.add_argument("--query", "-q", default=None, help="Single query mode")
    parser.add_argument("--serve", "-s", action="store_true", help="Run as HTTP server")
    parser.add_argument("--port", "-p", type=int, default=8077, help="Server port (default 8077)")
    args = parser.parse_args()

    engine = FunctionGemmaEngine(model_path=args.model)

    if args.query:
        # Single query
        engine.load()
        result = engine.infer(args.query)
        print(json.dumps(result, indent=2))
        engine.unload()
    elif args.serve:
        # HTTP server
        serve(engine, args.port)
    else:
        # Interactive
        interactive(engine)


if __name__ == "__main__":
    main()
