"""Reverse-proxy Academy Hub (Next.js) under /hub on the PitchIQ Flask app."""

from __future__ import annotations

import urllib.error
import urllib.request
from typing import Iterable
from urllib.parse import urlparse

from flask import Request, Response, request

HOP_BY_HOP = frozenset(
    {
        "connection",
        "keep-alive",
        "proxy-authenticate",
        "proxy-authorization",
        "te",
        "trailers",
        "transfer-encoding",
        "upgrade",
    }
)


def _public_root(req: Request) -> str:
    return req.url_root.rstrip("/")


def _rewrite_upstream_urls(value: str, upstream_origin: str, public_root: str) -> str:
    if value.startswith(upstream_origin):
        return public_root + value[len(upstream_origin) :]
    return value


def _forward_headers(req: Request, upstream_host: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for key, value in req.headers:
        lk = key.lower()
        if lk in HOP_BY_HOP or lk in ("host", "accept-encoding"):
            continue
        out[key] = value
    # Avoid passing gzip/br bodies through unchanged (causes binary garbage in browser).
    out["Accept-Encoding"] = "identity"
    out["Host"] = upstream_host
    out["X-Forwarded-Host"] = req.host
    out["X-Forwarded-Proto"] = req.scheme
    if req.remote_addr:
        out["X-Forwarded-For"] = req.remote_addr
    return out


def _rewrite_set_cookie(value: str) -> str:
    if "Path=/" in value and "Path=/hub" not in value:
        return value.replace("Path=/", "Path=/hub", 1)
    return value


def _rewrite_response_body(body: bytes, content_type: str | None) -> bytes:
    if not content_type:
        return body
    ct = content_type.split(";", 1)[0].strip().lower()
    if ct not in (
        "text/html",
        "text/css",
        "application/javascript",
        "text/javascript",
        "application/json",
    ):
        return body
    text = body.decode("utf-8", errors="ignore")
    # Safety net when any asset URL misses the Next.js basePath prefix.
    for needle, repl in (
        ('"/_next/', '"/hub/_next/'),
        ("'/_next/", "'/hub/_next/"),
        ('"/api/auth/', '"/hub/api/auth/'),
        ("'/api/auth/", "'/hub/api/auth/"),
        ('"/background.png', '"/hub/background.png'),
    ):
        text = text.replace(needle, repl)
    return text.encode("utf-8")


def _response_headers(upstream_headers, upstream_origin: str, public_root: str) -> list[tuple[str, str]]:
    headers: list[tuple[str, str]] = []
    for key, value in upstream_headers.items():
        lk = key.lower()
        if lk in HOP_BY_HOP or lk in ("content-encoding", "content-length"):
            continue
        if lk == "location":
            value = _rewrite_upstream_urls(value, upstream_origin, public_root)
        elif lk == "set-cookie":
            value = _rewrite_set_cookie(value)
        headers.append((key, value))
    return headers


def _build_proxy_response(body: bytes, status: int, headers: list[tuple[str, str]]) -> Response:
    content_type = None
    for key, value in headers:
        if key.lower() == "content-type":
            content_type = value
            break
    body = _rewrite_response_body(body, content_type)
    return Response(body, status=status, headers=headers)


def proxy_to_academy_hub(upstream_base: str, subpath: str = "") -> Response:
    upstream_base = upstream_base.rstrip("/")
    parsed = urlparse(upstream_base)
    upstream_origin = f"{parsed.scheme}://{parsed.netloc}"
    upstream_host = parsed.netloc

    target = f"{upstream_base}/hub"
    if subpath:
        target += f"/{subpath.lstrip('/')}"
    if request.query_string:
        target += f"?{request.query_string.decode()}"

    data = None if request.method in ("GET", "HEAD") else request.get_data()
    upstream_req = urllib.request.Request(
        target,
        data=data,
        method=request.method,
        headers=_forward_headers(request, upstream_host),
    )

    public_root = _public_root(request)

    try:
        with urllib.request.urlopen(upstream_req, timeout=120) as upstream:
            body = upstream.read()
            headers = _response_headers(upstream.headers, upstream_origin, public_root)
            return _build_proxy_response(body, upstream.status, headers)
    except urllib.error.HTTPError as exc:
        body = exc.read()
        headers = _response_headers(exc.headers, upstream_origin, public_root)
        return _build_proxy_response(body, exc.code, headers)
    except urllib.error.URLError as exc:
        return Response(
            (
                "Academy Hub is not running. Start it with: cd academy_hub && npm run dev\n"
                f"Details: {exc.reason}"
            ),
            status=503,
            mimetype="text/plain",
        )
