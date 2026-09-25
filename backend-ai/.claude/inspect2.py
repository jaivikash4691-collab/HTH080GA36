import re, pathlib
root = pathlib.Path(r"D:\Games\gba\HTH080GA36\backend-ai")

# 1. .env keys (names only)
print("=== .env keys ===")
for line in (root / ".env").read_text(encoding="utf-8", errors="replace").splitlines():
    m = re.match(r"\s*([A-Za-z_][A-Za-z0-9_]*)\s*=", line)
    if m:
        print(m.group(1))

# 2. grep for openrouter/nvidia/model names in app
print("\n=== grep app (excluding __pycache__) ===")
pat = re.compile(r"openrouter|nvidia_nim|NVIDIA_NIM|deepseek|gemma|llama|kimi|LLM_MODEL|LLM_PROVIDER", re.I)
for f in sorted(root.rglob("*.py")):
    if "__pycache__" in str(f) or ".venv" in str(f) or ".claude" in str(f):
        continue
    for i, l in enumerate(f.read_text(encoding="utf-8", errors="replace").splitlines(), 1):
        if pat.search(l):
            print(f"{f.relative_to(root)}:{i}: {l.strip()[:150]}")

# 3. routes
print("\n=== routes in main.py ===")
main = (root / "app" / "main.py").read_text(encoding="utf-8", errors="replace")
for i, l in enumerate(main.splitlines(), 1):
    if "include_router" in l or "@app." in l or "add_api_route" in l:
        print(i, l.strip()[:150])
