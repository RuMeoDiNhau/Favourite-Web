from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from backend.api.routes import router
from backend.services.db_models import init_db
from backend.services.s3_service import download_all_embeddings

init_db()
download_all_embeddings()

app = FastAPI(title='Fav Web Face Recognition')
app.include_router(router)

static_dir = Path(__file__).resolve().parents[1] / 'static'
app.mount('/static', StaticFiles(directory=str(static_dir.resolve())), name='static')

@app.get('/')
def root():
    return {'message': 'Backend is running'}
