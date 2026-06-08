#!/usr/bin/env python3
"""Quick smoke test for integrated PitchIQ + Soccer Manager SSO."""

from __future__ import annotations

import http.cookiejar
import json
import urllib.parse
import urllib.request

BASE = "http://127.0.0.1:5050"

HUB_USERS = (
    ("admin", "admin@academy.com", "/hub/admin"),
    ("coach", "coach@academy.com", "/hub/coach"),
    ("player", "player@academy.com", "/hub/player"),
)


def fetch(
    url: str,
    *,
    method: str = "GET",
    data: dict | None = None,
    opener=None,
    headers: dict | None = None,
) -> tuple[int, str, bytes]:
    body = None
    req_headers = dict(headers or {})
    if data is not None:
        body = urllib.parse.urlencode(data).encode()
        req_headers.setdefault("Content-Type", "application/x-www-form-urlencoded")
    req = urllib.request.Request(url, data=body, method=method, headers=req_headers)
    with opener.open(req, timeout=20) as resp:
        return resp.status, resp.geturl(), resp.read()


def pitchiq_login(opener, role: str) -> str | None:
    if role == "admin":
        payload = {"role": "admin"}
    elif role == "coach":
        payload = {"role": "coach", "username": "coach", "password": "coach123"}
    else:
        payload = {
            "role": "player",
            "team_id": "1",
            "jersey_number": "26",
            "password": "player123",
        }
    try:
        status, final, _ = fetch(f"{BASE}/login", method="POST", data=payload, opener=opener)
        if status >= 400 or final.rstrip("/") != BASE.rstrip("/"):
            return f"PitchIQ {role} login -> {status} final={final}"
    except OSError as exc:
        return f"PitchIQ {role} login -> {exc}"
    return None


def test_hub_sso(opener, role: str, expected_path: str) -> str | None:
    try:
        status, final, body = fetch(f"{BASE}/hub/enter", opener=opener)
        if status >= 400 or expected_path not in final:
            return f"hub SSO ({role}) -> {status} final={final}"
        html = body.decode("utf-8", errors="ignore")
        if "Sign in to manage your squad" in html:
            return f"hub SSO ({role}) -> still on Academy login page"
    except OSError as exc:
        return f"hub SSO ({role}) -> {exc}"
    return None


def main() -> int:
    errors: list[str] = []

    jar = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))

    gzip_headers = {"Accept-Encoding": "gzip, deflate, br"}
    for url in (f"{BASE}/login", f"{BASE}/hub/enter"):
        try:
            status, _, body = fetch(url, opener=opener, headers=gzip_headers)
            if status >= 400:
                errors.append(f"GET {url} -> {status}")
        except OSError as exc:
            errors.append(f"GET {url} -> {exc}")

    for role, _, expected in HUB_USERS:
        role_jar = http.cookiejar.CookieJar()
        role_opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(role_jar))
        err = pitchiq_login(role_opener, role)
        if err:
            errors.append(err)
            continue
        err = test_hub_sso(role_opener, role, expected)
        if err:
            errors.append(err)
        try:
            status, final, _ = fetch(f"{BASE}/hub/login", opener=role_opener)
            if "/hub/enter" not in final and expected not in final:
                errors.append(f"/hub/login redirect ({role}) -> {final}")
        except OSError as exc:
            errors.append(f"/hub/login redirect ({role}) -> {exc}")

    if errors:
        print("Smoke test FAILED:")
        for err in errors:
            print(f"  - {err}")
        return 1

    print("Smoke test OK:")
    print("  - PitchIQ login: admin, coach, player")
    print("  - Soccer Manager SSO via /hub/enter (no login page)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
