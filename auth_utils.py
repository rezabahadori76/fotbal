"""Session-based auth for coach vs player roles."""

from __future__ import annotations

import json
from functools import wraps
from pathlib import Path
from typing import Any, Callable

from flask import jsonify, redirect, request, session, url_for
from werkzeug.security import check_password_hash


def load_auth_config(path: Path) -> dict:
    if path.is_file():
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
    else:
        data = {
            "secret_key": "pitchiq-dev-secret",
            "admin": {
                "email": "admin@academy.com",
                "display_name": "Academy Admin",
            },
            "coach": {"username": "coach", "password": "coach123", "display_name": "Coach"},
            "player_password": "player123",
            "hub_accounts": {
                "admin": "admin@academy.com",
                "coach": "coach@academy.com",
                "player": "player@academy.com",
            },
        }
    if not data.get("secret_key"):
        data["secret_key"] = "pitchiq-dev-secret"
    return data


def _password_ok(stored: str, provided: str) -> bool:
    if not stored or not provided:
        return False
    if stored.startswith("pbkdf2:") or stored.startswith("scrypt:"):
        return check_password_hash(stored, provided)
    return stored == provided


def find_player_in_config(team_config: dict, team_id: int, jersey_number: int) -> dict | None:
    match = team_config.get("match", {})
    team = match.get(f"team_{team_id}")
    if not team:
        return None
    for p in team.get("players", []):
        if p.get("number") == jersey_number:
            return p
    return None


def verify_coach_login(auth_cfg: dict, username: str, password: str) -> bool:
    coach = auth_cfg.get("coach", {})
    return username == coach.get("username") and _password_ok(coach.get("password", ""), password)


def verify_player_login(auth_cfg: dict, team_config: dict, team_id: int, jersey_number: int, password: str) -> bool:
    player = find_player_in_config(team_config, team_id, jersey_number)
    if not player:
        return False
    expected = auth_cfg.get("player_password", "player123")
    return _password_ok(expected, password)


def hub_email_for_role(auth_cfg: dict, role: str) -> str:
    accounts = auth_cfg.get("hub_accounts", {})
    defaults = {
        "admin": "admin@academy.com",
        "coach": "coach@academy.com",
        "player": "player@academy.com",
    }
    return accounts.get(role, defaults.get(role, "player@academy.com"))


def login_admin(auth_cfg: dict) -> None:
    admin = auth_cfg.get("admin", {})
    session.clear()
    session["role"] = "admin"
    session["display_name"] = admin.get("display_name", "Admin")
    session["hub_email"] = admin.get("email") or hub_email_for_role(auth_cfg, "admin")
    session.permanent = True


def login_coach(auth_cfg: dict) -> None:
    coach = auth_cfg.get("coach", {})
    session.clear()
    session["role"] = "coach"
    session["display_name"] = coach.get("display_name", "Coach")
    session["hub_email"] = hub_email_for_role(auth_cfg, "coach")
    session.permanent = True


def login_player(
    team_id: int,
    jersey_number: int,
    name: str | None,
    team_name: str | None,
    auth_cfg: dict | None = None,
) -> None:
    session.clear()
    session["role"] = "player"
    session["team_id"] = team_id
    session["jersey_number"] = jersey_number
    label = f"#{jersey_number}"
    if name:
        label = f"#{jersey_number} {name}"
    session["display_name"] = label
    session["team_name"] = team_name or ""
    if auth_cfg:
        session["hub_email"] = hub_email_for_role(auth_cfg, "player")
    session.permanent = True


def logout_user() -> None:
    session.clear()


def is_logged_in() -> bool:
    return session.get("role") in ("admin", "coach", "player")


def is_admin() -> bool:
    return session.get("role") == "admin"


def is_coach() -> bool:
    return session.get("role") == "coach"


def is_player() -> bool:
    return session.get("role") == "player"


def current_user_dict() -> dict[str, Any] | None:
    if not is_logged_in():
        return None
    if is_admin():
        return {"role": "admin", "display_name": session.get("display_name", "Admin")}
    if is_coach():
        return {"role": "coach", "display_name": session.get("display_name", "Coach")}
    return {
        "role": "player",
        "team_id": session.get("team_id"),
        "jersey_number": session.get("jersey_number"),
        "display_name": session.get("display_name", ""),
        "team_name": session.get("team_name", ""),
    }


def player_can_access(team_id: int, jersey_number: int) -> bool:
    if is_coach():
        return True
    if is_player():
        return session.get("team_id") == team_id and session.get("jersey_number") == jersey_number
    return False


def login_required(view: Callable):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not is_logged_in():
            if request.path.startswith("/api/"):
                return jsonify({"error": "Authentication required"}), 401
            return redirect(url_for("login", next=request.path))
        return view(*args, **kwargs)

    return wrapped


def coach_required(view: Callable):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not is_logged_in():
            if request.path.startswith("/api/"):
                return jsonify({"error": "Authentication required"}), 401
            return redirect(url_for("login"))
        if not is_coach():
            return jsonify({"error": "Coach access only"}), 403
        return view(*args, **kwargs)

    return wrapped
