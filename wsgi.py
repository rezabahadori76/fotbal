"""WSGI entry for gunicorn (production PitchIQ backend)."""

from __future__ import annotations

import os
from pathlib import Path

from player_editor_app import make_app

ROOT = Path(__file__).resolve().parent

application = make_app(
    Path(os.environ.get("PITCHIQ_VIDEO", ROOT / "your_video2.mp4")),
    Path(os.environ.get("PITCHIQ_CSV", ROOT / "output_video_2_team_fixed.csv")),
    Path(os.environ.get("PITCHIQ_TEAM_CONFIG", ROOT / "team config.json")),
    Path(os.environ.get("PITCHIQ_USERS", ROOT / "users.json")),
)
