from fastapi import FastAPI
from fastapi.responses import FileResponse
import random
import os
import time
from typing import List, Dict

app = FastAPI(title="FarmPilot IoT Sensor Simulator")

@app.get("/")
def read_root():
    return FileResponse(os.path.join(os.path.dirname(__file__), "index.html"))

# Mock state to allow for gradual "drifting" of values
state = {
    "temperature": 24.5,
    "humidity": 62.0,
    "soil_moisture": 45.0,
    "ph": 6.5,
    "dli": 12.0
}

@app.get("/sensors")
def get_simulated_data():
    # Update state with slight random drift
    state["temperature"] += random.uniform(-0.2, 0.2)
    state["humidity"] += random.uniform(-0.5, 0.5)
    state["soil_moisture"] -= random.uniform(0.0, 0.3)  # Dries up over time
    state["ph"] += random.uniform(-0.01, 0.01)
    state["dli"] += random.uniform(-0.1, 0.1)

    # Clamp values to realistic ranges
    state["temperature"] = max(15.0, min(35.0, state["temperature"]))
    state["humidity"] = max(30.0, min(95.0, state["humidity"]))
    state["soil_moisture"] = max(10.0, min(90.0, state["soil_moisture"]))
    state["ph"] = max(5.0, min(8.0, state["ph"]))
    
    return [
        {
            "id": "S-104",
            "type": "Temperature",
            "value": round(state["temperature"], 2),
            "unit": "°C",
            "status": "Online",
            "battery": 88
        },
        {
            "id": "S-105",
            "type": "Humidity",
            "value": round(state["humidity"], 2),
            "unit": "%",
            "status": "Online",
            "battery": 92
        },
        {
            "id": "S-211",
            "type": "Soil_Moisture",
            "value": round(state["soil_moisture"], 2),
            "unit": "%",
            "status": "Online",
            "battery": 75
        },
        {
            "id": "S-305",
            "type": "pH",
            "value": round(state["ph"], 2),
            "unit": "",
            "status": "Online",
            "battery": 95
        },
        {
            "id": "S-402",
            "type": "Light",
            "value": round(state["dli"], 2),
            "unit": "",
            "status": "Online",
            "battery": 100
        }
    ]

@app.post("/reset")
def reset_simulation():
    global state
    state = {
        "temperature": 24.5,
        "humidity": 62.0,
        "soil_moisture": 45.0,
        "ph": 6.5,
        "dli": 12.0
    }
    return {"message": "Simulation reset"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
