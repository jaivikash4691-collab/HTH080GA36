import os
import httpx
from dotenv import load_dotenv

load_dotenv()

key = os.getenv("NVIDIA_NIM_API_KEY")

try:
    r = httpx.get(
        "https://integrate.api.nvidia.com/v1/models",
        headers={
            "Authorization": f"Bearer {key}",
            "Accept": "application/json",
        },
        timeout=30,
    )

    print("HTTP:", r.status_code)
    print(r.text[:5000])

except Exception as e:
    print("ERROR:", type(e).__name__)
    print("DETAIL:", str(e))
