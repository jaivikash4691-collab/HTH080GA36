from app.main import app
from fastapi.routing import APIRoute

for route in app.routes:
    if isinstance(route, APIRoute):
        print(f"{','.join(sorted(route.methods)):<12} {route.path}")
    elif hasattr(route, "routes"):
        print(f"\n[ROUTER] {getattr(route, 'prefix', '')}")
        for subroute in route.routes:
            if isinstance(subroute, APIRoute):
                print(f"{','.join(sorted(subroute.methods)):<12} {getattr(route, 'prefix', '')}{subroute.path}")
