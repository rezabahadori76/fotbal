#!/usr/bin/env python3
"""
1) Null jersey_number when the number is not on that team's roster (from team config JSON).
2) Per track_id, fill empty / inconsistent identity columns with the most frequent non-null value (mode).
"""

from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path

import pandas as pd

from pipeline.paths import CLEANED_CSV, RAW_CSV, TEAM_CONFIG, TEAM_FIXED_CSV


def load_roster_by_team(config_path: Path) -> dict[int, set[int]]:
    with config_path.open(encoding="utf-8") as f:
        cfg = json.load(f)
    match = cfg["match"]
    return {
        1: {p["number"] for p in match["team_1"]["players"]},
        2: {p["number"] for p in match["team_2"]["players"]},
    }


def step1_invalidate_jersey_not_on_roster(
    df: pd.DataFrame, roster_by_team: dict[int, set[int]]
) -> pd.DataFrame:
    """Set jersey_number to NA when team_id is 1/2 and number is not on that roster."""
    out = df.copy()
    jn = pd.to_numeric(out["jersey_number"], errors="coerce")
    tid = pd.to_numeric(out["team_id"], errors="coerce")
    jn_int = jn.round().astype("Int64")

    bad = pd.Series(False, index=out.index)
    for team_id, roster in roster_by_team.items():
        on_team = tid == team_id
        has_num = jn_int.notna()
        not_in_roster = ~jn_int.isin(roster)
        bad |= on_team & has_num & not_in_roster

    out.loc[bad, "jersey_number"] = pd.NA
    out["jersey_number"] = pd.to_numeric(out["jersey_number"], errors="coerce").round()
    out["jersey_number"] = out["jersey_number"].astype("Int64")
    return out


def _mode_non_null(series: pd.Series):
    """Most common value among non-null, non-blank entries; pd.NA if none."""
    s = series.dropna()
    if s.empty:
        return pd.NA
    if s.dtype == object:
        s = s[s.astype(str).str.strip() != ""]
    if s.empty:
        return pd.NA
    vals = s.tolist()
    return Counter(vals).most_common(1)[0][0]


def step2_impute_track_identity_modes(
    df: pd.DataFrame,
    cols: list[str] | None = None,
) -> pd.DataFrame:
    """
    For each track_id, set listed columns to the mode of non-null values in that track.
    Frame-varying columns (bbox, time, has_ball, ...) must not be listed here.
    """
    if cols is None:
        cols = [
            "jersey_number",
            "team_id",
            "entity_type",
            "team_1_label",
            "team_2_label",
        ]
    out = df.copy()
    present = [c for c in cols if c in out.columns]
    for col in present:
        mode_per_track = out.groupby("track_id", sort=False)[col].agg(_mode_non_null)
        for tid, mode_val in mode_per_track.items():
            if pd.isna(mode_val):
                continue
            mask = out["track_id"] == tid
            out.loc[mask, col] = mode_val
    if "jersey_number" in out.columns:
        out["jersey_number"] = pd.to_numeric(out["jersey_number"], errors="coerce").round()
        out["jersey_number"] = out["jersey_number"].astype("Int64")
    if "team_id" in out.columns:
        out["team_id"] = pd.to_numeric(out["team_id"], errors="coerce").round()
        out["team_id"] = out["team_id"].astype("Int64")
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description="Clean tracking CSV using team roster + track_id modes.")
    parser.add_argument(
        "--config",
        type=Path,
        default=TEAM_CONFIG,
        help="Path to team config JSON",
    )
    parser.add_argument(
        "--input",
        type=Path,
        default=TEAM_FIXED_CSV if TEAM_FIXED_CSV.is_file() else RAW_CSV,
        help="Input CSV (defaults to team-fixed if present)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=CLEANED_CSV,
        help="Output CSV",
    )
    args = parser.parse_args()

    roster = load_roster_by_team(args.config)
    df = pd.read_csv(args.input, low_memory=False)

    df = step1_invalidate_jersey_not_on_roster(df, roster)
    df = step2_impute_track_identity_modes(df)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(args.output, index=False)
    print(f"Wrote {args.output} ({len(df)} rows)")


if __name__ == "__main__":
    main()
