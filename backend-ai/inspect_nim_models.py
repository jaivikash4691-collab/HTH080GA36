import os
import httpx
from dotenv import load_dotenv

load_dotenv()

key = os.getenv("NVIDIA_NIM_API_KEY")

r = httpx.get(
    "https://integrate.api.nvidia.com/v1/models",
    headers={
        "Authorization": f"Bearer {key}",
        "Accept": "application/json",
    },
    timeout=30,
)

print("HTTP:", r.status_code)

if r.status_code == 200:
    data = r.json().get("data", [])

    for model in data:
        if model.get("id") in [
            "moonshotai/kimi-k2.6",
            "moonshotai/kimi-k3",
            "nvidia/llama-3.1-nemotron-70b-instruct",
        ]:
            print(model)
else:
    print(r.text[:3000])
