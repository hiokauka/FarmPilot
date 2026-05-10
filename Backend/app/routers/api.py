from __future__ import annotations

from datetime import datetime
import time

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    ActivePlantRecord,
    CropProfileRecord,
)

router = APIRouter(prefix="/api")


class CreatePlantPayload(BaseModel):
    customLabel: str
    cropProfileId: str


def plant_to_dict(p: ActivePlantRecord) -> dict:
    return {
        "id": p.id,
        "customLabel": p.custom_label,
        "cropProfileId": p.crop_profile_id,
        "status": p.status,
        "plantedAt": p.planted_at.isoformat(),
        "currentStage": p.current_stage,
        "dayCount": p.day_count,
        "healthScore": p.health_score,
        "predictedYield": p.predicted_yield,
        "location": p.location,
        "currentMetrics": {
            "temperature": p.temperature,
            "humidity": p.humidity,
            "soilMoisture": p.soil_moisture,
            "ph": p.ph,
            "dli": p.dli,
        },
    }


def profile_to_dict(c: CropProfileRecord) -> dict:
    return {
        "id": c.id,
        "name": c.name,
        "scientificName": c.scientific_name,
        "expectedLifespanDays": c.expected_lifespan_days,
        "stages": [
            {
                "name": s.name,
                "startDay": s.start_day,
                "endDay": s.end_day,
                "optimalMetrics": {
                    "temperature": {"min": s.temperature_min, "max": s.temperature_max, "optimal": s.temperature_optimal},
                    "humidity": {"min": s.humidity_min, "max": s.humidity_max, "optimal": s.humidity_optimal},
                    "soilMoisture": {"min": s.soil_moisture_min, "max": s.soil_moisture_max, "optimal": s.soil_moisture_optimal},
                    "ph": {"min": s.ph_min, "max": s.ph_max, "optimal": s.ph_optimal},
                    "dli": {"min": s.dli_min, "max": s.dli_max, "optimal": s.dli_optimal},
                },
                "aiCultivationNotes": s.ai_cultivation_notes or [],
                "scheduleRules": {"irrigationCycle": s.irrigation_cycle, "targetDli": s.target_dli},
            }
            for s in c.stages
        ],
    }


@router.get("/plants")
def list_plants(db: Session = Depends(get_db)):
    plants = db.query(ActivePlantRecord).all()
    return [plant_to_dict(p) for p in plants]


@router.get("/profiles")
def list_profiles(db: Session = Depends(get_db)):
    profiles = db.query(CropProfileRecord).all()
    return [profile_to_dict(p) for p in profiles]


@router.get("/plants/{plant_id}")
def get_plant(plant_id: str, db: Session = Depends(get_db)):
    p = db.get(ActivePlantRecord, plant_id)
    if not p:
        raise HTTPException(status_code=404, detail="Plant not found")
    return plant_to_dict(p)


@router.post("/plants")
def create_plant(payload: CreatePlantPayload, db: Session = Depends(get_db)):
    crop = db.get(CropProfileRecord, payload.cropProfileId)
    if not crop:
        raise HTTPException(status_code=404, detail="Crop profile not found")

    first_stage = crop.stages[0] if crop.stages else None
    if not first_stage:
        raise HTTPException(status_code=400, detail="Crop profile has no growth stages")

    plant = ActivePlantRecord(
        id=f"ap-{int(time.time() * 1000)}",
        custom_label=payload.customLabel,
        crop_profile_id=crop.id,
        status="Growing",
        planted_at=datetime.utcnow(),
        current_stage=first_stage.name,
        day_count=1,
        health_score=100,
        predicted_yield=0,
        location="Unassigned",
        temperature=first_stage.temperature_optimal,
        humidity=first_stage.humidity_optimal,
        soil_moisture=first_stage.soil_moisture_optimal,
        ph=first_stage.ph_optimal,
        dli=first_stage.dli_optimal,
    )
    db.add(plant)
    db.commit()
    db.refresh(plant)
    return plant_to_dict(plant)
