from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.routers.api import router as api_router

from app.database import Base, engine, SessionLocal
from app.seed import seed_database


def _ensure_growth_stage_columns() -> None:
    # Lightweight SQLite-safe migration so local existing DBs get new schedule fields.
    with engine.begin() as conn:
        rows = conn.execute(text("PRAGMA table_info(growth_stages)")).all()
        existing = {r[1] for r in rows}
        if "irrigation_cycle" not in existing:
            conn.execute(text("ALTER TABLE growth_stages ADD COLUMN irrigation_cycle VARCHAR(80) NOT NULL DEFAULT 'Every 6 hours (5m)'"))
        if "target_dli" not in existing:
            conn.execute(text("ALTER TABLE growth_stages ADD COLUMN target_dli FLOAT NOT NULL DEFAULT 12"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _ensure_growth_stage_columns()

    with SessionLocal() as db:
        seed_database(db)

    yield


app = FastAPI(title="FarmPilot API", version="0.1.0", lifespan=lifespan)

# Allow local frontend dev to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://127.0.0.1:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
