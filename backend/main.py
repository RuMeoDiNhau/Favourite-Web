from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend.api.routes import router
from backend.services.db_models import init_db
from backend.services.s3_service import download_all_embeddings
from backend.services.logging_service import logger

init_db()
download_all_embeddings()

app = FastAPI(title='Fav Web Face Recognition')

@app.on_event("startup")
def on_startup():
    logger.info("FastAPI Web Application starting up...")

@app.on_event("shutdown")
def on_shutdown():
    logger.info("FastAPI Web Application shutting down...")


# Configure CORS to allow access from any origin (e.g. S3 static site)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

static_dir = Path(__file__).resolve().parents[1] / 'static'
app.mount('/static', StaticFiles(directory=str(static_dir.resolve())), name='static')

from backend.services.db_models import DATA_RAW_DIR
app.mount('/raw_images', StaticFiles(directory=str(DATA_RAW_DIR.resolve())), name='raw_images')

@app.get('/')
def root():
    return {'message': 'Backend is running'}

