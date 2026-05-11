from fastapi import FastAPI, Body
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import random
import os
import time
from typing import List, Dict, Optional
from pydantic import BaseModel

app = FastAPI(title="FarmPilot IoT Sensor Simulator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TargetUpdateRequest(BaseModel):
    metric: str
    target: float

# Memory State per plant: plant_states[plant_id] = { "temperature": 22.5, ... }
plant_states: Dict[str, Dict[str, float]] = {}

# Memory Targets per plant: plant_targets[plant_id] = { "temperature": 24.0 }
plant_targets: Dict[str, Dict[str, float]] = {}

def get_default_state():
    return {
        "temperature": round(20.0 + random.uniform(-2, 4), 2),
        "humidity": round(55.0 + random.uniform(-5, 10), 2),
        "soil_moisture": round(50.0 + random.uniform(-5, 15), 2),
        "ph": round(6.2 + random.uniform(-0.2, 0.2), 2),
        "dli": round(12.0 + random.uniform(-2, 2), 2)
    }

@app.get("/")
def read_root():
    return FileResponse(os.path.join(os.path.dirname(__file__), "index.html"))

@app.get("/active_plants")
def get_active_plants_tracked():
    """Helper endpoint to show tracked states"""
    return list(plant_states.keys())

@app.get("/sensors/{plant_id}")
def get_simulated_data(plant_id: str):
    # Initialize state if missing
    if plant_id not in plant_states:
        plant_states[plant_id] = get_default_state()
    if plant_id not in plant_targets:
        plant_targets[plant_id] = {}
        
    state = plant_states[plant_id]
    targets = plant_targets[plant_id]
    
    metrics = ["temperature", "humidity", "soil_moisture", "ph", "dli"]
    
    # DRIFT ENGINE
    for metric in metrics:
        current_val = state.get(metric, 20.0)
        
        # PHASE A: If has an AI-driven active target, move toward it!
        if metric in targets:
            tgt_val = targets[metric]
            diff = tgt_val - current_val
            
            if abs(diff) < 0.1:
                # Almost reached. Snap to it and delete the target.
                state[metric] = tgt_val
                del targets[metric]
            else:
                # Interpolate smoothly. 
                # We'll use a "step approach" simulated over each tick.
                # Tweak step size depending on metric.
                step = 0.25 if metric in ["temperature", "humidity", "soil_moisture"] else 0.05
                direction = 1 if diff > 0 else -1
                # Move at most total 'step' per request
                move = min(abs(diff), step) * direction
                state[metric] = round(current_val + move, 2)
        
        # PHASE B: Normal natural random drift if NO target active
        else:
            # Convert to dynamic percentage-based drift (fair scaling for large/small values)
            if metric == "temperature":
                factor = random.uniform(-0.005, 0.005) # +/- 0.5%
            elif metric == "humidity":
                factor = random.uniform(-0.005, 0.005) # +/- 0.5%
            elif metric == "soil_moisture":
                factor = random.uniform(-0.004, 0.004) # +/- 0.4% natural fluctuation
            elif metric == "ph":
                factor = random.uniform(-0.001, 0.001) # Logarithmic lock +/- 0.1%
            else: # dli
                factor = random.uniform(-0.006, 0.006) # +/- 0.6%
                
            # Calculate drift based on current scalar magnitude, minimum base of 1.0
            base_mag = abs(current_val) if abs(current_val) > 1.0 else 1.0
            drift = base_mag * factor
            
            state[metric] = round(current_val + drift, 2)

    # CLAMPS
    state["temperature"] = max(5.0, min(45.0, state["temperature"]))
    state["humidity"] = max(10.0, min(100.0, state["humidity"]))
    state["soil_moisture"] = max(0.0, min(100.0, state["soil_moisture"]))
    state["ph"] = max(4.0, min(9.0, state["ph"]))
    state["dli"] = max(0.0, min(50.0, state["dli"]))

    # Return response as objects
    return [
        {
            "id": f"S-TEMP-{plant_id}",
            "type": "Temperature",
            "value": state["temperature"],
            "unit": "°C",
            "status": "Online" if "temperature" not in targets else "Interpolating",
            "target": targets.get("temperature"),
            "battery": 88
        },
        {
            "id": f"S-HUM-{plant_id}",
            "type": "Humidity",
            "value": state["humidity"],
            "unit": "%",
            "status": "Online" if "humidity" not in targets else "Interpolating",
            "target": targets.get("humidity"),
            "battery": 92
        },
        {
            "id": f"S-SM-{plant_id}",
            "type": "Soil_Moisture",
            "value": state["soil_moisture"],
            "unit": "%",
            "status": "Online" if "soil_moisture" not in targets else "Interpolating",
            "target": targets.get("soil_moisture"),
            "battery": 94
        },
        {
            "id": f"S-PH-{plant_id}",
            "type": "pH",
            "value": state["ph"],
            "unit": "",
            "status": "Online" if "ph" not in targets else "Interpolating",
            "target": targets.get("ph"),
            "battery": 76
        },
        {
            "id": f"S-DLI-{plant_id}",
            "type": "Light",
            "value": state["dli"],
            "unit": "mol/d",
            "status": "Online" if "dli" not in targets else "Interpolating",
            "target": targets.get("dli"),
            "battery": 100
        }
    ]

@app.post("/sensors/{plant_id}/target")
def set_metric_target(plant_id: str, data: TargetUpdateRequest):
    """Registers a target override that forces the simulation to gradually drift to this value."""
    if plant_id not in plant_targets:
        plant_targets[plant_id] = {}
    
    # Check valid key
    m = data.metric.lower().replace(" ", "_")
    if m in ["temperature", "humidity", "soil_moisture", "ph", "dli"]:
        plant_targets[plant_id][m] = float(data.target)
        print(f"SYSTEM: Set plant {plant_id} metric {m} to TARGET {data.target}")
        return {"status": "accepted", "plant": plant_id, "metric": m, "target": data.target}
    
    return {"status": "ignored", "reason": "invalid metric"}

@app.post("/reset")
def reset_simulation():
    global plant_states, plant_targets
    plant_states.clear()
    plant_targets.clear()
    return {"message": "All simulation state purged."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8090)
