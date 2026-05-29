#!/usr/bin/env python3
"""
For each track_id: if that track has rows with both team_id 1 and team_id 2,
set team_id on every row of that track to the most frequent value (mode).
Tracks that only ever have one team_id are left unchanged.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd

from pipeline.paths import RAW_CSV, TEAM_FIXED_CSV


def fix_team_id_conflicts(
    df: pd.DataFrame, team_col: str = "team_id", track_col: str = "track_id"
) -> tuple[pd.DataFrame, list[int]]:
    out = df.copy()
    if track_col not in out.columns or team_col not in out.columns:
        raise ValueError(f"CSV must contain '{track_col}' and '{team_col}'")

    teams = pd.to_numeric(out[team_col], errors="coerce")
    fixed_tracks: list[int] = []

    for tid, idx in out.groupby(track_col, sort=False).groups.items():
        sub = teams.loc[idx]
        valid = sub.dropna()
        if valid.empty:
            continue
        u = set(valid.round().astype(int).unique())
        if not (1 in u and 2 in u):
            continue
        mode_val = int(valid.round().astype(int).value_counts().idxmax())
        out.loc[idx, team_col] = mode_val
        fixed_tracks.append(int(tid))

    out[team_col] = pd.to_numeric(out[team_col], errors="coerce").round()
    out[team_col] = out[team_col].astype("Int64")
    return out, fixed_tracks


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Resolve team_id 1 vs 2 conflicts per track_id using the majority team_id."
    )
    parser.add_argument(
        "--input",
        type=Path,
        default=RAW_CSV,
        help="Input tracking CSV",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=TEAM_FIXED_CSV,
        help="Output CSV with team_id corrected",
    )
    args = parser.parse_args()

    if not args.input.is_file():
        raise SystemExit(f"Input not found: {args.input}")

    df = pd.read_csv(args.input, low_memory=False)
    df, fixed_tracks = fix_team_id_conflicts(df)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(args.output, index=False)
    print(f"Wrote {args.output} ({len(df)} rows)")
    if fixed_tracks:
        fixed_tracks.sort()
        preview = fixed_tracks[:50]
        suffix = "…" if len(fixed_tracks) > 50 else ""
        print(
            f"Resolved team_id 1 vs 2 for {len(fixed_tracks)} track_id(s) (majority team_id applied): "
            f"{preview}{suffix}"
        )
    else:
        print("No track_id had both team_id 1 and 2; team_id column dtype normalized only.")


if __name__ == "__main__":
    main()
