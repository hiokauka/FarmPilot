from app.database import SessionLocal
from app.models import AgentTaskRecord

with SessionLocal() as db:
    # Find and delete all pending tasks generated before the update,
    # preventing users from accidentally triggering legacy delta values as absolute targets!
    deleted_count = db.query(AgentTaskRecord).filter(AgentTaskRecord.status == "Pending").delete()
    db.commit()
    print(f"Successfully cleared {deleted_count} legacy pending tasks from the database buffer.")
