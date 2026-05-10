import asyncio
import httpx
import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import ActivePlantRecord, SensorRecord

logger = logging.getLogger("iot_sync")
SIMULATOR_URL = "http://localhost:8080/sensors"

async def sync_sensors_task():
    """Background task to poll the sensor simulator and update the database."""
    logger.info("Starting IoT Sensor Sync Service...")
    
    while True:
        await asyncio.sleep(5)  # Sync every 5 seconds
        
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                response = await client.get(SIMULATOR_URL)
                if response.status_code != 200:
                    logger.warning(f"Simulator returned status {response.status_code}")
                    continue
                
                sim_data = response.json()
                
                with SessionLocal() as db:
                    # For this demo, we'll update the first active plant found
                    # In a real app, you'd match by plant_id/device mapping
                    plant = db.query(ActivePlantRecord).first()
                    if not plant:
                        continue
                        
                    for s_data in sim_data:
                        # 1. Update/Create the individual sensor record
                        sensor = db.query(SensorRecord).filter(SensorRecord.id == s_data["id"]).first()
                        if sensor:
                            sensor.current_value = s_data["value"]
                            sensor.last_sync = datetime.now(timezone.utc)
                            sensor.battery_level = s_data["battery"]
                            sensor.status = s_data["status"]
                        
                        # 2. Map simulator types to plant metrics
                        stype = s_data["type"]
                        if stype == "Temperature":
                            plant.temperature = s_data["value"]
                        elif stype == "Humidity":
                            plant.humidity = s_data["value"]
                        elif stype == "Soil_Moisture":
                            plant.soil_moisture = s_data["value"]
                        elif stype == "pH":
                            plant.ph = s_data["value"]
                        elif stype == "Light":
                            plant.dli = s_data["value"]
                            
                    db.commit()
                    print(f"I/O SYNC: Successfully updated {len(sim_data)} sensors.")
                    
        except httpx.ConnectError:
            logger.debug("Simulator not reachable. Skipping sync...")
        except Exception as e:
            logger.error(f"Error in IoT Sync: {str(e)}")
