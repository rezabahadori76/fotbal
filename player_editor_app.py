 #!/usr/bin/env python3
"""
Web UI: play tracking video, draw bboxes from CSV, click a player to set jersey_number for that track_id.
"""

from __future__ import annotations

import argparse
import io
import math
from pathlib import Path

import pandas as pd
from flask import Flask, Response, flash, jsonify, redirect, render_template, request, send_file, session, url_for

from analytics_engine import build_coach_analytics, build_player_analytics
from roster_config import iter_team_roster, named_roster_keys
from auth_utils import (
    coach_required,
    current_user_dict,
    find_player_in_config,
    is_coach,
    is_logged_in,
    is_player,
    load_auth_config,
    login_coach,
    login_player,
    login_required,
    logout_user,
    player_can_access,
    verify_coach_login,
    verify_player_login,
)


def _has_ball_val(val) -> bool:
    if pd.isna(val):
        return False
    if isinstance(val, bool):
        return val
    return str(val).strip().lower() in ("true", "1", "yes")


def merge_time_segments(segments: list[dict], gap: float = 2.0, min_dur: float = 0.2) -> list[dict]:
    merged: list[dict] = []
    for seg in segments:
        if not merged:
            merged.append({"start": seg["start"], "end": seg["end"]})
            continue
        last = merged[-1]
        if seg["start"] - last["end"] < gap:
            last["end"] = max(last["end"], seg["end"])
        else:
            merged.append({"start": seg["start"], "end": seg["end"]})
    return [s for s in merged if s["end"] - s["start"] >= min_dur]


def build_ball_possession_data(
    df: pd.DataFrame,
    fps: float,
    jersey_display,
    team_config: dict,
) -> dict:
    if "has_ball" not in df.columns:
        return {"teams": []}

    ball_df = df[df["has_ball"].map(_has_ball_val)]
    if ball_df.empty:
        return {"teams": []}

    match = team_config.get("match", {})

    def lookup_name(team_id: int, jersey: int | None) -> str | None:
        if jersey is None or team_id not in (1, 2):
            return None
        for _, num, name in iter_team_roster(team_config, team_id):
            if num == jersey:
                return name
        return None

    carriers_raw: list[dict] = []
    for tid, sub in ball_df.groupby("track_id"):
        tid = int(tid)
        frame_list = sorted(int(f) for f in sub["frame_index"].unique())

        segments: list[dict] = []
        start_f = end_f = frame_list[0]
        for fi in frame_list[1:]:
            if fi - end_f <= 1:
                end_f = fi
            else:
                segments.append({"start": start_f / fps, "end": end_f / fps})
                start_f = end_f = fi
        segments.append({"start": start_f / fps, "end": end_f / fps})
        segments = merge_time_segments(segments)
        if not segments:
            continue

        team_series = pd.to_numeric(sub["team_id"], errors="coerce").dropna()
        team_id = int(team_series.mode().iloc[0]) if not team_series.empty else 0

        jerseys: list[int] = []
        for r in sub.itertuples(index=False):
            j = jersey_display(tid, r.jersey_number)
            if j is not None:
                try:
                    jerseys.append(int(j))
                except ValueError:
                    pass
        jersey = int(pd.Series(jerseys).mode().iloc[0]) if jerseys else None

        total_sec = sum(s["end"] - s["start"] for s in segments)
        name = lookup_name(team_id, jersey)
        if jersey is None or not name or team_id not in (1, 2):
            continue

        label = f"#{jersey} {name}"
        carriers_raw.append(
            {
                "track_id": tid,
                "team_id": team_id,
                "jersey_number": jersey,
                "name": name,
                "label": label,
                "segments": segments,
                "touch_count": len(segments),
                "total_sec": round(total_sec, 1),
            }
        )

    teams_out: list[dict] = []
    for team_id in (1, 2):
        carriers = [c for c in carriers_raw if c["team_id"] == team_id]
        carriers.sort(key=lambda c: (-c["total_sec"], c["label"]))
        teams_out.append(
            {
                "team_id": team_id,
                "team_name": match.get(f"team_{team_id}", {}).get("name", f"Team {team_id}"),
                "carriers": carriers,
            }
        )
    return {"teams": teams_out}


def _lookup_player_meta(team_config: dict, team_id: int, jersey: int | None) -> dict:
    match = team_config.get("match", {})
    if jersey is None or team_id not in (1, 2):
        return {"name": None, "position": None, "kit_color": None}
    team = match.get(f"team_{team_id}", {})
    for p in team.get("players", []):
        if p.get("number") == jersey:
            return {
                "name": p.get("name"),
                "position": p.get("position"),
                "kit_color": team.get("kit_color"),
            }
    return {"name": None, "position": None, "kit_color": team.get("kit_color")}


def build_player_pitch_segments(
    frames_dict: dict[int, list[dict]],
    fps: float,
    team_id: int,
    jersey_number: int,
) -> list[dict]:
    segments: list[dict] = []
    in_segment = False
    start_time = 0.0
    end_time = 0.0
    track_ids_in_seg: list[int] = []

    for fi in sorted(frames_dict.keys()):
        players = frames_dict[fi]
        tid: int | None = None
        for p in players:
            jn = p["jersey_number"]
            if p["team_id"] == team_id and jn is not None and str(jn) == str(jersey_number):
                tid = int(p["track_id"])
                break

        t = fi / fps
        if tid is not None:
            if not in_segment:
                in_segment = True
                start_time = t
                track_ids_in_seg = [tid]
            else:
                track_ids_in_seg.append(tid)
            end_time = t
        elif in_segment:
            in_segment = False
            if end_time - start_time >= 0.2:
                segments.append(
                    {
                        "start": start_time,
                        "end": end_time,
                        "track_id": int(pd.Series(track_ids_in_seg).mode().iloc[0]),
                    }
                )

    if in_segment and track_ids_in_seg:
        segments.append(
            {
                "start": start_time,
                "end": end_time,
                "track_id": int(pd.Series(track_ids_in_seg).mode().iloc[0]),
            }
        )

    merged: list[dict] = []
    for s in segments:
        if not merged:
            merged.append(dict(s))
            continue
        last = merged[-1]
        if s["start"] - last["end"] < 2.0:
            last["end"] = max(last["end"], s["end"])
        else:
            merged.append(dict(s))
    return merged


def _segments_from_frame_list(frame_list: list[int], fps: float, gap_frames: int = 1) -> list[dict]:
    if not frame_list:
        return []
    frame_list = sorted(frame_list)
    segments: list[dict] = []
    start_f = end_f = frame_list[0]
    track_ids: list[int] = []
    for fi in frame_list[1:]:
        if fi - end_f <= gap_frames:
            end_f = fi
        else:
            segments.append({"start": start_f / fps, "end": end_f / fps, "frames": end_f - start_f + 1})
            start_f = end_f = fi
    segments.append({"start": start_f / fps, "end": end_f / fps, "frames": end_f - start_f + 1})
    return merge_time_segments(segments)


def build_roster_stats(
    frames: dict[int, list[dict]],
    fps: float,
    team_config: dict,
    ball_possession: dict,
) -> list[dict]:
    """Per-player pitch time and ball-touch stats for named roster players only."""
    allowed = named_roster_keys(team_config)
    presence: dict[tuple[int, int], list[int]] = {}
    for fi, players in frames.items():
        seen: set[tuple[int, int]] = set()
        for p in players:
            if p["team_id"] not in (1, 2) or not p["jersey_number"]:
                continue
            try:
                jersey = int(p["jersey_number"])
            except (TypeError, ValueError):
                continue
            team_id = int(p["team_id"])
            key = (team_id, jersey)
            if key not in allowed or key in seen:
                continue
            seen.add(key)
            presence.setdefault(key, []).append(fi)

    touch_by_key: dict[tuple[int, int], dict] = {}
    for team in ball_possession.get("teams", []):
        tid_team = int(team["team_id"])
        for c in team.get("carriers", []):
            j = c.get("jersey_number")
            if j is None or not c.get("name"):
                continue
            key = (tid_team, int(j))
            if key not in allowed:
                continue
            touch_by_key[key] = {
                "ball_touches": c.get("touch_count", 0),
                "ball_touch_sec": c.get("total_sec", 0),
                "track_id": c.get("track_id"),
            }

    stats: list[dict] = []
    for team_id in (1, 2):
        team_name = team_config.get("match", {}).get(f"team_{team_id}", {}).get(
            "name", f"Team {team_id}"
        )
        for p, jersey, name in iter_team_roster(team_config, team_id):
            key = (team_id, jersey)
            frames_list = presence.get(key, [])
            segs = _segments_from_frame_list(frames_list, fps)
            pitch_sec = round(sum(s["end"] - s["start"] for s in segs), 1)
            touch = touch_by_key.get(key, {})
            stats.append(
                {
                    "team_id": team_id,
                    "team_name": team_name,
                    "jersey_number": jersey,
                    "name": name,
                    "position": p.get("position"),
                    "status": p.get("status"),
                    "pitch_time_sec": pitch_sec,
                    "pitch_segments": len(segs),
                    "on_pitch_pct": 0.0,
                    "ball_touches": touch.get("ball_touches", 0),
                    "ball_touch_sec": touch.get("ball_touch_sec", 0),
                    "track_id": touch.get("track_id"),
                    "detected": bool(frames_list),
                }
            )

    return stats


def build_match_overview(
    df: pd.DataFrame,
    fps: float,
    max_frame: int,
    team_config: dict,
    roster_stats: list[dict],
    ball_possession: dict,
) -> dict:
    duration_sec = max_frame / fps if fps else 0
    match = team_config.get("match", {})

    p1_pct = p2_pct = None
    if "possession_team1_pct_cumulative" in df.columns:
        last = df.loc[df["frame_index"] == df["frame_index"].max()]
        if not last.empty:
            p1 = last["possession_team1_pct_cumulative"].dropna()
            p2 = last["possession_team2_pct_cumulative"].dropna()
            if not p1.empty:
                p1_pct = round(float(p1.iloc[-1]), 1)
            if not p2.empty:
                p2_pct = round(float(p2.iloc[-1]), 1)

    team_summaries = []
    for team_id in (1, 2):
        team_stats = [s for s in roster_stats if s["team_id"] == team_id and s["detected"]]
        touches = sum(s["ball_touches"] for s in team_stats)
        touch_sec = round(sum(s["ball_touch_sec"] for s in team_stats), 1)
        active_players = len(team_stats)
        team_summaries.append(
            {
                "team_id": team_id,
                "team_name": match.get(f"team_{team_id}", {}).get("name", f"Team {team_id}"),
                "kit_color": match.get(f"team_{team_id}", {}).get("kit_color"),
                "active_players": active_players,
                "ball_touches": touches,
                "ball_touch_sec": touch_sec,
                "possession_pct": p1_pct if team_id == 1 else p2_pct,
            }
        )

    timeline: list[dict] = []
    if "possession_team1_pct_cumulative" in df.columns and duration_sec > 0:
        step = max(15, int(duration_sec // 40))
        for t in range(0, int(duration_sec) + 1, step):
            fi = min(int(t * fps), max_frame)
            sub = df[df["frame_index"] == fi]
            if sub.empty:
                continue
            row = sub.iloc[0]
            p1 = row.get("possession_team1_pct_cumulative")
            p2 = row.get("possession_team2_pct_cumulative")
            if pd.notna(p1):
                timeline.append(
                    {
                        "time": t,
                        "team1_pct": round(float(p1), 1),
                        "team2_pct": round(float(p2), 1) if pd.notna(p2) else None,
                    }
                )

    if duration_sec > 0:
        for s in roster_stats:
            s["on_pitch_pct"] = round(100 * s["pitch_time_sec"] / duration_sec, 1)

    named_stats = [s for s in roster_stats if s.get("name")]
    top_touches = sorted(named_stats, key=lambda x: (-x["ball_touch_sec"], -x["ball_touches"]))[:12]
    top_pitch = sorted(named_stats, key=lambda x: -x["pitch_time_sec"])[:12]

    return {
        "duration_sec": round(duration_sec, 1),
        "duration_fmt": _fmt_duration(duration_sec),
        "max_frame": max_frame,
        "fps": round(fps, 2),
        "total_frames": int(df["frame_index"].nunique()) if "frame_index" in df.columns else 0,
        "teams": team_summaries,
        "possession_timeline": timeline,
        "top_ball_carriers": [
            {
                "team_id": p["team_id"],
                "jersey_number": p["jersey_number"],
                "name": p["name"],
                "label": f"#{p['jersey_number']} {p['name']}" if p["name"] else f"#{p['jersey_number']}",
                "ball_touch_sec": p["ball_touch_sec"],
                "ball_touches": p["ball_touches"],
            }
            for p in top_touches
            if p["ball_touches"] > 0
        ],
        "top_pitch_time": [
            {
                "team_id": p["team_id"],
                "jersey_number": p["jersey_number"],
                "name": p["name"],
                "label": f"#{p['jersey_number']} {p['name']}" if p["name"] else f"#{p['jersey_number']}",
                "pitch_time_sec": p["pitch_time_sec"],
            }
            for p in top_pitch
            if p["pitch_time_sec"] > 0
        ],
    }


def _fmt_duration(sec: float) -> str:
    if not math.isfinite(sec) or sec < 0:
        sec = 0
    m = int(sec // 60)
    s = int(sec % 60)
    return f"{m}:{s:02d}"


def make_app(
    video_path: Path,
    csv_path: Path,
    team_config_path: Path,
    users_path: Path | None = None,
) -> Flask:
    import json
    try:
        with open(team_config_path, "r") as f:
            team_config = json.load(f)
    except Exception as e:
        print(f"Warning: Could not load team config: {e}")
        team_config = {}

    df = pd.read_csv(csv_path, low_memory=False)
    if "frame_index" not in df.columns:
        raise ValueError("CSV must contain frame_index")
    need = ["track_id", "bbox_x1", "bbox_y1", "bbox_x2", "bbox_y2", "jersey_number", "team_id"]
    for c in need:
        if c not in df.columns:
            raise ValueError(f"CSV missing column: {c}")

    ctx = {
        "df": df,
        "frames": {},
        "max_frame": 0,
        "fps": 2997 / 100,
        "frame_times": [],
        "video_path": video_path.resolve(),
        "csv_path": csv_path.resolve(),
        "team_config": team_config,
        "overrides": {},
    }

    def jersey_display(track_id: int, csv_val) -> str | None:
        o = ctx["overrides"]
        if track_id in o:
            v = o[track_id]
            return None if v is None else str(int(v))
        if pd.isna(csv_val):
            return None
        try:
            return str(int(round(float(csv_val))))
        except (ValueError, TypeError):
            s = str(csv_val).strip()
            return s or None

    def row_jersey_for_export(track_id: int, original) -> float | None:
        o = ctx["overrides"]
        if track_id in o:
            v = o[track_id]
            return None if v is None else float(int(v))
        if pd.isna(original):
            return None
        try:
            return float(int(round(float(original))))
        except (ValueError, TypeError):
            return None

    frames: dict[int, list[dict]] = {}
    for fi, sub in df.groupby("frame_index", sort=True):
        rows = []
        for r in sub.itertuples(index=False):
            tid = int(r.track_id)
            rows.append(
                {
                    "track_id": tid,
                    "bbox_x1": float(r.bbox_x1),
                    "bbox_y1": float(r.bbox_y1),
                    "bbox_x2": float(r.bbox_x2),
                    "bbox_y2": float(r.bbox_y2),
                    "jersey_number_csv": None if pd.isna(r.jersey_number) else r.jersey_number,
                    "jersey_number": jersey_display(tid, r.jersey_number),
                    "team_id": None if pd.isna(r.team_id) else int(r.team_id),
                    "has_ball": _has_ball_val(getattr(r, "has_ball", False)),
                }
            )
        frames[int(fi)] = rows

    ctx["frames"] = frames
    ctx["max_frame"] = max(frames.keys()) if frames else 0
    ctx["ball_possession"] = {"teams": []}

    ts = df.sort_values("frame_index")["time_sec"]
    fi_s = df.sort_values("frame_index")["frame_index"]
    d = ts.diff()
    fi_d = fi_s.diff()
    valid = (fi_d > 0) & d.notna() & (fi_d.notna())
    if valid.any():
        fps = float((fi_d[valid] / d[valid]).median())
        if fps <= 0 or fps > 120:
            fps = 2997 / 100
        ctx["fps"] = fps

    ctx["frame_times"] = (
        df.groupby("frame_index", sort=True)["time_sec"].first().astype(float).tolist()
    )

    ctx["ball_possession"] = build_ball_possession_data(
        df, ctx["fps"], jersey_display, team_config
    )
    ctx["roster_stats"] = build_roster_stats(
        ctx["frames"], ctx["fps"], team_config, ctx["ball_possession"]
    )
    ctx["match_overview"] = build_match_overview(
        df,
        ctx["fps"],
        ctx["max_frame"],
        team_config,
        ctx["roster_stats"],
        ctx["ball_possession"],
    )
    ctx["coach_analytics"] = build_coach_analytics(
        df,
        ctx["roster_stats"],
        ctx["match_overview"],
        ctx["ball_possession"],
        team_config,
        ctx["fps"],
    )

    root = team_config_path.resolve().parent
    auth_path = users_path or (root / "users.json")
    auth_cfg = load_auth_config(auth_path)

    app = Flask(__name__)
    app.config["EDITOR_CTX"] = ctx
    app.config["AUTH_CFG"] = auth_cfg
    app.secret_key = auth_cfg.get("secret_key", "pitchiq-dev-secret")
    app.config["TEMPLATES_AUTO_RELOAD"] = True

    @app.after_request
    def _no_cache_html(response: Response):
        if response.content_type and "text/html" in response.content_type:
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
            response.headers["Pragma"] = "no-cache"
        return response

    @app.route("/login", methods=["GET", "POST"])
    def login():
        if is_logged_in():
            return redirect(url_for("index"))
        match = team_config.get("match", {})
        teams = []
        for tid in (1, 2):
            t = match.get(f"team_{tid}", {})
            teams.append({"id": tid, "name": t.get("name", f"Team {tid}")})
        if request.method == "POST":
            role = (request.form.get("role") or "coach").strip()
            if role == "coach":
                username = (request.form.get("username") or "").strip()
                password = request.form.get("password") or ""
                if verify_coach_login(auth_cfg, username, password):
                    login_coach(auth_cfg)
                    nxt = request.args.get("next") or url_for("index")
                    return redirect(nxt)
                flash("Invalid coach username or password.", "error")
            else:
                try:
                    team_id = int(request.form.get("team_id", 0))
                    jersey_number = int(request.form.get("jersey_number", 0))
                except ValueError:
                    team_id = jersey_number = 0
                password = request.form.get("password") or ""
                player = find_player_in_config(team_config, team_id, jersey_number)
                if not player:
                    flash("Jersey number not found on that team roster.", "error")
                elif verify_player_login(auth_cfg, team_config, team_id, jersey_number, password):
                    team_name = match.get(f"team_{team_id}", {}).get("name", "")
                    login_player(team_id, jersey_number, player.get("name"), team_name)
                    return redirect(url_for("index"))
                else:
                    flash("Invalid password for player login.", "error")
        return render_template("login.html", teams=teams)

    @app.route("/logout")
    def logout():
        logout_user()
        return redirect(url_for("login"))

    @app.route("/")
    @login_required
    def index():
        c = app.config["EDITOR_CTX"]
        user = current_user_dict()
        return render_template(
            "player_editor.html",
            max_frame=c["max_frame"],
            fps=c["fps"],
            frame_times=c["frame_times"],
            video_name=video_path.name,
            csv_name=csv_path.name,
            current_user=user,
        )

    @app.route("/favicon.ico")
    def favicon():
        # Minimal 1x1 PNG — stops 404 spam in server logs when the HTML link is bypassed.
        png = (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
            b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01"
            b"\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
        )
        return Response(png, mimetype="image/png")

    @app.route("/video")
    @login_required
    def video():
        c = app.config["EDITOR_CTX"]
        return send_file(c["video_path"], mimetype="video/mp4", conditional=True)

    @app.route("/api/me")
    @login_required
    def api_me():
        return jsonify({"user": current_user_dict()})

    @app.route("/api/frame/<int:frame_idx>")
    @login_required
    def api_frame(frame_idx: int):
        c = app.config["EDITOR_CTX"]
        rows = c["frames"].get(frame_idx, [])
        return jsonify({"frame_index": frame_idx, "players": rows})

    @app.route("/api/override", methods=["POST"])
    @coach_required
    def api_override():
        c = app.config["EDITOR_CTX"]
        data = request.get_json(force=True, silent=True) or {}
        tid = data.get("track_id")
        if tid is None:
            return jsonify({"error": "track_id required"}), 400
        tid = int(tid)
        raw = data.get("jersey_number")
        force_empty = bool(data.get("force_empty"))

        if force_empty:
            c["overrides"][tid] = None
        elif raw is None or raw == "":
            c["overrides"].pop(tid, None)
        else:
            try:
                num = int(raw)
            except (TypeError, ValueError):
                return jsonify({"error": "jersey_number must be an integer"}), 400
            c["overrides"][tid] = num

        for plist in c["frames"].values():
            for p in plist:
                if p["track_id"] != tid:
                    continue
                p["jersey_number"] = jersey_display(tid, p["jersey_number_csv"])

        return jsonify({"ok": True, "track_id": tid, "overrides": serialize_overrides(c)})

    @app.route("/api/overrides", methods=["GET"])
    @coach_required
    def api_overrides_get():
        c = app.config["EDITOR_CTX"]
        return jsonify({"overrides": serialize_overrides(c)})

    @app.route("/api/export", methods=["GET"])
    @coach_required
    def api_export():
        c = app.config["EDITOR_CTX"]
        df_out = c["df"].copy()
        jerseys = []
        for r in df_out.itertuples(index=False):
            tid = int(r.track_id)
            orig = getattr(r, "jersey_number")
            jerseys.append(row_jersey_for_export(tid, orig))
        df_out["jersey_number"] = jerseys
        buf = io.StringIO()
        df_out.to_csv(buf, index=False)
        data = buf.getvalue().encode("utf-8")
        name = c["csv_path"].stem + "_edited.csv"
        return Response(
            data,
            mimetype="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{name}"'},
        )

    @app.route("/api/teams")
    @login_required
    def api_teams():
        c = app.config["EDITOR_CTX"]
        return jsonify(c.get("team_config", {}))

    @app.route("/api/ball_possession")
    @login_required
    def api_ball_possession():
        c = app.config["EDITOR_CTX"]
        data = c.get("ball_possession", {"teams": []})
        if is_player():
            tid = session.get("team_id")
            jn = session.get("jersey_number")
            filtered = []
            for team in data.get("teams", []):
                if team.get("team_id") != tid:
                    continue
                carriers = [
                    x
                    for x in team.get("carriers", [])
                    if x.get("jersey_number") == jn
                ]
                if carriers:
                    filtered.append({**team, "carriers": carriers})
            return jsonify({"teams": filtered})
        return jsonify(data)

    @app.route("/api/match_overview")
    @login_required
    def api_match_overview():
        if not is_coach():
            return jsonify({"error": "Coach access only"}), 403
        c = app.config["EDITOR_CTX"]
        return jsonify(c.get("match_overview", {}))

    @app.route("/api/roster_stats")
    @login_required
    def api_roster_stats():
        c = app.config["EDITOR_CTX"]
        stats = c.get("roster_stats", [])
        if is_player():
            tid = session.get("team_id")
            jn = session.get("jersey_number")
            stats = [s for s in stats if s["team_id"] == tid and s["jersey_number"] == jn]
        else:
            team_id = request.args.get("team_id", type=int)
            if team_id in (1, 2):
                stats = [s for s in stats if s["team_id"] == team_id]
            q = (request.args.get("q") or "").strip().lower()
            if q:
                stats = [
                    s
                    for s in stats
                    if q in str(s.get("jersey_number", "")).lower()
                    or q in (s.get("name") or "").lower()
                    or q in (s.get("position") or "").lower()
                ]
        return jsonify({"players": stats})

    @app.route("/api/player_profile/<int:team_id>/<int:jersey_number>")
    @login_required
    def api_player_profile(team_id: int, jersey_number: int):
        if not player_can_access(team_id, jersey_number):
            return jsonify({"error": "Forbidden"}), 403
        c = app.config["EDITOR_CTX"]
        stats = c.get("roster_stats", [])
        profile = next(
            (s for s in stats if s["team_id"] == team_id and s["jersey_number"] == jersey_number),
            None,
        )
        if not profile:
            profile = {
                "team_id": team_id,
                "jersey_number": jersey_number,
                "name": None,
                "detected": False,
            }
        meta = _lookup_player_meta(c.get("team_config", {}), team_id, jersey_number)
        if not profile.get("name"):
            profile = {**profile, "name": meta.get("name"), "position": meta.get("position")}
        return jsonify({"profile": profile})

    @app.route("/api/analytics")
    @login_required
    def api_analytics():
        c = app.config["EDITOR_CTX"]
        if is_player():
            tid = int(session.get("team_id", 0))
            jn = int(session.get("jersey_number", 0))
            segs = build_player_pitch_segments(c["frames"], c["fps"], tid, jn)
            return jsonify(
                build_player_analytics(
                    c["df"],
                    c["roster_stats"],
                    c["match_overview"],
                    c["ball_possession"],
                    c["team_config"],
                    tid,
                    jn,
                    c["fps"],
                    segs,
                )
            )
        return jsonify(c.get("coach_analytics", {}))

    @app.route("/api/analytics/player/<int:team_id>/<int:jersey_number>")
    @login_required
    def api_analytics_player(team_id: int, jersey_number: int):
        if not is_coach():
            return jsonify({"error": "Coach access only"}), 403
        c = app.config["EDITOR_CTX"]
        segs = build_player_pitch_segments(c["frames"], c["fps"], team_id, jersey_number)
        return jsonify(
            build_player_analytics(
                c["df"],
                c["roster_stats"],
                c["match_overview"],
                c["ball_possession"],
                c["team_config"],
                team_id,
                jersey_number,
                c["fps"],
                segs,
            )
        )

    @app.route("/api/player_times/<int:team_id>/<int:jersey_number>")
    @login_required
    def api_player_times(team_id: int, jersey_number: int):
        if not player_can_access(team_id, jersey_number):
            return jsonify({"error": "Forbidden"}), 403
        c = app.config["EDITOR_CTX"]
        merged = build_player_pitch_segments(
            c["frames"], c["fps"], team_id, jersey_number
        )

        team_config = c.get("team_config", {})
        match = team_config.get("match", {})
        name = None
        for p in match.get(f"team_{team_id}", {}).get("players", []):
            if p.get("number") == jersey_number:
                name = p.get("name")
                break
        if name:
            label = f"#{jersey_number} {name}"
        else:
            label = f"#{jersey_number}"

        return jsonify({"segments": merged, "label": label, "team_id": team_id, "jersey_number": jersey_number})

    return app


def serialize_overrides(c: dict) -> dict[str, int | None]:
    return {str(k): (None if v is None else int(v)) for k, v in sorted(c["overrides"].items())}


def main() -> None:
    parser = argparse.ArgumentParser(description="Player jersey editor UI (video + CSV).")
    root = Path(__file__).resolve().parent
    parser.add_argument("--video", type=Path, default=root / "your_video2.mp4")
    parser.add_argument("--csv", type=Path, default=root / "output_video_2_team_fixed.csv")
    parser.add_argument("--team-config", type=Path, default=root / "team config.json")
    parser.add_argument("--users", type=Path, default=root / "users.json")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=5050)
    parser.add_argument("--debug", action="store_true")
    args = parser.parse_args()

    if not args.video.is_file():
        raise SystemExit(f"Video not found: {args.video}")
    if not args.csv.is_file():
        raise SystemExit(f"CSV not found: {args.csv}")

    application = make_app(args.video, args.csv, args.team_config, args.users)
    print(f"Open http://{args.host}:{args.port}/login")
    print(f"Coach:  coach / coach123")
    print(f"Player: team + jersey # + password player123")
    print(f"Video: {args.video}")
    print(f"CSV:   {args.csv}")
    application.run(host=args.host, port=args.port, debug=args.debug, threaded=True)


if __name__ == "__main__":
    main()
