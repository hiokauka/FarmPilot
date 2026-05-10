import os, json
from dotenv import load_dotenv
load_dotenv()

from google import genai
from google.genai import types
from app.services.tools import AgentResponse

api_key = os.environ.get("GEMINI_API_KEY", "")
model = os.environ.get("LLM_MODEL", "gemini-2.5-flash")
print(f"Testing model: {model}")

client = genai.Client(api_key=api_key)

context_prompt = (
    "You are an expert autonomous agricultural AI agent.\n"
    "Analyze the sensor readings below against the optimal ranges and respond with a JSON object.\n\n"
    "Crop: Butterhead Lettuce | Stage: Vegetative | Health: 88.0\n\n"
    "Optimal Ranges:\n"
    "  Temperature: 18-24C (current: 22.5C)\n"
    "  Soil Moisture: 60-80% (current: 65.0%)\n"
    "  DLI: target 15.0 (current: 14.5)\n"
    "  Humidity: 55-75% (current: 68.0%)\n"
    "  pH: 6.0-7.0 (current: 6.5)\n"
    "  Custom AI Rules: none\n\n"
    "Instructions:\n"
    "- If all readings are within range: return summary='stable', actions=[], updated_rules=null\n"
    "- If anomalies found: propose specific corrective actions in 'actions'\n"
    "- Only populate updated_rules if default thresholds need permanent adjustment\n\n"
    "Return JSON with keys: summary (string), actions (array), updated_rules (object or null)."
)

print("Testing with response_schema (Gemini native)...")
try:
    r = client.models.generate_content(
        model=model,
        contents=context_prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=AgentResponse,
            temperature=0.2,
        )
    )
    data = json.loads(r.text)
    print(f"SUCCESS: summary='{data.get('summary','')[:60]}', actions={len(data.get('actions',[]))}")
except Exception as e:
    print(f"FAILED: {type(e).__name__}: {str(e)[:200]}")
