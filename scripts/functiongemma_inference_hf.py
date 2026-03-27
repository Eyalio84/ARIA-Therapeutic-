#!/usr/bin/env python3
"""
FunctionGemma Local Inference — HuggingFace Transformers version.
Uses the merged safetensors model directly (no GGUF conversion needed).

Usage:
    python3 scripts/functiongemma_inference_hf.py
    python3 scripts/functiongemma_inference_hf.py --query "make it red"
    python3 scripts/functiongemma_inference_hf.py --serve --port 8077
"""
import os, re, json, argparse, time
from typing import Optional, Dict, Any

MODEL_PATH = os.path.expanduser("~/aria-personal/models/functiongemma-su-lab-merged")

# Compact function declarations
DECLS = """<start_function_declaration>declaration:set_size{description:<escape>Set size<escape>,parameters:{size:{type:NUMBER}}}<end_function_declaration>
<start_function_declaration>declaration:set_color{description:<escape>Set color<escape>,parameters:{color:{type:STRING}}}<end_function_declaration>
<start_function_declaration>declaration:set_opacity{description:<escape>Set opacity<escape>,parameters:{opacity:{type:NUMBER}}}<end_function_declaration>
<start_function_declaration>declaration:move_object{description:<escape>Move direction<escape>,parameters:{direction:{type:STRING},pixels:{type:NUMBER}}}<end_function_declaration>
<start_function_declaration>declaration:set_position{description:<escape>Set x,y<escape>,parameters:{x:{type:NUMBER},y:{type:NUMBER}}}<end_function_declaration>
<start_function_declaration>declaration:transform_shape{description:<escape>Set shape<escape>,parameters:{shape:{type:STRING}}}<end_function_declaration>
<start_function_declaration>declaration:set_width{description:<escape>Set width<escape>,parameters:{width:{type:NUMBER}}}<end_function_declaration>
<start_function_declaration>declaration:set_height{description:<escape>Set height<escape>,parameters:{height:{type:NUMBER}}}<end_function_declaration>
<start_function_declaration>declaration:select_object{description:<escape>Select by label<escape>,parameters:{label:{type:STRING}}}<end_function_declaration>
<start_function_declaration>declaration:rename_object{description:<escape>Rename<escape>,parameters:{name:{type:STRING}}}<end_function_declaration>
<start_function_declaration>declaration:add_object{description:<escape>Create object<escape>,parameters:{shape:{type:STRING},color:{type:STRING}}}<end_function_declaration>
<start_function_declaration>declaration:duplicate_object{description:<escape>Duplicate<escape>,parameters:{}}<end_function_declaration>
<start_function_declaration>declaration:delete_object{description:<escape>Delete<escape>,parameters:{}}<end_function_declaration>
<start_function_declaration>declaration:list_objects{description:<escape>List all<escape>,parameters:{}}<end_function_declaration>
<start_function_declaration>declaration:get_state{description:<escape>Show states<escape>,parameters:{}}<end_function_declaration>
<start_function_declaration>declaration:reset_objects{description:<escape>Reset all<escape>,parameters:{}}<end_function_declaration>
<start_function_declaration>declaration:zoom_canvas{description:<escape>Zoom<escape>,parameters:{level:{type:NUMBER}}}<end_function_declaration>
<start_function_declaration>declaration:set_background{description:<escape>Background color<escape>,parameters:{color:{type:STRING}}}<end_function_declaration>
<start_function_declaration>declaration:toggle_grid{description:<escape>Grid on/off<escape>,parameters:{visible:{type:BOOLEAN}}}<end_function_declaration>
<start_function_declaration>declaration:clear_canvas{description:<escape>Clear all<escape>,parameters:{}}<end_function_declaration>
<start_function_declaration>declaration:snap_to_grid{description:<escape>Snap on/off<escape>,parameters:{enabled:{type:BOOLEAN}}}<end_function_declaration>
<start_function_declaration>declaration:save_preset{description:<escape>Save layout<escape>,parameters:{name:{type:STRING}}}<end_function_declaration>
<start_function_declaration>declaration:load_preset{description:<escape>Load layout<escape>,parameters:{name:{type:STRING}}}<end_function_declaration>
<start_function_declaration>declaration:align_objects{description:<escape>Align all<escape>,parameters:{axis:{type:STRING}}}<end_function_declaration>
<start_function_declaration>declaration:set_layer{description:<escape>Layer order<escape>,parameters:{position:{type:STRING}}}<end_function_declaration>
<start_function_declaration>declaration:group_objects{description:<escape>Group by labels<escape>,parameters:{labels:{type:STRING}}}<end_function_declaration>
<start_function_declaration>declaration:distribute_evenly{description:<escape>Space evenly<escape>,parameters:{axis:{type:STRING}}}<end_function_declaration>
<start_function_declaration>declaration:export_layout{description:<escape>Export<escape>,parameters:{format:{type:STRING}}}<end_function_declaration>
<start_function_declaration>declaration:animate{description:<escape>Animate<escape>,parameters:{type:{type:STRING},speed:{type:NUMBER}}}<end_function_declaration>
<start_function_declaration>declaration:stop_animation{description:<escape>Stop animation<escape>,parameters:{}}<end_function_declaration>
<start_function_declaration>declaration:orbit{description:<escape>Orbit around<escape>,parameters:{target:{type:STRING},speed:{type:NUMBER}}}<end_function_declaration>
<start_function_declaration>declaration:toggle_torch{description:<escape>Flashlight<escape>,parameters:{on:{type:BOOLEAN}}}<end_function_declaration>
<start_function_declaration>declaration:check_battery{description:<escape>Battery<escape>,parameters:{}}<end_function_declaration>
<start_function_declaration>declaration:set_volume{description:<escape>Volume<escape>,parameters:{level:{type:NUMBER}}}<end_function_declaration>
<start_function_declaration>declaration:clipboard_copy{description:<escape>Copy clipboard<escape>,parameters:{text:{type:STRING}}}<end_function_declaration>
<start_function_declaration>declaration:add_image{description:<escape>Add image<escape>,parameters:{}}<end_function_declaration>
<start_function_declaration>declaration:add_button{description:<escape>Add button<escape>,parameters:{button_label:{type:STRING}}}<end_function_declaration>"""


class FunctionGemmaHF:
    def __init__(self, model_path: str = MODEL_PATH):
        self.model_path = model_path
        self.model = None
        self.tokenizer = None

    def load(self):
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer
        print(f"Loading: {self.model_path}")
        self.model = AutoModelForCausalLM.from_pretrained(self.model_path, torch_dtype=torch.float16, device_map="cpu")
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_path)
        print("Loaded!")

    def infer(self, text: str) -> Dict[str, Any]:
        import torch
        if not self.model:
            self.load()

        prompt = (
            f"<start_of_turn>developer\nYou can call the following functions:\n{DECLS}\n<end_of_turn>\n"
            f"<start_of_turn>user\n{text}\n<end_of_turn>\n"
            f"<start_of_turn>model\n"
        )

        inputs = self.tokenizer(prompt, return_tensors="pt")
        start = time.time()
        with torch.no_grad():
            out = self.model.generate(**inputs, max_new_tokens=80, temperature=0.1, do_sample=True)
        latency = (time.time() - start) * 1000

        result = self.tokenizer.decode(out[0], skip_special_tokens=False)
        model_part = result.split("<start_of_turn>model\n")[-1].split("<end_of_turn>")[0].strip()

        fc = re.search(r'<start_function_call>call:(\w+)\{(.*?)\}<end_function_call>', model_part)
        if fc:
            args = {}
            for kv in re.finditer(r'(\w+):(?:<escape>(.*?)<escape>|([^,}]+))', fc.group(2)):
                k, v = kv.group(1), kv.group(2) if kv.group(2) is not None else kv.group(3)
                if v:
                    v = v.strip()
                    if v.lower() == "true": v = True
                    elif v.lower() == "false": v = False
                    else:
                        try: v = float(v) if "." in str(v) else int(v)
                        except: pass
                args[k] = v
            return {"function_name": fc.group(1), "arguments": args, "is_function_call": True, "raw_output": model_part, "latency_ms": round(latency, 1)}
        return {"function_name": None, "arguments": {}, "is_function_call": False, "text_response": model_part, "raw_output": model_part, "latency_ms": round(latency, 1)}

    def unload(self):
        if self.model:
            del self.model
            self.model = None
            import gc; gc.collect()
            print("Unloaded")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--query", "-q")
    parser.add_argument("--serve", "-s", action="store_true")
    parser.add_argument("--port", "-p", type=int, default=8077)
    args = parser.parse_args()

    engine = FunctionGemmaHF()

    if args.query:
        engine.load()
        print(json.dumps(engine.infer(args.query), indent=2))
    elif args.serve:
        from http.server import HTTPServer, BaseHTTPRequestHandler
        engine.load()
        class H(BaseHTTPRequestHandler):
            def do_POST(self):
                body = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))))
                r = engine.infer(body.get("text", ""))
                self.send_response(200); self.send_header("Content-Type", "application/json"); self.send_header("Access-Control-Allow-Origin", "*"); self.end_headers()
                self.wfile.write(json.dumps(r).encode())
            def log_message(self, *a): pass
        print(f"Serving on :{args.port}")
        HTTPServer(("0.0.0.0", args.port), H).serve_forever()
    else:
        engine.load()
        print("\nFunctionGemma Interactive (HF). Type 'quit' to exit.\n")
        while True:
            try:
                t = input("You: ").strip()
                if not t or t in ("quit", "exit"): break
                r = engine.infer(t)
                if r["is_function_call"]:
                    print(f"  -> {r['function_name']}({json.dumps(r['arguments'])})  [{r['latency_ms']}ms]\n")
                else:
                    print(f"  -> (text) {r.get('text_response', '')[:60]}  [{r['latency_ms']}ms]\n")
            except (KeyboardInterrupt, EOFError): break
        engine.unload()

if __name__ == "__main__":
    main()
