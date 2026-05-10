from app.database import SessionLocal
from app.models import SensorRecord

def dump():
    with SessionLocal() as db:
        sensors = db.query(SensorRecord).all()
        print("\n--- SENSOR DATABASE DUMP ---")
        for s in sensors:
            print(f"ID: {s.id} | Type: {s.sensor_type} | Plant: {s.active_plant_id} | Status: {s.status} | LastSync: {s.last_sync}")

if __name__ == "__main__":
    dump()
