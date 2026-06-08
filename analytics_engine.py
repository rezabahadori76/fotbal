"""Game & player analytics built from tracking CSV + roster config."""

from __future__ import annotations

import math
from typing import Any

import pandas as pd

from roster_config import count_named_roster, iter_team_roster, named_roster_keys


def _has_ball_val(val) -> bool:
    if pd.isna(val):
        return False
    if isinstance(val, bool):
        return val
    return str(val).strip().lower() in ("true", "1", "yes")


def _fmt_duration(sec: float) -> str:
    if not math.isfinite(sec) or sec < 0:
        sec = 0
    m = int(sec // 60)
    s = int(sec % 60)
    return f"{m}:{s:02d}"


def _lookup_name(team_config: dict, team_id: int, jersey: int | None) -> str | None:
    if jersey is None or team_id not in (1, 2):
        return None
    for p in team_config.get("match", {}).get(f"team_{team_id}", {}).get("players", []):
        if p.get("number") == jersey:
            return p.get("name")
    return None


def _player_label(jersey: int, name: str | None) -> str:
    if not name or not str(name).strip():
        return f"#{jersey}"
    return f"#{jersey} {str(name).strip()}"


def build_squads_from_config(
    team_config: dict,
    roster_stats: list[dict],
    duration: float,
) -> dict[int, list[dict]]:
    """Official roster from team config.json, merged with tracking stats."""
    stats_map: dict[tuple[int, int], dict] = {}
    for s in roster_stats:
        j = s.get("jersey_number")
        if j is None:
            continue
        stats_map[(int(s["team_id"]), int(j))] = s

    squads: dict[int, list[dict]] = {}
    for team_id in (1, 2):
        team_name = team_config.get("match", {}).get(f"team_{team_id}", {}).get(
            "name", f"Team {team_id}"
        )
        rows: list[dict] = []
        for p, jersey, name in iter_team_roster(team_config, team_id):
            base = stats_map.get((team_id, jersey), {})
            pitch_sec = float(base.get("pitch_time_sec") or 0)
            ball_touch_sec = float(base.get("ball_touch_sec") or 0)
            ball_touches = int(base.get("ball_touches") or 0)
            detected = bool(base.get("detected", False))
            on_pitch_pct = base.get("on_pitch_pct")
            if (not on_pitch_pct) and duration > 0 and pitch_sec > 0:
                on_pitch_pct = round(100 * pitch_sec / duration, 1)
            else:
                on_pitch_pct = float(on_pitch_pct or 0)

            position = p.get("position") or base.get("position")
            inv = _involvement_score(pitch_sec, ball_touch_sec, ball_touches, duration)
            rows.append(
                {
                    "team_id": team_id,
                    "team_name": team_name,
                    "jersey_number": jersey,
                    "name": name,
                    "position": position if position else "—",
                    "status": p.get("status"),
                    "pitch_time_sec": round(pitch_sec, 1),
                    "pitch_segments": int(base.get("pitch_segments") or 0),
                    "on_pitch_pct": on_pitch_pct,
                    "ball_touches": ball_touches,
                    "ball_touch_sec": round(ball_touch_sec, 1),
                    "track_id": base.get("track_id"),
                    "detected": detected,
                    "involvement_score": inv,
                }
            )
        squads[team_id] = rows
    return squads


def _percentile_rank(value: float, values: list[float]) -> float:
    if not values:
        return 0.0
    below = sum(1 for v in values if v < value)
    equal = sum(1 for v in values if v == value)
    return round(100 * (below + 0.5 * equal) / len(values), 1)


def _involvement_score(pitch_sec: float, touch_sec: float, touches: int, duration: float) -> float:
    if duration <= 0:
        return 0.0
    pitch_norm = min(1.0, pitch_sec / duration)
    touch_norm = min(1.0, touch_sec / max(duration * 0.15, 1))
    touch_count_norm = min(1.0, touches / 20.0)
    return round(100 * (0.45 * pitch_norm + 0.35 * touch_norm + 0.20 * touch_count_norm), 1)


def _match_third_index(time_sec: float, duration_sec: float) -> int:
    if duration_sec <= 0:
        return 0
    r = time_sec / duration_sec
    if r < 1 / 3:
        return 0
    if r < 2 / 3:
        return 1
    return 2


def _build_heatmap_grid(
    sub: pd.DataFrame, rows: int = 6, cols: int = 10
) -> list[list[int]]:
    grid = [[0 for _ in range(cols)] for _ in range(rows)]
    if sub.empty or "center_x" not in sub.columns or "center_y" not in sub.columns:
        return grid
    xs = pd.to_numeric(sub["center_x"], errors="coerce").dropna()
    ys = pd.to_numeric(sub["center_y"], errors="coerce").dropna()
    if xs.empty or ys.empty:
        return grid
    x_max = float(xs.max()) or 1920.0
    y_max = float(ys.max()) or 1080.0
    for r in sub.itertuples(index=False):
        x = getattr(r, "center_x", None)
        y = getattr(r, "center_y", None)
        if pd.isna(x) or pd.isna(y):
            continue
        ci = min(cols - 1, max(0, int(float(x) / x_max * cols)))
        ri = min(rows - 1, max(0, int(float(y) / y_max * rows)))
        grid[ri][ci] += 1
    return grid


def build_coach_analytics(
    df: pd.DataFrame,
    roster_stats: list[dict],
    match_overview: dict,
    ball_possession: dict,
    team_config: dict,
    fps: float,
) -> dict[str, Any]:
    duration = float(match_overview.get("duration_sec") or 0)
    teams_out: list[dict] = []

    for team_id in (1, 2):
        team_players = [s for s in roster_stats if s["team_id"] == team_id]
        detected = [s for s in team_players if s.get("detected")]
        config_count = count_named_roster(team_config, team_id)
        touch_vals = [s["ball_touch_sec"] for s in detected]
        pitch_vals = [s["pitch_time_sec"] for s in detected]
        touch_counts = [s["ball_touches"] for s in detected]

        enriched = []
        for s in team_players:
            inv = _involvement_score(
                s.get("pitch_time_sec", 0),
                s.get("ball_touch_sec", 0),
                s.get("ball_touches", 0),
                duration,
            )
            enriched.append(
                {
                    **s,
                    "involvement_score": inv,
                    "touch_per_min": round(
                        s.get("ball_touches", 0) / max(s.get("pitch_time_sec", 0) / 60, 0.1),
                        2,
                    )
                    if s.get("pitch_time_sec", 0) > 0
                    else 0,
                    "pitch_pct_team": round(
                        100
                        * s.get("pitch_time_sec", 0)
                        / max(sum(pitch_vals), 0.1),
                        1,
                    )
                    if pitch_vals
                    else 0,
                }
            )

        team_summary = next(
            (t for t in match_overview.get("teams", []) if t.get("team_id") == team_id),
            {},
        )
        team_df = df[df["team_id"] == team_id] if "team_id" in df.columns else pd.DataFrame()
        if not team_df.empty and "jersey_number" in team_df.columns:
            allowed = named_roster_keys(team_config)
            jn = pd.to_numeric(team_df["jersey_number"], errors="coerce")

            def _allowed_row(j: float, tid: int = team_id) -> bool:
                if pd.isna(j):
                    return False
                return (tid, int(j)) in allowed

            team_df = team_df[jn.apply(lambda j: _allowed_row(j) if pd.notna(j) else False)]
        heatmap = _build_heatmap_grid(team_df)

        thirds_touch = [0.0, 0.0, 0.0]
        for team in ball_possession.get("teams", []):
            if team.get("team_id") != team_id:
                continue
            for c in team.get("carriers", []):
                for seg in c.get("segments", []):
                    mid = (seg["start"] + seg["end"]) / 2
                    thirds_touch[_match_third_index(mid, duration)] += seg["end"] - seg["start"]

        teams_out.append(
            {
                "team_id": team_id,
                "team_name": team_summary.get("team_name", f"Team {team_id}"),
                "kit_color": team_summary.get("kit_color"),
                "possession_pct": team_summary.get("possession_pct"),
                "ball_touches": team_summary.get("ball_touches", 0),
                "ball_touch_sec": team_summary.get("ball_touch_sec", 0),
                "squad_registered": config_count,
                "players_detected": len(detected),
                "detection_rate_pct": round(100 * len(detected) / max(config_count, 1), 1),
                "avg_pitch_time_sec": round(sum(pitch_vals) / max(len(pitch_vals), 1), 1),
                "avg_ball_touches": round(sum(touch_counts) / max(len(touch_counts), 1), 2),
                "players": sorted(enriched, key=lambda x: -x.get("involvement_score", 0)),
                "heatmap_grid": heatmap,
                "ball_touch_by_third": [round(x, 1) for x in thirds_touch],
            }
        )

    squad_by_team = build_squads_from_config(team_config, roster_stats, duration)
    squad_table: list[dict] = []
    for team_id in (1, 2):
        squad_table.extend(squad_by_team.get(team_id, []))

    all_detected = [s for s in squad_table if s.get("detected")]
    leader_involvement = sorted(
        all_detected, key=lambda x: -x.get("involvement_score", 0)
    )[:10]

    insights: list[dict] = []
    if match_overview.get("teams"):
        t1, t2 = match_overview["teams"][0], match_overview["teams"][1]
        p1, p2 = t1.get("possession_pct"), t2.get("possession_pct")
        if p1 is not None and p2 is not None:
            leader = t1 if p1 >= p2 else t2
            insights.append(
                {
                    "icon": "📊",
                    "title": "Possession edge",
                    "body": f"{leader.get('team_name', 'Team')} led cumulative possession "
                    f"({max(p1, p2):.0f}% vs {min(p1, p2):.0f}%).",
                }
            )
    top_touch = match_overview.get("top_ball_carriers", [])
    if top_touch:
        t = top_touch[0]
        insights.append(
            {
                "icon": "⚽",
                "title": "Primary ball carrier",
                "body": f"{t.get('label', 'Player')} recorded the most time on the ball "
                f"({_fmt_duration(t.get('ball_touch_sec', 0))}, {t.get('ball_touches', 0)} touches).",
            }
        )
    top_pitch = match_overview.get("top_pitch_time", [])
    if top_pitch:
        p = top_pitch[0]
        insights.append(
            {
                "icon": "⏱",
                "title": "Most pitch time",
                "body": f"{p.get('label', 'Player')} was on pitch longest "
                f"({_fmt_duration(p.get('pitch_time_sec', 0))}).",
            }
        )

    leaderboards_by_team: dict[int, dict] = {}
    team_insights: dict[int, list[dict]] = {}
    for team_id in (1, 2):
        team_squad = squad_by_team.get(team_id, [])
        detected_team = [
            s for s in team_squad if s.get("detected") and s.get("name")
        ]

        def _lb_row(s: dict, extra: dict | None = None) -> dict:
            row = {
                "team_id": team_id,
                "jersey_number": s["jersey_number"],
                "name": s.get("name"),
                "label": _player_label(s["jersey_number"], s.get("name")),
            }
            if extra:
                row.update(extra)
            return row

        leaderboards_by_team[team_id] = {
            "pitch_time": [
                _lb_row(s, {"pitch_time_sec": s.get("pitch_time_sec", 0)})
                for s in sorted(detected_team, key=lambda x: -x.get("pitch_time_sec", 0))[:12]
            ],
            "ball_touches": [
                _lb_row(
                    s,
                    {
                        "ball_touch_sec": s.get("ball_touch_sec", 0),
                        "ball_touches": s.get("ball_touches", 0),
                    },
                )
                for s in sorted(detected_team, key=lambda x: -x.get("ball_touch_sec", 0))[:12]
                if s.get("ball_touches", 0) > 0
            ],
            "involvement": [
                _lb_row(s, {"involvement_score": s.get("involvement_score", 0)})
                for s in sorted(detected_team, key=lambda x: -x.get("involvement_score", 0))[:12]
            ],
        }
        t_insights: list[dict] = []
        team_name = next(
            (t["team_name"] for t in teams_out if t["team_id"] == team_id),
            f"Team {team_id}",
        )
        top_t = leaderboards_by_team[team_id]["ball_touches"]
        if top_t:
            t0 = top_t[0]
            t_insights.append(
                {
                    "icon": "⚽",
                    "title": "Top ball carrier",
                    "body": f"{t0.get('label')} — {_fmt_duration(t0.get('ball_touch_sec', 0))}, "
                    f"{t0.get('ball_touches', 0)} touches.",
                }
            )
        top_p = leaderboards_by_team[team_id]["pitch_time"]
        if top_p:
            p0 = top_p[0]
            t_insights.append(
                {
                    "icon": "⏱",
                    "title": "Most pitch time",
                    "body": f"{p0.get('label')} — {_fmt_duration(p0.get('pitch_time_sec', 0))} on pitch.",
                }
            )
        undetected = [
            s
            for s in team_squad
            if not s.get("detected") and s.get("status") != "Not Signed Up"
        ]
        if undetected:
            names = ", ".join(
                f"#{s['jersey_number']}" + (f" {s['name']}" if s.get("name") else "")
                for s in undetected[:4]
            )
            extra = f" (+{len(undetected) - 4} more)" if len(undetected) > 4 else ""
            t_insights.append(
                {
                    "icon": "⚠️",
                    "title": "Not detected on video",
                    "body": f"{len(undetected)} roster player(s) missing from tracking: {names}{extra}.",
                }
            )
        team_insights[team_id] = t_insights

    return {
        "scope": "coach",
        "match": {
            "duration_sec": duration,
            "duration_fmt": match_overview.get("duration_fmt", _fmt_duration(duration)),
            "total_frames": match_overview.get("total_frames", 0),
            "fps": match_overview.get("fps", fps),
            "players_tracked": len(all_detected),
            "total_ball_touches": sum(s.get("ball_touches", 0) for s in all_detected),
            "total_ball_touch_sec": round(sum(s.get("ball_touch_sec", 0) for s in all_detected), 1),
        },
        "teams": teams_out,
        "possession_timeline": match_overview.get("possession_timeline", []),
        "leaderboards": {
            "pitch_time": match_overview.get("top_pitch_time", []),
            "ball_touches": match_overview.get("top_ball_carriers", []),
            "involvement": [
                {
                    "team_id": s["team_id"],
                    "jersey_number": s["jersey_number"],
                    "name": s.get("name"),
                    "label": f"#{s['jersey_number']} {s.get('name') or ''}".strip(),
                    "involvement_score": s.get("involvement_score", 0),
                }
                for s in leader_involvement
            ],
        },
        "insights": insights,
        "leaderboards_by_team": leaderboards_by_team,
        "team_insights": team_insights,
        "squad_by_team": squad_by_team,
        "squad_table": squad_table,
    }


def build_player_analytics(
    df: pd.DataFrame,
    roster_stats: list[dict],
    match_overview: dict,
    ball_possession: dict,
    team_config: dict,
    team_id: int,
    jersey_number: int,
    fps: float,
    player_times_segments: list[dict],
) -> dict[str, Any]:
    profile = next(
        (
            s
            for s in roster_stats
            if s["team_id"] == team_id and s["jersey_number"] == jersey_number
        ),
        None,
    )
    if not profile:
        profile = {
            "team_id": team_id,
            "jersey_number": jersey_number,
            "name": _lookup_name(team_config, team_id, jersey_number),
            "detected": False,
            "pitch_time_sec": 0,
            "ball_touches": 0,
            "ball_touch_sec": 0,
        }

    duration = float(match_overview.get("duration_sec") or 0)
    team_mates = [
        s for s in roster_stats if s["team_id"] == team_id and s.get("detected")
    ]
    pitch_vals = [s["pitch_time_sec"] for s in team_mates]
    touch_vals = [s["ball_touch_sec"] for s in team_mates]
    touch_count_vals = [s["ball_touches"] for s in team_mates]

    def _rank(value: float, values: list[float]) -> int:
        if not values:
            return 1
        ordered = sorted(values, reverse=True)
        try:
            return ordered.index(value) + 1
        except ValueError:
            return len(ordered) + 1

    rank_pitch = _rank(profile.get("pitch_time_sec", 0), pitch_vals)
    rank_touch = _rank(profile.get("ball_touch_sec", 0), touch_vals)

    team_avg_pitch = sum(pitch_vals) / max(len(pitch_vals), 1)
    team_avg_touch_sec = sum(touch_vals) / max(len(touch_vals), 1)
    team_avg_touches = sum(touch_count_vals) / max(len(touch_count_vals), 1)

    inv = _involvement_score(
        profile.get("pitch_time_sec", 0),
        profile.get("ball_touch_sec", 0),
        profile.get("ball_touches", 0),
        duration,
    )
    inv_scores = [
        _involvement_score(
            s.get("pitch_time_sec", 0),
            s.get("ball_touch_sec", 0),
            s.get("ball_touches", 0),
            duration,
        )
        for s in team_mates
    ]
    rank_inv = _rank(inv, inv_scores)

    touch_segments: list[dict] = []
    for team in ball_possession.get("teams", []):
        if team.get("team_id") != team_id:
            continue
        for c in team.get("carriers", []):
            if c.get("jersey_number") == jersey_number:
                touch_segments = c.get("segments", [])
                break

    pitch_by_third = [0.0, 0.0, 0.0]
    for seg in player_times_segments:
        mid = (seg["start"] + seg["end"]) / 2
        pitch_by_third[_match_third_index(mid, duration)] += seg["end"] - seg["start"]

    touch_by_third = [0.0, 0.0, 0.0]
    for seg in touch_segments:
        mid = (seg["start"] + seg["end"]) / 2
        touch_by_third[_match_third_index(mid, duration)] += seg["end"] - seg["start"]

    player_df = df[
        (df["team_id"] == team_id)
        & (pd.to_numeric(df["jersey_number"], errors="coerce") == jersey_number)
    ]
    heatmap = _build_heatmap_grid(player_df)

    team_name = team_config.get("match", {}).get(f"team_{team_id}", {}).get("name", f"Team {team_id}")

    report_bullets: list[str] = []
    if profile.get("detected"):
        report_bullets.append(
            f"You were on pitch for {_fmt_duration(profile.get('pitch_time_sec', 0))} "
            f"({profile.get('on_pitch_pct', 0):.0f}% of the game)."
        )
        if profile.get("ball_touches", 0) > 0:
            report_bullets.append(
                f"Ball involvement: {profile.get('ball_touches')} touches, "
                f"{profile.get('ball_touch_sec', 0):.1f}s on the ball — "
                f"rank #{rank_touch} on your team."
            )
        else:
            report_bullets.append("No registered ball touches in tracking data for this game.")
        report_bullets.append(
            f"Involvement score {inv}/100 — rank #{rank_inv} among {len(team_mates)} tracked teammates."
        )
        if profile.get("pitch_time_sec", 0) > team_avg_pitch * 1.15:
            report_bullets.append("Above-average pitch time compared to your team.")
        elif profile.get("pitch_time_sec", 0) < team_avg_pitch * 0.85:
            report_bullets.append("Below-average pitch time — consider reviewing positioning clips.")
    else:
        report_bullets.append("You were not detected in the tracking feed for this game.")

    return {
        "scope": "player",
        "player": {
            **profile,
            "team_name": team_name,
            "involvement_score": inv,
            "rank_pitch": rank_pitch,
            "rank_touches": rank_touch,
            "rank_involvement": rank_inv,
            "team_size_tracked": len(team_mates),
        },
        "comparison": {
            "pitch_time_sec": profile.get("pitch_time_sec", 0),
            "team_avg_pitch_sec": round(team_avg_pitch, 1),
            "ball_touch_sec": profile.get("ball_touch_sec", 0),
            "team_avg_touch_sec": round(team_avg_touch_sec, 1),
            "ball_touches": profile.get("ball_touches", 0),
            "team_avg_touches": round(team_avg_touches, 2),
            "pitch_percentile": _percentile_rank(profile.get("pitch_time_sec", 0), pitch_vals),
            "touch_percentile": _percentile_rank(profile.get("ball_touch_sec", 0), touch_vals),
        },
        "match": {
            "duration_fmt": match_overview.get("duration_fmt", _fmt_duration(duration)),
            "duration_sec": duration,
        },
        "activity": {
            "pitch_by_third": [round(x, 1) for x in pitch_by_third],
            "touch_by_third": [round(x, 1) for x in touch_by_third],
            "pitch_segments": player_times_segments,
            "touch_segments": touch_segments,
        },
        "heatmap_grid": heatmap,
        "report_bullets": report_bullets,
    }
