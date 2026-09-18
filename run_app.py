import subprocess
import sys
import time
import os
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"

def main():
    print("=" * 60)
    print("🚀 Launching Echo-Notes: Full-Stack AI Meeting Assistant")
    print("=" * 60)

    # 1. Start FastAPI backend
    print("\n[1/2] Starting FastAPI Backend on http://localhost:8000 ...")
    backend_cmd = [sys.executable, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000", "--reload"]
    backend_proc = subprocess.Popen(backend_cmd, cwd=str(BACKEND_DIR))

    time.sleep(2)

    # 2. Start Frontend dev server
    print("\n[2/2] Starting React + Vite Frontend on http://localhost:5173 ...")
    frontend_cmd = ["pnpm", "dev"]
    frontend_proc = subprocess.Popen(frontend_cmd, cwd=str(FRONTEND_DIR), shell=True)

    print("\n" + "=" * 60)
    print("✨ Echo-Notes is LIVE!")
    print("👉 Frontend Dashboard: http://localhost:5173")
    print("👉 Backend API & Docs: http://localhost:8000/docs")
    print("=" * 60)
    print("Press Ctrl+C to terminate both servers.\n")

    try:
        backend_proc.wait()
        frontend_proc.wait()
    except KeyboardInterrupt:
        print("\nShutting down Echo-Notes servers...")
        backend_proc.terminate()
        frontend_proc.terminate()
        print("Goodbye!")

if __name__ == "__main__":
    main()

