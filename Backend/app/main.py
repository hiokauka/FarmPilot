from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.routers.api import router as api_router

from app.database import Base, engine, SessionLocal
from app.seed import seed_database


def _ensure_growth_stage_columns() -> None:
    # Lightweight SQLite-safe migration so local existing DBs get new fields.
    with engine.begin() as conn:
        # growth_stages table
        rows = conn.execute(text("PRAGMA table_info(growth_stages)")).all()
        existing = {r[1] for r in rows}
        if "irrigation_cycle" not in existing:
            conn.execute(text("ALTER TABLE growth_stages ADD COLUMN irrigation_cycle VARCHAR(80) NOT NULL DEFAULT 'Every 6 hours (5m)'"))
        if "target_dli" not in existing:
            conn.execute(text("ALTER TABLE growth_stages ADD COLUMN target_dli FLOAT NOT NULL DEFAULT 12"))

        # agent_tasks table 
        rows_tasks = conn.execute(text("PRAGMA table_info(agent_tasks)")).all()
        existing_tasks = {r[1] for r in rows_tasks}
        if "metric_adjustments" not in existing_tasks:
            conn.execute(text("ALTER TABLE agent_tasks ADD COLUMN metric_adjustments JSON NULL"))


import asyncio
from app.models import ActivePlantRecord
from app.services.agent_engine import run_agent_analysis_core

async def background_analysis_loop():
    while True:
        await asyncio.sleep(60) # Run every 60 seconds
        try:
            with SessionLocal() as db:
                plants = db.query(ActivePlantRecord).all()
                for plant in plants:
                    print(f"Running periodic background analysis for plant: {plant.custom_label}")
                    run_agent_analysis_core(db, plant, is_manual=False)
        except Exception as e:
            print(f"Background loop error: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _ensure_growth_stage_columns()

    with SessionLocal() as db:
        seed_database(db)

    # Start the periodic background loop
    task = asyncio.create_task(background_analysis_loop())

    yield

    task.cancel()


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
    
# Trigger reload for new seed data
