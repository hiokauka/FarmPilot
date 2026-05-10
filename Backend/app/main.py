from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.database import Base, engine, SessionLocal
from app.seed import seed_database


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        seed_database(db)

    yield


app = FastAPI(title="FarmPilot API", version="0.1.0", lifespan=lifespan)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
