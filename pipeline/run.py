#!/usr/bin/env python3
"""
Full CSV pipeline (run from project root):

  python -m pipeline.run

Steps:
  1) fix_team_id_by_track — resolve team_id 1 vs 2 per track_id (majority).
  2) clean_tracking_csv — roster validation + per-track mode imputation.

Input:  raw tracking CSV (default: output_video 2.csv)
Writes: output_video_2_team_fixed.csv, then output_video_2_cleaned.csv
"""

from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd

from pipeline.clean_tracking_csv import (
    load_roster_by_team,
    step1_invalidate_jersey_not_on_roster,
    step2_impute_track_identity_modes,
)
from pipeline.fix_team_id_by_track import fix_team_id_conflicts
from pipeline.paths import CLEANED_CSV, RAW_CSV, TEAM_CONFIG, TEAM_FIXED_CSV


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run fix_team_id_by_track then clean_tracking_csv in sequence."
    )
    parser.add_argument(
        "--input",
        type=Path,
        default=RAW_CSV,
        help="Original tracking CSV",
    )
    parser.add_argument(
        "--team-fixed",
        type=Path,
        default=TEAM_FIXED_CSV,
        help="Intermediate CSV after team_id resolution",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=CLEANED_CSV,
        help="Final CSV after roster + mode cleaning",
    )
    parser.add_argument(
        "--config",
        type=Path,
        default=TEAM_CONFIG,
        help="Team roster JSON",
    )
    parser.add_argument(
        "--skip-team-fixed-write",
        action="store_true",
        help="Do not write the intermediate file (still runs step 1 in memory)",
    )
    args = parser.parse_args()

    if not args.input.is_file():
        raise SystemExit(f"Input not found: {args.input}")
    if not args.config.is_file():
        raise SystemExit(f"Config not found: {args.config}")

    print("=== Step 1: fix_team_id_by_track ===")
    df = pd.read_csv(args.input, low_memory=False)
    df, fixed_tracks = fix_team_id_conflicts(df)
    if fixed_tracks:
        fixed_tracks.sort()
        print(
            f"Resolved team_id 1 vs 2 for {len(fixed_tracks)} track_id(s) "
            f"(preview: {fixed_tracks[:20]}{'…' if len(fixed_tracks) > 20 else ''})"
        )
    else:
        print("No track_id had both team_id 1 and 2.")

    if not args.skip_team_fixed_write:
        args.team_fixed.parent.mkdir(parents=True, exist_ok=True)
        df.to_csv(args.team_fixed, index=False)
        print(f"Wrote intermediate: {args.team_fixed} ({len(df)} rows)")
    else:
        print("(Skipped writing intermediate file)")

    print("=== Step 2: clean_tracking_csv (roster + track modes) ===")
    roster = load_roster_by_team(args.config)
    df = step1_invalidate_jersey_not_on_roster(df, roster)
    df = step2_impute_track_identity_modes(df)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(args.output, index=False)
    print(f"Wrote final: {args.output} ({len(df)} rows)")
    print("Done.")


if __name__ == "__main__":
    main()
