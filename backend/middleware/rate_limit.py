"""Minimal in-process rate limiter middleware.

Tracks request counts per client IP in a dict with a sliding window. This
is sufficient for single-process dev/small deployments — for multiple
workers behind a load balancer, swap this for slowapi or an external
counter (Redis). Keeping it in-process avoids a new runtime dependency
for Phase 1 hardening.

Limits are path-pattern based; only paths listed in RATE_LIMITS are gated
(because the auth/login and recognize endpoints are the obvious abuse
targets). Unlisted paths run unrestricted, so this middleware adds no
overhead to the common case.
"""

import time
from collections import deque
from pathlib import Path

from fastapi import Request
from fastapi.responses import JSONResponse

# path_prefix -> (max_requests, window_seconds)
RATE_LIMITS: dict = {
    '/api/v1/recognize': (10, 60),         # 10 attempts / minute / IP
    '/api/v1/auth/login': (10, 60),         # 10 password attempts / minute / IP
    '/api/v1/auth/login-face': (15, 60),    # 15 face attempts / minute / IP
    '/api/v1/users': (5, 60),              # 5 registrations / minute / IP
}

# client_ip -> deque[float] of recent request timestamps
_request_log: dict = {}


def _is_under_limit(client_ip: str, path: str) -> tuple[bool, int]:
    """Return (under_limit, retry_after_seconds)."""
    matched_limit = None
    for prefix, limit in RATE_LIMITS.items():
        if path.startswith(prefix):
            matched_limit = limit
            break
    if matched_limit is None:
        return True, 0

    max_reqs, window_secs = matched_limit
    now = time.monotonic()
    cutoff = now - window_secs
    log = _request_log.setdefault((client_ip, prefix), deque())
    # Drop timestamps outside the window.
    while log and log[0] < cutoff:
        log.popleft()
    if len(log) >= max_reqs:
        retry_after = max(1, int(window_secs - (now - log[0])))
        return False, retry_after
    log.append(now)
    return True, 0


def _client_ip(request: Request) -> str:
    """Best-effort client IP. Behind a reverse proxy, set X-Forwarded-For
    and prefer that; otherwise use the direct peer. FastAPI/Starlette
    populate `request.client.host` automatically."""
    xff = request.headers.get('x-forwarded-for')
    if xff:
        return xff.split(',')[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return 'unknown'


async def rate_limit_middleware(request: Request, call_next):
    """Apply per-IP rate limits only to paths in RATE_LIMITS."""
    path = request.url.path
    # Only check the configured prefixes; everything else bypasses.
    needs_check = any(path.startswith(p) for p in RATE_LIMITS.keys())
    if needs_check:
        ip = _client_ip(request)
        ok, retry_after = _is_under_limit(ip, path)
        if not ok:
            return JSONResponse(
                status_code=429,
                content={
                    'detail': 'Quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.',
                    'retry_after': retry_after,
                },
                headers={'Retry-After': str(retry_after)},
            )
    return await call_next(request)
