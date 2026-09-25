import re, pathlib
root = pathlib.Path(r"D:\Games\gba\HTH080GA36\backend-ai")

print("=== .env non-secret values ===")
for line in (root / ".env").read_text(encoding="utf-8", errors="replace").splitlines():
    m = re.match(r"\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)", line)
    if m:
        k, v = m.group(1), m.group(2)
        if "KEY" in k or "SECRET" in k or k == "SUPABASE_DB_URL":
            v = "<hidden>" if v else ""
        print(f"{k}={v}")

print("\n=== main.py routes/lifespan ===")
main = (root / "app" / "main.py").read_text(encoding="utf-8", errors="replace")
for i, l in enumerate(main.splitlines(), 1):
    if "include_router" in l or re.search(r"@app\.(get|post|put|delete)", l) or l.strip().startswith("def ") or "APIRouter" in l:
        print(i, l.strip()[:160])

for r in ["papers", "analysis", "reports", "query", "evidence"]:
    p = root / "app" / "routers" / f"{r}.py"
    print(f"\n=== routers/{r}.py endpoints ===")
    for i, l in enumerate(p.read_text(encoding="utf-8", errors="replace").splitlines(), 1):
        if re.search(r"@router\.(get|post|put|delete)", l) or l.strip().startswith("async def "):
            print(i, l.strip()[:160])
