#!/usr/bin/env python3
"""Start PitchIQ (Flask) and Academy Hub (Next.js) together."""

from __future__ import annotations

import os
import signal
import subprocess
import sys
import time
from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parent
ACADEMY = ROOT / "academy_hub"
HUB_URL = "http://127.0.0.1:3000/hub/login"
PITCHIQ_URL = "http://127.0.0.1:5050/login"


def _wait_for_hub(timeout: float = 90.0) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with urlopen(HUB_URL, timeout=2) as resp:
                if resp.status < 500:
                    return True
        except (URLError, OSError):
            time.sleep(0.5)
    return False


def main() -> int:
    npm = "npm.cmd" if os.name == "nt" else "npm"
    python = sys.executable
    procs: list[subprocess.Popen] = []

    def shutdown(*_args: object) -> None:
        for proc in procs:
            if proc.poll() is None:
                proc.terminate()
        for proc in procs:
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    print("Starting Academy Hub (Next.js on :3000, mounted at /hub)...")
    procs.append(
        subprocess.Popen(
            [npm, "run", "dev"],
            cwd=ACADEMY,
        )
    )

    if not _wait_for_hub():
        print("Academy Hub did not become ready in time.", file=sys.stderr)
        shutdown()
        return 1

    print("Starting PitchIQ (Flask on :5050)...")
    procs.append(
        subprocess.Popen(
            [python, "player_editor_app.py"],
            cwd=ROOT,
        )
    )

    print()
    print("Start here (PitchIQ / fotbal_ui):")
    print(f"  {PITCHIQ_URL}")
    print("After sign-in, use the Football Manager button in the top bar (/hub).")
    print()
    print("Press Ctrl+C to stop both servers.")

    try:
        while True:
            for proc in procs:
                code = proc.poll()
                if code is not None:
                    print(f"A server exited with code {code}", file=sys.stderr)
                    shutdown()
                    return code
            time.sleep(0.5)
    except KeyboardInterrupt:
        shutdown()
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
