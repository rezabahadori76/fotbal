"""Sign in to Football Manager (Academy Hub) from the PitchIQ Flask app."""

from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from http.cookiejar import CookieJar


def _hub_base(upstream_base: str) -> str:
    return upstream_base.rstrip("/") + "/hub"


def _rewrite_cookie_path(set_cookie: str) -> str:
    if "Path=/" in set_cookie and "Path=/hub" not in set_cookie:
        return set_cookie.replace("Path=/", "Path=/hub", 1)
    return set_cookie


DEMO_PASSWORD = "password123"


def academy_hub_login(
    upstream_base: str, email: str, password: str | None = None
) -> tuple[str | None, list[str], str | None]:
    """
    Authenticate against NextAuth on the upstream Next.js server.

    Football Manager uses the demo password server-side when none is supplied.

    Returns (home_path e.g. /hub/admin, raw Set-Cookie header values, error message).
    """
    email = email.strip().lower()
    if not email:
        return None, [], "Email is required."
    if not password:
        password = DEMO_PASSWORD

    hub = _hub_base(upstream_base)
    jar = CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))

    try:
        csrf_req = urllib.request.Request(f"{hub}/api/auth/csrf")
        csrf_body = opener.open(csrf_req, timeout=20).read()
        csrf = json.loads(csrf_body)["csrfToken"]
    except (urllib.error.URLError, KeyError, json.JSONDecodeError) as exc:
        return None, [], f"Football Manager is not running ({exc}). Start with: python run_dev.py"

    payload = urllib.parse.urlencode(
        {
            "csrfToken": csrf,
            "email": email,
            "password": password,
            "callbackUrl": f"{hub}/",
            "json": "true",
        }
    ).encode()

    try:
        login_req = urllib.request.Request(
            f"{hub}/api/auth/callback/credentials",
            data=payload,
            method="POST",
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        login_resp = opener.open(login_req, timeout=20)
        login_body = json.loads(login_resp.read().decode())
        if login_body.get("error"):
            return None, [], "Invalid email or password."
    except urllib.error.HTTPError:
        return None, [], "Invalid email or password."
    except (urllib.error.URLError, json.JSONDecodeError) as exc:
        return None, [], f"Football Manager login failed ({exc})."

    session_cookies = [c for c in jar if c.name == "next-auth.session-token"]
    if not session_cookies:
        return None, [], "Invalid email or password."

    role = "player"
    try:
        session_req = urllib.request.Request(f"{hub}/api/auth/session")
        session_body = opener.open(session_req, timeout=20).read()
        session = json.loads(session_body)
        role = (session.get("user") or {}).get("role", "player").lower()
    except (urllib.error.URLError, json.JSONDecodeError):
        pass

    home = {
        "admin": "/hub/admin",
        "coach": "/hub/coach",
        "player": "/hub/player",
    }.get(role, "/hub/")

    set_cookies: list[str] = []
    for cookie in jar:
        if cookie.name.startswith("next-auth."):
            set_cookies.append(
                _rewrite_cookie_path(
                    f"{cookie.name}={cookie.value}; Path=/hub; HttpOnly; SameSite=Lax"
                )
            )

    return home, set_cookies, None


def lookup_fm_player(
    upstream_base: str,
    jersey_number: int,
    name: str | None = None,
) -> dict | None:
    """Resolve a PitchIQ jersey number to a Football Manager player profile."""
    hub = _hub_base(upstream_base)
    params: dict[str, str] = {"jerseyNo": str(jersey_number)}
    if name:
        params["name"] = name.strip()
    url = f"{hub}/api/players/lookup?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            return None
        return None
    except (urllib.error.URLError, json.JSONDecodeError):
        return None


def ensure_fm_player(
    upstream_base: str,
    jersey_number: int,
    name: str,
    *,
    position: str | None = None,
    squad: str | None = None,
) -> dict | None:
    """Find or create a Football Manager player profile from PitchIQ data."""
    existing = lookup_fm_player(upstream_base, jersey_number, name)
    if existing:
        return existing

    hub = _hub_base(upstream_base)
    payload = {
        "jerseyNo": jersey_number,
        "name": name.strip(),
    }
    if position:
        payload["position"] = position.strip()
    if squad:
        payload["squad"] = squad.strip()

    req = urllib.request.Request(
        f"{hub}/api/players/ensure",
        data=json.dumps(payload).encode(),
        method="POST",
        headers={"Content-Type": "application/json", "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode())
    except (urllib.error.HTTPError, urllib.error.URLError, json.JSONDecodeError):
        return None
