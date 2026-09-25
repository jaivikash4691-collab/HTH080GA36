import os
import httpx
from dotenv import load_dotenv

load_dotenv()

key = os.getenv("NVIDIA_NIM_API_KEY")

models = [
    "moonshotai/kimi-k2.6",
    "moonshotai/kimi-k3",
]

for model in models:
    print(f"\n=== {model} ===")

    payload = {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": "Reply with exactly: NIM_OK"
            }
        ],
        "max_tokens": 20,
        "temperature": 0
    }

    try:
        r = httpx.post(
            "https://integrate.api.nvidia.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            json=payload,
            timeout=120,
        )

        print("HTTP:", r.status_code)
        print(r.text[:2000])

    except Exception as e:
        print("ERROR:", type(e).__name__)
        print("DETAIL:", str(e))
