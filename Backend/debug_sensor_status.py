import httpx
import json

def check():
    r = httpx.get("http://127.0.0.1:8000/api/plants")
    plants = r.json()
    for p in plants:
        pid = p["id"]
        rs = httpx.get(f"http://127.0.0.1:8000/api/plants/{pid}/sensors")
        sensors = rs.json()
        print(f"\nPlant: {pid}")
        for s in sensors:
            print(f"  Sensor {s['type']}: Status={s['status']}")

if __name__ == "__main__":
    check()
