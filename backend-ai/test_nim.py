import asyncio
import os
import httpx
from dotenv import load_dotenv

load_dotenv()

async def main():
    key = os.getenv("NVIDIA_NIM_API_KEY")

    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": "moonshotai/kimi-k3",
        "messages": [
            {"role": "user", "content": "Reply with exactly: NIM_OK"}
        ],
        "max_tokens": 20,
        "temperature": 0,
    }

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            "https://integrate.api.nvidia.com/v1/chat/completions",
            headers=headers,
            json=payload,
        )

    print("HTTP:", response.status_code)
    print(response.text[:1000])

asyncio.run(main())
