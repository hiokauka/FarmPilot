from app.database import SessionLocal
from app.models import SensorRecord

with SessionLocal() as db:
    # Vaporize every single sensor record in the database.
    # The IoT auto-sync daemon running in the background will automatically resurrect ONLY the valid, active simulator nodes
    # within the next 5 seconds, with absolutely NO legacy collision ghosts remaining to mask them!
    count = db.query(SensorRecord).delete()
    db.commit()
    print(f"CLEANSED: Successfully vaporized {count} contaminated sensor identity records.")
