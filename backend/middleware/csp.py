"""Content Security Policy via HTTP response header.

`frame-ancestors` is the one directive that browsers deliberately
ignore when it appears in a `<meta http-equiv>` tag — only the
HTTP header version is honored (per the CSP spec, §6.2.3). The
previous setup declared it in `frontend/index.html`'s meta CSP,
which meant the clickjacking protection was silently a no-op.

We also re-declare the other directives here so we have a single
source of truth on the BE. The FE meta tag still works for
sub-resources (script-src, style-src, etc.), but the header is
authoritative for the iframe-embed control.
"""
from fastapi import Request

# `frame-src http://localhost:8000 https:` — the in-app game iframe
# overlay loads game files from the BE (dev) or any HTTPS origin
# (prod). `frame-ancestors 'none'` forbids other sites from
# embedding this app in an iframe. `default-src 'self'` is the
# baseline fallback; everything else inherits unless overridden.
CSP_VALUE = (
    "default-src 'self'; "
    "frame-src http://localhost:8000 https:; "
    "frame-ancestors 'none'; "
    "script-src 'self' 'unsafe-inline'; "
    "style-src 'self' 'unsafe-inline'; "
    "img-src 'self' data: https:; "
    "connect-src 'self' http://localhost:8000"
)


async def csp_middleware(request: Request, call_next):
    """Attach the CSP header to every response.

    We set it on the response rather than via the FastAPI middleware
    decorator so it runs after CORS and rate-limit middleware have
    already shaped the response — that way the header is added to
    both successful and error responses (429s, 401s, etc.) without
    each middleware having to forward it manually.
    """
    response = await call_next(request)
    response.headers['Content-Security-Policy'] = CSP_VALUE
    return response
