from __future__ import annotations
import asyncio

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

        # active_plants table
        rows_plants = conn.execute(text("PRAGMA table_info(active_plants)")).all()
        existing_plants = {r[1] for r in rows_plants}
        if "ai_custom_rules" not in existing_plants:
            conn.execute(text("ALTER TABLE active_plants ADD COLUMN ai_custom_rules JSON NULL"))
        if "last_analysis_at" not in existing_plants:
            conn.execute(text("ALTER TABLE active_plants ADD COLUMN last_analysis_at DATETIME NULL"))

        # agent_tasks table 
        rows_tasks = conn.execute(text("PRAGMA table_info(agent_tasks)")).all()
        existing_tasks = {r[1] for r in rows_tasks}
        if "metric_adjustments" not in existing_tasks:
            conn.execute(text("ALTER TABLE agent_tasks ADD COLUMN metric_adjustments JSON NULL"))
        if "proposed_rules" not in existing_tasks:
            conn.execute(text("ALTER TABLE agent_tasks ADD COLUMN proposed_rules JSON NULL"))


import asyncio
from app.models import ActivePlantRecord
from app.services.agent_engine import run_agent_analysis_core

def _run_threaded_analysis(plant_id: str):
    """Execute the blocking analytical stack inside a segregated worker thread."""
    with SessionLocal() as db:
        plant = db.get(ActivePlantRecord, plant_id)
        if plant:
            run_agent_analysis_core(db, plant, is_manual=False)

async def background_analysis_loop():
    while True:
        await asyncio.sleep(10) # Run every 10 seconds
        try:
            # 1. Snapshot ID population quickly on main thread
            with SessionLocal() as db:
                plant_ids = [p.id for p in db.query(ActivePlantRecord).all()]
            
            # 2. Iterate sequentially, but offload EACH blocking execution to standard thread pools
            for p_id in plant_ids:
                # await asyncio.to_thread blocks the local loop progression, 
                # but FREES UP the actual main async event loop to serve other API requests!
                await asyncio.to_thread(_run_threaded_analysis, p_id)
                
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

    # Start the IoT Sync background task
    from app.services.iot_sync import sync_sensors_task
    sync_task = asyncio.create_task(sync_sensors_task())

    yield
    
    # Clean up
    sync_task.cancel()
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
