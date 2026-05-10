from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.entities import (
    ActivePlantRecord,
    AgentTaskRecord,
    CropProfileRecord,
    GrowthStageRecord,
    NotificationRecord,
    SensorRecord,
)


def _add_stage(crop: CropProfileRecord, stage: dict) -> GrowthStageRecord:
    metrics = stage["optimalMetrics"]
    rules = stage["scheduleRules"]
    return GrowthStageRecord(
        crop_profile=crop,
        name=stage["name"],
        start_day=stage["startDay"],
        end_day=stage["endDay"],
        temperature_min=metrics["temperature"]["min"],
        temperature_max=metrics["temperature"]["max"],
        temperature_optimal=metrics["temperature"]["optimal"],
        humidity_min=metrics["humidity"]["min"],
        humidity_max=metrics["humidity"]["max"],
        humidity_optimal=metrics["humidity"]["optimal"],
        soil_moisture_min=metrics["soilMoisture"]["min"],
        soil_moisture_max=metrics["soilMoisture"]["max"],
        soil_moisture_optimal=metrics["soilMoisture"]["optimal"],
        ph_min=metrics["ph"]["min"],
        ph_max=metrics["ph"]["max"],
        ph_optimal=metrics["ph"]["optimal"],
        dli_min=metrics["dli"]["min"],
        dli_max=metrics["dli"]["max"],
        dli_optimal=metrics["dli"]["optimal"],
        ai_cultivation_notes=stage["aiCultivationNotes"],
        irrigation_cycle=rules["irrigationCycle"],
        target_dli=rules["targetDli"],
    )


def seed_database(db: Session) -> None:
    profiles_data = [
        {
            "id": "prof-lettuce",
            "name": "Butterhead Lettuce",
            "scientificName": "Lactuca sativa",
            "expectedLifespanDays": 45,
            "stages": [
                {
                    "name": "Seedling", "startDay": 0, "endDay": 14,
                    "optimalMetrics": {
                        "temperature": {"min": 18, "max": 22, "optimal": 20},
                        "humidity": {"min": 60, "max": 75, "optimal": 65},
                        "soilMoisture": {"min": 70, "max": 85, "optimal": 80},
                        "ph": {"min": 5.8, "max": 6.2, "optimal": 6.0},
                        "dli": {"min": 10, "max": 14, "optimal": 12},
                    },
                    "aiCultivationNotes": [
                        "Keep humidity high to prevent seed coat sticking.",
                        "Ensure gentle airflow to strengthen early stems.",
                    ],
                    "scheduleRules": {"irrigationCycle": "Every 6 hours (5m)", "targetDli": 12},
                },
                {
                    "name": "Vegetative", "startDay": 15, "endDay": 35,
                    "optimalMetrics": {
                        "temperature": {"min": 16, "max": 24, "optimal": 21},
                        "humidity": {"min": 50, "max": 70, "optimal": 60},
                        "soilMoisture": {"min": 60, "max": 80, "optimal": 70},
                        "ph": {"min": 5.8, "max": 6.5, "optimal": 6.2},
                        "dli": {"min": 12, "max": 17, "optimal": 15},
                    },
                    "aiCultivationNotes": ["Watch out for tip burn if DLI exceeds 17.", "Maintain EC around 1.2-1.6."],
                    "scheduleRules": {"irrigationCycle": "Every 4 hours (10m)", "targetDli": 15},
                },
                {
                    "name": "Harvest", "startDay": 36, "endDay": 45,
                    "optimalMetrics": {
                        "temperature": {"min": 15, "max": 20, "optimal": 18},
                        "humidity": {"min": 40, "max": 60, "optimal": 50},
                        "soilMoisture": {"min": 50, "max": 70, "optimal": 60},
                        "ph": {"min": 6.0, "max": 6.5, "optimal": 6.2},
                        "dli": {"min": 12, "max": 15, "optimal": 14},
                    },
                    "aiCultivationNotes": ["Drop temp by 2 deg C at night to improve crispness.", "Reduce irrigation frequency."],
                    "scheduleRules": {"irrigationCycle": "Every 8 hours (10m)", "targetDli": 14},
                },
            ],
        },
        {
            "id": "prof-strawberry",
            "name": "Albion Strawberry",
            "scientificName": "Fragaria x ananassa",
            "expectedLifespanDays": 90,
            "stages": [
                {
                    "name": "Vegetative", "startDay": 0, "endDay": 30,
                    "optimalMetrics": {
                        "temperature": {"min": 18, "max": 24, "optimal": 21},
                        "humidity": {"min": 60, "max": 75, "optimal": 65},
                        "soilMoisture": {"min": 60, "max": 75, "optimal": 70},
                        "ph": {"min": 5.5, "max": 6.2, "optimal": 5.8},
                        "dli": {"min": 15, "max": 20, "optimal": 18},
                    },
                    "aiCultivationNotes": [
                        "Ensure high light intensity for strong crown development.",
                        "Keep roots moist but not waterlogged.",
                    ],
                    "scheduleRules": {"irrigationCycle": "Every 4 hours (10m)", "targetDli": 18},
                },
                {
                    "name": "Flowering", "startDay": 31, "endDay": 60,
                    "optimalMetrics": {
                        "temperature": {"min": 16, "max": 22, "optimal": 20},
                        "humidity": {"min": 50, "max": 65, "optimal": 60},
                        "soilMoisture": {"min": 65, "max": 80, "optimal": 75},
                        "ph": {"min": 5.5, "max": 6.2, "optimal": 5.8},
                        "dli": {"min": 20, "max": 25, "optimal": 22},
                    },
                    "aiCultivationNotes": ["Pollination via airflow or insects is critical.", "Increase potassium in nutrient solution."],
                    "scheduleRules": {"irrigationCycle": "Every 3 hours (15m)", "targetDli": 22},
                },
                {
                    "name": "Fruiting", "startDay": 61, "endDay": 90,
                    "optimalMetrics": {
                        "temperature": {"min": 15, "max": 21, "optimal": 18},
                        "humidity": {"min": 45, "max": 60, "optimal": 50},
                        "soilMoisture": {"min": 65, "max": 75, "optimal": 70},
                        "ph": {"min": 5.5, "max": 6.0, "optimal": 5.7},
                        "dli": {"min": 18, "max": 22, "optimal": 20},
                    },
                    "aiCultivationNotes": ["Lower night temps to increase sugar content (Brix).", "Monitor for grey mold (Botrytis)."],
                    "scheduleRules": {"irrigationCycle": "Every 4 hours (15m)", "targetDli": 20},
                },
            ],
        },
        {
            "id": "prof-tomato",
            "name": "Cherry Tomato",
            "scientificName": "Solanum lycopersicum",
            "expectedLifespanDays": 120,
            "stages": [
                {
                    "name": "Vegetative", "startDay": 0, "endDay": 40,
                    "optimalMetrics": {
                        "temperature": {"min": 20, "max": 28, "optimal": 24},
                        "humidity": {"min": 60, "max": 70, "optimal": 65},
                        "soilMoisture": {"min": 60, "max": 80, "optimal": 70},
                        "ph": {"min": 6.0, "max": 6.8, "optimal": 6.3},
                        "dli": {"min": 20, "max": 30, "optimal": 25},
                    },
                    "aiCultivationNotes": ["Prune side shoots (suckers) regularly.", "Ensure strong support structure."],
                    "scheduleRules": {"irrigationCycle": "Every 4 hours (15m)", "targetDli": 25},
                },
                {
                    "name": "Flowering", "startDay": 41, "endDay": 80,
                    "optimalMetrics": {
                        "temperature": {"min": 18, "max": 26, "optimal": 22},
                        "humidity": {"min": 50, "max": 65, "optimal": 55},
                        "soilMoisture": {"min": 70, "max": 85, "optimal": 75},
                        "ph": {"min": 6.0, "max": 6.5, "optimal": 6.2},
                        "dli": {"min": 25, "max": 35, "optimal": 30},
                    },
                    "aiCultivationNotes": ["Vibrating flower clusters improves fruit set.", "High calcium prevents blossom end rot."],
                    "scheduleRules": {"irrigationCycle": "Every 3 hours (20m)", "targetDli": 30},
                },
            ],
        },
        {
            "id": "prof-basil",
            "name": "Genovese Basil",
            "scientificName": "Ocimum basilicum",
            "expectedLifespanDays": 60,
            "stages": [
                {
                    "name": "Vegetative", "startDay": 0, "endDay": 60,
                    "optimalMetrics": {
                        "temperature": {"min": 21, "max": 30, "optimal": 25},
                        "humidity": {"min": 50, "max": 70, "optimal": 60},
                        "soilMoisture": {"min": 60, "max": 80, "optimal": 70},
                        "ph": {"min": 6.0, "max": 7.0, "optimal": 6.5},
                        "dli": {"min": 12, "max": 18, "optimal": 15},
                    },
                    "aiCultivationNotes": ["Pinch off flower buds to maintain leaf production.", "Sensitive to cold; avoid temps below 15 deg C."],
                    "scheduleRules": {"irrigationCycle": "Every 6 hours (10m)", "targetDli": 15},
                },
            ],
        },
    ]

    crops: dict[str, CropProfileRecord] = {}
    for profile in profiles_data:
        crop = db.get(CropProfileRecord, profile["id"])
        if crop is None:
            crop = CropProfileRecord(
                id=profile["id"],
                name=profile["name"],
                scientific_name=profile["scientificName"],
                expected_lifespan_days=profile["expectedLifespanDays"],
            )
            db.add(crop)
            db.flush()
        else:
            crop.name = profile["name"]
            crop.scientific_name = profile["scientificName"]
            crop.expected_lifespan_days = profile["expectedLifespanDays"]

        crops[crop.id] = crop

        existing_stage_map = {(s.name, s.start_day, s.end_day): s for s in crop.stages}
        for stage in profile["stages"]:
            key = (stage["name"], stage["startDay"], stage["endDay"])
            current = existing_stage_map.get(key)
            if current is None:
                db.add(_add_stage(crop, stage))
                continue

            metrics = stage["optimalMetrics"]
            rules = stage["scheduleRules"]
            current.temperature_min = metrics["temperature"]["min"]
            current.temperature_max = metrics["temperature"]["max"]
            current.temperature_optimal = metrics["temperature"]["optimal"]
            current.humidity_min = metrics["humidity"]["min"]
            current.humidity_max = metrics["humidity"]["max"]
            current.humidity_optimal = metrics["humidity"]["optimal"]
            current.soil_moisture_min = metrics["soilMoisture"]["min"]
            current.soil_moisture_max = metrics["soilMoisture"]["max"]
            current.soil_moisture_optimal = metrics["soilMoisture"]["optimal"]
            current.ph_min = metrics["ph"]["min"]
            current.ph_max = metrics["ph"]["max"]
            current.ph_optimal = metrics["ph"]["optimal"]
            current.dli_min = metrics["dli"]["min"]
            current.dli_max = metrics["dli"]["max"]
            current.dli_optimal = metrics["dli"]["optimal"]
            current.ai_cultivation_notes = stage["aiCultivationNotes"]
            current.irrigation_cycle = rules["irrigationCycle"]
            current.target_dli = rules["targetDli"]

    plant = db.get(ActivePlantRecord, "ap-1")
    if plant is None:
        lettuce = crops["prof-lettuce"]
        plant = ActivePlantRecord(
            id="ap-1",
            custom_label="Lettuce Rack A",
            crop_profile=lettuce,
            status="Growing",
            planted_at=datetime.now(timezone.utc) - timedelta(days=24),
            current_stage="Vegetative",
            day_count=24,
            health_score=98,
            predicted_yield=1.2,
            location="Zone A, Rack 2",
            temperature=22.5,
            humidity=65,
            soil_moisture=72,
            ph=6.2,
            dli=14.5,
        )
        db.add(plant)

    if db.get(SensorRecord, "S-104") is None:
        db.add_all(
            [
                SensorRecord(
                    id="S-104",
                    sensor_type="Temperature",
                    model_name="DHT-22 Plus",
                    battery_level=84,
                    status="Online",
                    plant=plant,
                    last_sync=datetime.now(timezone.utc),
                    current_value=22.5,
                ),
                SensorRecord(
                    id="S-105",
                    sensor_type="Humidity",
                    model_name="DHT-22 Plus",
                    battery_level=84,
                    status="Online",
                    plant=plant,
                    last_sync=datetime.now(timezone.utc),
                    current_value=65,
                ),
                SensorRecord(
                    id="S-211",
                    sensor_type="Soil_Moisture",
                    model_name="Capacitive SM-3",
                    battery_level=92,
                    status="Online",
                    plant=plant,
                    last_sync=datetime.now(timezone.utc),
                    current_value=72,
                ),
                SensorRecord(
                    id="S-305",
                    sensor_type="pH",
                    model_name="Bluelab Pulse",
                    battery_level=45,
                    status="Warning",
                    plant=plant,
                    last_sync=datetime.now(timezone.utc) - timedelta(minutes=15),
                    current_value=6.2,
                ),
                SensorRecord(
                    id="S-402",
                    sensor_type="Light",
                    model_name="PAR Meter X",
                    battery_level=100,
                    status="Online",
                    plant=plant,
                    last_sync=datetime.now(timezone.utc),
                    current_value=14.5,
                ),
            ]
        )

    task = db.get(AgentTaskRecord, "t-1092")
    if task is None:
        task = AgentTaskRecord(
            id="t-1092",
            active_plant_id=plant.id,
            action_title="Increase fertigation frequency by 15%",
            priority="High",
            reasoning=(
                "Soil moisture dropped faster than predicted over the last 12h. Current EC indicates nutrient uptake is optimal, "
                "but water volume is insufficient for the current Vegetative stage of Butterhead Lettuce."
            ),
            confidence_score=94,
            predicted_impact="Prevents slight tip burn risk identified in ML model.",
            status="Pending",
            approval_required=True,
        )
        db.add(task)

    has_notification = db.scalar(select(NotificationRecord.id).where(NotificationRecord.agent_task_id == task.id).limit(1))
    if has_notification is None:
        db.add(
            NotificationRecord(
                active_plant_id=plant.id,
                agent_task_id=task.id,
                title="Agent decision ready",
                message="The agent recommends increasing fertigation frequency by 15% and is waiting for approval.",
                channel="in-app",
            )
        )

    db.commit()
