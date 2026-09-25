import re, sys, pathlib
p = pathlib.Path(r"D:\Games\gba\HTH080GA36\backend-ai\app\services\llm_factory.py")
lines = p.read_text(encoding="utf-8").splitlines()
for i, l in enumerate(lines, 1):
    if re.match(r"^(class |def |async def )", l) or "nvidia" in l.lower():
        print(i, l[:130])
