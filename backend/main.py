from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend.api.routes import router
from backend.services.db_models import init_db
from backend.services.s3_service import download_all_embeddings
from backend.services.logging_service import logger
from backend.middleware.rate_limit import rate_limit_middleware

init_db()
download_all_embeddings()

app = FastAPI(title='Fav Web Face Recognition')

@app.on_event("startup")
def on_startup():
    logger.info("FastAPI Web Application starting up...")

@app.on_event("shutdown")
def on_shutdown():
    logger.info("FastAPI Web Application shutting down...")


# CORS: cookie-based auth requires `allow_credentials=True`, which
# forbids a wildcard origin (browsers reject the combination). List
# dev FE origins explicitly so the cookie flows with
# `withCredentials`. Add production origins when deployed.
DEV_ORIGINS = [
    'http://localhost:5173',   # Vite default
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
]
PROD_ORIGINS: list[str] = []   # set when the FE is deployed
ALLOWED_ORIGINS = DEV_ORIGINS + PROD_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiter MUST be added after CORS so 429 responses also carry the
# right CORS headers (otherwise browsers swallow them as a CORS error).
app.middleware("http")(rate_limit_middleware)

app.include_router(router)

static_dir = Path(__file__).resolve().parents[1] / 'static'
app.mount('/static', StaticFiles(directory=str(static_dir.resolve())), name='static')

from backend.services.db_models import DATA_RAW_DIR
app.mount('/raw_images', StaticFiles(directory=str(DATA_RAW_DIR.resolve())), name='raw_images')

@app.get('/')
def root():
    return {'message': 'Backend is running'}

