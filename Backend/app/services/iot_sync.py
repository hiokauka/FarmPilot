import asyncio
import httpx
import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import ActivePlantRecord, SensorRecord

logger = logging.getLogger("iot_sync")
# Note: We will append /{plant_id} dynamically during iteration
SIMULATOR_BASE = "http://localhost:8090/sensors"

async def sync_sensors_task():
    """Background task to poll the sensor simulator per-plant and update the database."""
    logger.info("Starting IoT Multi-Plant Sensor Sync Service...")
    
    while True:
        await asyncio.sleep(5)  # Tick rate
        
        try:
            with SessionLocal() as db:
                plants = db.query(ActivePlantRecord).all()
                if not plants:
                    continue
                
                async with httpx.AsyncClient(timeout=3.0) as client:
                    for plant in plants:
                        try:
                            target_url = f"{SIMULATOR_BASE}/{plant.id}"
                            resp = await client.get(target_url)
                            
                            if resp.status_code != 200:
                                # Simulator didn't return successfully for this specific node
                                continue
                                
                            sim_data = resp.json()
                            
                            # Apply updates directly to plant attributes & related records
                            for s_data in sim_data:
                                val = s_data["value"]
                                stype = s_data["type"]
                                
                                # Primary Metrics Routing
                                if stype == "Temperature":
                                    plant.temperature = val
                                elif stype == "Humidity":
                                    plant.humidity = val
                                elif stype == "Soil_Moisture":
                                    plant.soil_moisture = val
                                elif stype == "pH":
                                    plant.ph = val
                                elif stype == "Light":
                                    plant.dli = val
                                    
                                # Sync underlying static hardware record if present in DB, or auto-register if new
                                sensor = db.query(SensorRecord).filter(SensorRecord.id == s_data["id"]).first()
                                if sensor:
                                    sensor.current_value = val
                                    sensor.last_sync = datetime.now(timezone.utc)
                                    sensor.status = s_data["status"]
                                else:
                                    # AUTO-DISCOVERY: Create the physical node reference automatically!
                                    new_sensor = SensorRecord(
                                        id=s_data["id"],
                                        sensor_type=stype,
                                        model_name="IoT-SimNode",
                                        battery_level=s_data.get("battery", 100),
                                        status=s_data["status"],
                                        active_plant_id=plant.id,
                                        last_sync=datetime.now(timezone.utc),
                                        current_value=val
                                    )
                                    db.add(new_sensor)
                            
                            # Mark updated
                            db.commit()
                            
                        except httpx.RequestError:
                            # Quietly ignore individual node failures (e.g., connection refused)
                            pass
                        except Exception as sub_e:
                            logger.warning(f"Error syncing plant {plant.id}: {str(sub_e)}")
                            
        except Exception as e:
            logger.error(f"Critical failure in parent IoT sync loop: {str(e)}")
