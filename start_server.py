"""
EcoAlert Polar - Server Launcher
Run from the project root:
    python start_server.py
or:
    backend\\.venv\\Scripts\\python.exe start_server.py
"""
import sys
import os
import socket

# Make sure the backend package is importable
BACKEND_DIR = os.path.join(os.path.dirname(__file__), "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import uvicorn

HOST = "0.0.0.0"
PORT = 8000


def _port_free(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(1)
        return s.connect_ex(("127.0.0.1", port)) != 0


def _find_free_port(start: int) -> int:
    for p in range(start, start + 20):
        if _port_free(p):
            return p
    return start


if __name__ == "__main__":
    port = PORT if _port_free(PORT) else _find_free_port(PORT + 1)
    if port != PORT:
        print(f"  [!] Port {PORT} is busy - using port {port} instead.")

    print("")
    print("  +------------------------------------------------------+")
    print("  |   ECOALERT POLAR  //  AI Energy Command Center      |")
    print("  +------------------------------------------------------+")
    print(f"  |   Local:    http://127.0.0.1:{port}                    |")
    print(f"  |   Network:  http://<your-ip>:{port}                    |")
    print(f"  |   API Docs: http://127.0.0.1:{port}/docs               |")
    print("  +------------------------------------------------------+")
    print("")

    uvicorn.run(
        "app.main:app",
        host=HOST,
        port=port,
        reload=True,
        reload_dirs=[BACKEND_DIR],
        log_level="info",
        app_dir=BACKEND_DIR,
    )
