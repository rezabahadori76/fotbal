"""Shared paths: pipeline scripts live here; data files live in project root."""

from __future__ import annotations

from pathlib import Path

PIPELINE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = PIPELINE_DIR.parent


def resolve_data(filename: str) -> Path:
    """Find a data file in project root or legacy other_files/."""
    for base in (PROJECT_ROOT, PROJECT_ROOT / "other_files"):
        path = base / filename
        if path.is_file():
            return path
    return PROJECT_ROOT / filename


TEAM_CONFIG = PROJECT_ROOT / "team config.json"
RAW_CSV = resolve_data("output_video 2.csv")
TEAM_FIXED_CSV = PROJECT_ROOT / "output_video_2_team_fixed.csv"
CLEANED_CSV = PROJECT_ROOT / "output_video_2_cleaned.csv"
VIDEO = PROJECT_ROOT / "output.mp4"
ANNOTATED_VIDEO = PROJECT_ROOT / "output_annotated.mp4"
