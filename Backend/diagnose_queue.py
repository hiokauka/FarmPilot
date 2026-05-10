from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import AgentTaskRecord, SensorRecord, ActivePlantRecord
from app.services.agent_engine import evaluate_anomaly_keys, _stage_for_plant
from sqlalchemy import select

with SessionLocal() as db:
    plants = db.query(ActivePlantRecord).all()
    print(f"Found {len(plants)} total plants.")
    
    for plant in plants:
        print(f"\n=== DIAGNOSTICS FOR PLANT: {plant.custom_label} ({plant.id}) ===")
        
        # 1. Get active violations
        crop = plant.crop_profile
        stage = None
        if crop:
            for s in crop.stages:
                if s.name == plant.current_stage:
                    stage = s
                    break
        
        violations = evaluate_anomaly_keys(plant, stage) if stage else set()
        print(f"  Violated Metrics: {violations}")
        
        # 2. Get pending tasks
        pending = db.scalars(select(AgentTaskRecord).where(
            AgentTaskRecord.active_plant_id == plant.id,
            AgentTaskRecord.status == "Pending"
        )).all()
        
        print(f"  Pending Tasks count: {len(pending)}")
        pending_mets = set()
        for t in pending:
            mets = t.metric_adjustments or {}
            print(f"    - Task {t.id}: {t.action_title} | Adj Keys: {list(mets.keys())}")
            pending_mets.update(mets.keys())
            
        # 3. Get interpolating sensors
        interp = db.scalars(select(SensorRecord).where(
            SensorRecord.active_plant_id == plant.id,
            SensorRecord.status == "Interpolating"
        )).all()
        print(f"  Interpolating Sensors count: {len(interp)}")
        for s in interp:
            k = s.sensor_type.lower()
            if k == "light": k = "dli"
            print(f"    - Sensor {s.id} ({s.sensor_type}) -> mapped key '{k}'")
            pending_mets.add(k)
            
        print(f"  AGGREGATE PENDING METRICS: {pending_mets}")
        
        if len(violations) > 0 and violations.issubset(pending_mets):
            print("  >>> MISMATCH FOUND! ALL VIOLATIONS SUPPRESSED BY QUEUE!")
        else:
            print("  >>> NO SUPPRESSION (Normal Flow).")
        print("="*40)
