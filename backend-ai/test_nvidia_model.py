import os
import httpx
from dotenv import load_dotenv

load_dotenv()

key = os.getenv("NVIDIA_NIM_API_KEY")
model = "nvidia/llama-3.1-nemotron-70b-instruct"

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

    print("MODEL:", model)
    print("HTTP:", r.status_code)
    print(r.text[:3000])

except Exception as e:
    print("ERROR:", type(e).__name__)
    print("DETAIL:", str(e))
