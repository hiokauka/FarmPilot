from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import re
import os
import json

from dotenv import load_dotenv
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    ActivePlantRecord,
    AgentTaskRecord,
    CropProfileRecord,
    GrowthStageRecord,
    NotificationRecord,
    SensorRecord,
)

load_dotenv()

try:
    from google import genai
    from google.genai import types
    from langchain_google_genai import ChatGoogleGenerativeAI
    from app.services.tools import AgentResponse  # verify tools module is OK too
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False

# Thread-safe runtime registry tracking currently processing plant ids.
# Prevents periodic polling from trampling concurrent manual triggers or long AI calls.
import threading
_RUNNING_ANALYSIS_LOCK = threading.Lock()
_ACTIVE_PLANT_RUNS = set()

@dataclass
class Recommendation:
    action_title: str
    priority: str
    reasoning: str
    confidence_score: float
    predicted_impact: str
    proposed_rules: dict | None = None
    metric_adjustments: dict | None = None


def _stage_for_plant(crop: CropProfileRecord, stage_name: str) -> GrowthStageRecord | None:
    for stage in crop.stages:
        if stage.name == stage_name:
            return stage
    return crop.stages[0] if crop.stages else None


def _bounded_confidence(delta: float, scale: float) -> float:
    base = 70.0 + min(25.0, (abs(delta) / max(scale, 0.1)) * 25.0)
    return round(min(98.0, max(70.0, base)), 1)


def _generate_recommendations_rule_based(plant: ActivePlantRecord, crop: CropProfileRecord, stage: GrowthStageRecord) -> list[Recommendation]:
    recommendations: list[Recommendation] = []

    if plant.soil_moisture < stage.soil_moisture_min:
        delta = stage.soil_moisture_min - plant.soil_moisture
        recommendations.append(
            Recommendation(
                action_title="[Rule-Based] Increase fertigation frequency by 15%",
                priority="High" if delta >= 8 else "Medium",
                reasoning=(
                    f"Soil moisture ({plant.soil_moisture:.1f}) is below minimum ({stage.soil_moisture_min:.1f}) "
                    f"for {stage.name} stage in {crop.name}."
                ),
                confidence_score=_bounded_confidence(delta, 10),
                predicted_impact="Reduces water stress and restores stable root uptake within 6-12 hours.",
                metric_adjustments={"soil_moisture": 5.0}
            )
        )

    if plant.dli < stage.dli_min:
        delta = stage.dli_optimal - plant.dli
        recommendations.append(
            Recommendation(
                action_title="[Rule-Based] Increase grow-light intensity by 10% for next 8 hours",
                priority="Medium" if delta < 4 else "High",
                reasoning=(
                    f"DLI ({plant.dli:.1f}) is below minimum ({stage.dli_min:.1f}) target range "
                    f"for {stage.name} stage."
                ),
                confidence_score=_bounded_confidence(delta, 6),
                predicted_impact="Improves photosynthesis rate and supports consistent biomass accumulation.",
                metric_adjustments={"dli": 2.0}
            )
        )
    elif plant.dli > stage.dli_max:
        delta = plant.dli - stage.dli_optimal
        recommendations.append(
            Recommendation(
                action_title="[Rule-Based] Reduce daily photoperiod or lower light intensity",
                priority="High" if delta >= 6 else "Medium",
                reasoning=(
                    f"DLI ({plant.dli:.1f}) significantly exceeds safe maximum ({stage.dli_max:.1f}). "
                    f"Exposing plant to light stress/photoinhibition risk."
                ),
                confidence_score=_bounded_confidence(delta, 6),
                predicted_impact="Prevents radiative stress, lowers peak tissue temperature and extends lamp longevity.",
                metric_adjustments={"dli": -2.0}
            )
        )

    if plant.temperature > stage.temperature_max:
        delta = plant.temperature - stage.temperature_max
        target = max(stage.temperature_optimal, stage.temperature_min)
        recommendations.append(
            Recommendation(
                action_title=f"[Rule-Based] Lower ambient temperature to {target:.0f}C tonight",
                priority="High" if delta >= 3 else "Medium",
                reasoning=(
                    f"Temperature ({plant.temperature:.1f}) exceeds stage max ({stage.temperature_max:.1f}) "
                    f"and may increase stress and respiration losses."
                ),
                confidence_score=_bounded_confidence(delta, 4),
                predicted_impact="Improves transpiration balance and protects quality under current stage conditions.",
                metric_adjustments={"temperature": -1.5}
            )
        )
    elif plant.temperature < stage.temperature_min:
        delta = stage.temperature_min - plant.temperature
        recommendations.append(
            Recommendation(
                action_title="[Rule-Based] Increase operational heating frequency",
                priority="Medium",
                reasoning=f"Ambient temp ({plant.temperature}) is below stage critical floor ({stage.temperature_min}).",
                confidence_score=_bounded_confidence(delta, 3),
                predicted_impact="Restores internal metabolic efficiency.",
                metric_adjustments={"temperature": 1.5}
            )
        )

    if plant.humidity > stage.humidity_max:
        recommendations.append(
            Recommendation(
                action_title="[Rule-Based] Activate emergency dehumidification system",
                priority="High",
                reasoning=f"Humidity ({plant.humidity}%) is significantly above stage safe limit ({stage.humidity_max}%).",
                confidence_score=85.0,
                predicted_impact="Reduces microbial risk and controls fungal vector probabilities.",
                metric_adjustments={"humidity": -5.0}
            )
        )
    elif plant.humidity < stage.humidity_min:
        recommendations.append(
            Recommendation(
                action_title="[Rule-Based] Increase air atomization (fogging) intensity",
                priority="Medium",
                reasoning=f"Humidity ({plant.humidity}%) is drying below optimal floor.",
                confidence_score=82.0,
                predicted_impact="Lowers vapor pressure deficit and prevents stomatal clamping.",
                metric_adjustments={"humidity": 5.0}
            )
        )

    if plant.ph < stage.ph_min:
        recommendations.append(
            Recommendation(
                action_title="[Rule-Based] Apply weak alkaline balance (pH Up)",
                priority="Medium",
                reasoning=f"Solution pH ({plant.ph}) shows elevated acidity below safe bound.",
                confidence_score=90.0,
                predicted_impact="Restores nutrient availability.",
                metric_adjustments={"ph": 0.2}
            )
        )
    elif plant.ph > stage.ph_max:
        recommendations.append(
            Recommendation(
                action_title="[Rule-Based] Dose acidic buffering agent (pH Down)",
                priority="Medium",
                reasoning=f"Solution pH ({plant.ph}) shows excess alkalinity above safe bound.",
                confidence_score=90.0,
                predicted_impact="Prevents iron-lockout and promotes trace element mobility.",
                metric_adjustments={"ph": -0.2}
            )
        )

    if not recommendations:
        recommendations.append(
            Recommendation(
                action_title="[Rule-Based] Keep current environmental settings",
                priority="Low",
                reasoning="All monitored metrics are within target ranges for the current stage.",
                confidence_score=91.0,
                predicted_impact="Maintains stable growth trajectory and avoids unnecessary control changes.",
            )
        )

    return recommendations


def evaluate_anomaly_keys(plant: ActivePlantRecord, stage: GrowthStageRecord) -> set[str]:
    rules = plant.ai_custom_rules or {}
    t_min = rules.get("temperature_min") or stage.temperature_min
    t_max = rules.get("temperature_max") or stage.temperature_max
    sm_min = rules.get("soil_moisture_min") or stage.soil_moisture_min
    sm_max = rules.get("soil_moisture_max") or stage.soil_moisture_max
    
    # Use custom DLI target or fall back to stage absolute range
    dli_min = stage.dli_min
    dli_max = stage.dli_max
    if "target_dli" in rules:
        val = rules["target_dli"]
        dli_min = val - 2.0
        dli_max = val + 2.0

    # Extract humidity and pH bounds from stage/rules
    h_min = rules.get("humidity_min") or stage.humidity_min
    h_max = rules.get("humidity_max") or stage.humidity_max
    ph_min = rules.get("ph_min") or stage.ph_min
    ph_max = rules.get("ph_max") or stage.ph_max

    violated = set()
    if plant.temperature < t_min or plant.temperature > t_max: 
        violated.add("temperature")
    if plant.soil_moisture < sm_min or plant.soil_moisture > sm_max: 
        violated.add("soil_moisture")
    if plant.dli < dli_min or plant.dli > dli_max: 
        violated.add("dli")
    if plant.humidity < h_min or plant.humidity > h_max:
        violated.add("humidity")
    if plant.ph < ph_min or plant.ph > ph_max:
        violated.add("ph")
    
    return violated


def run_agent_analysis_core(db: Session, plant: ActivePlantRecord, is_manual: bool = False) -> tuple[list[AgentTaskRecord], AnalysisLogRecord | None]:
    """Public safe-wrapper handling thread-safety per-plant to avoid collisions."""
    global _ACTIVE_PLANT_RUNS
    
    with _RUNNING_ANALYSIS_LOCK:
        if plant.id in _ACTIVE_PLANT_RUNS:
            # If manual request, we block? No, user explicitly said just "don't run periodic".
            # Actually safer to avoid all overlapping runs to stop twin task creation.
            print(f"  [Analysis skipped] Plant {plant.id} analysis is already running.")
            return [], None
        _ACTIVE_PLANT_RUNS.add(plant.id)
    
    try:
        return _run_agent_analysis_internal(db, plant, is_manual)
    finally:
        with _RUNNING_ANALYSIS_LOCK:
            if plant.id in _ACTIVE_PLANT_RUNS:
                _ACTIVE_PLANT_RUNS.remove(plant.id)


def _run_agent_analysis_internal(db: Session, plant: ActivePlantRecord, is_manual: bool = False) -> tuple[list[AgentTaskRecord], AnalysisLogRecord | None]:
    from app.models import AnalysisLogRecord
    crop = db.get(CropProfileRecord, plant.crop_profile_id)
    if not crop:
        return [], None

    stage = _stage_for_plant(crop, plant.current_stage)
    if not stage:
        return [], None

    config = plant.agent_config
    approval_mode = config.approval_mode if config else "ask"

    violated_metrics = evaluate_anomaly_keys(plant, stage)
    has_anomaly = len(violated_metrics) > 0

    if not has_anomaly and not is_manual:
        # Periodic check, stable, skip AI to save limits
        plant.last_analysis_at = datetime.now(timezone.utc)
        log = AnalysisLogRecord(
            active_plant_id=plant.id,
            is_manual=False,
            status="Stable",
            ai_summary="Environment stable. Checked automatically by rule engine.",
            is_hidden=True
        )
        db.add(log)
        db.commit()
        return [], log

    # PRE-AI TOKEN CONSERVATION OPTIMIZATION:
    # If the anomalies present are already covered by pending tasks, ABORT call before hitting AI!
    from sqlalchemy import select
    pending_tasks = db.scalars(
        select(AgentTaskRecord).where(
            AgentTaskRecord.active_plant_id == plant.id,
            AgentTaskRecord.status == "Pending",
        )
    ).all()
    
    pending_metrics = set()
    for t in pending_tasks:
        if t.metric_adjustments:
            pending_metrics.update(t.metric_adjustments.keys())
            
    # ADDING SECONDARY HARDWARE GATING:
    # Check if physical hardware is currently actively interpolating toward a target.
    # While doing so, the underlying metric is officially 'under control', blocking spam.
    interpolating_sensors = db.scalars(
        select(SensorRecord).where(
            SensorRecord.active_plant_id == plant.id,
            SensorRecord.status == "Interpolating",
        )
    ).all()
    now_utc = datetime.now(timezone.utc)
    for sensor in interpolating_sensors:
        # ROBUSTNESS PROTECTION: If a sensor was set to 'Interpolating' but 
        # the synchronization daemon has not updated its payload in over 30 seconds,
        # it means the Simulator disconnected or timed out. FREE THE LOCK.
        if sensor.last_sync:
            # Ensure tz-aware safely
            sync_at = sensor.last_sync if sensor.last_sync.tzinfo else sensor.last_sync.replace(tzinfo=timezone.utc)
            drift_seconds = (now_utc - sync_at).total_seconds()
            if drift_seconds > 30.0:
                # Silently ignore stale interpolators, preventing 'Permalocks'
                continue

        mapped_key = sensor.sensor_type.lower()
        if mapped_key == "light": mapped_key = "dli"
        pending_metrics.add(mapped_key)
        
    # If EVERY current anomaly matches an active pending blocker OR active interpolator, safely skip.
    if has_anomaly and violated_metrics.issubset(pending_metrics):
        print(f"  [TokenSaver] SKIPPING ANALYSIS: Plant {plant.id} violations {violated_metrics} are already covered by Active Queue: {pending_metrics}")
        # Re-return current state successfully with zero additional task creations.
        return [], None

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key or not GENAI_AVAILABLE:
        recs = _generate_recommendations_rule_based(plant, crop, stage)
        created = materialize_recommendations(db, plant, recs, approval_mode)
        plant.last_analysis_at = datetime.now(timezone.utc)
        log = AnalysisLogRecord(
            active_plant_id=plant.id,
            is_manual=is_manual,
            status="Anomaly Detected" if has_anomaly else "Stable",
            ai_summary="[Rule-Based] Evaluated metrics against thresholds.",
            is_hidden=False
        )
        db.add(log)
        db.commit()
        return created, log

    client = genai.Client(api_key=api_key)
    from app.services.tools import AgentResponse

    rules_context = json.dumps(plant.ai_custom_rules) if plant.ai_custom_rules else "none"

    # Build a clean, concise prompt (no literal curly braces to avoid Gemma issues)
    context_prompt = (
        "You are an expert autonomous agricultural AI agent.\n"
        "Analyze the sensor readings below against the target optimal standards and respond with a JSON object.\n\n"
        f"Crop: {crop.name} | Stage: {stage.name} | Health: {plant.health_score}\n\n"
        "Optimal Ranges & Targets:\n"
        f"  Temperature: {stage.temperature_min}-{stage.temperature_max}C (Optimal Target: {stage.temperature_optimal}C, Current: {plant.temperature}C)\n"
        f"  Soil Moisture: {stage.soil_moisture_min}-{stage.soil_moisture_max}% (Optimal Target: {stage.soil_moisture_optimal}%, Current: {plant.soil_moisture}%)\n"
        f"  DLI: {stage.dli_min}-{stage.dli_max} (Optimal Target: {stage.target_dli}, Current: {plant.dli})\n"
        f"  Humidity: {stage.humidity_min}-{stage.humidity_max}% (Optimal Target: {stage.humidity_optimal}%, Current: {plant.humidity}%)\n"
        f"  pH: {stage.ph_min}-{stage.ph_max} (Optimal Target: {stage.ph_optimal}, Current: {plant.ph})\n"
        f"  Custom AI Rules: {rules_context}\n\n"
        "Instructions:\n"
        "- If all readings are within safe range and near optimal target: return summary='stable', actions=[], updated_rules=null\n"
        "- If anomalies found or drifting far from target: propose specific corrective actions in 'actions'\n"
        "- Ensure 'metric_adjustments' are specifically formulated to guide the metric toward the exact 'Optimal Target' center point, to provide maximum future safety buffering.\n"
        "- Only populate updated_rules if default thresholds need permanent adjustment\n\n"
        "Return JSON with keys: summary (string), actions (array of objects with keys: "
        "action_title, priority, reasoning, confidence_score, predicted_impact, and optional "
        "metric_adjustments: object with keys 'dli', 'temperature', 'humidity', 'soil_moisture' holding numerical addition deltas), "
        "updated_rules (object with optional keys: temperature_min, temperature_max, "
        "soil_moisture_min, soil_moisture_max, target_dli, humidity_min, humidity_max, "
        "ph_min, ph_max — or null if no changes needed)."
    )

    try:
        model_name = os.environ.get("LLM_MODEL", "gemini-2.5-flash")

        response = None
        last_exc: Exception | None = None

        # Advanced Agentic Approach: Utilize LangChain's with_structured_output mechanism
        # This seamlessly unifies prompting, schema forcing, and pydantic parsing into a single logic chain.
        try:
            print(f"  [Agent] Initializing Langchain LLM for {model_name}...")
            # Standard API key is inherited from environment variable GEMINI_API_KEY automatically by Langchain
            llm = ChatGoogleGenerativeAI(
                model=model_name,
                temperature=0.2,
                max_retries=1
            )
            
            # Binds the target output structure using Langchain native binding
            structured_llm = llm.with_structured_output(AgentResponse)
            
            # Execute the logic flow
            print(f"  [Agent] Invoking structured analysis chain...")
            agent_response_obj = structured_llm.invoke(context_prompt)
            
            if not agent_response_obj:
                raise ValueError("LangChain invoked successfully but returned empty parse object.")
                
            # Convert object to dictionary natively
            summary = agent_response_obj.summary
            updated_rules = agent_response_obj.updated_rules
            
            # Reconstruct actions_list exactly like legacy system expects downstream 
            actions_list = []
            for act in agent_response_obj.actions:
                act_dict = {
                    "action_title": act.action_title,
                    "priority": act.priority,
                    "reasoning": act.reasoning,
                    "confidence_score": act.confidence_score,
                    "predicted_impact": act.predicted_impact,
                    "metric_adjustments": act.metric_adjustments
                }
                actions_list.append(act_dict)
                
            # Wrap rules appropriately for dictionary format legacy expects
            rules_dict = None
            if updated_rules:
                rules_dict = updated_rules.dict() if hasattr(updated_rules, 'dict') else vars(updated_rules)

            # Pass downstream variables to match final processing logic
            data = {"summary": summary, "updated_rules": rules_dict, "actions": actions_list}
            
            # ADDING COMPREHENSIVE SUCCESS TRACING FOR FULL LOGGING TRANSPARENCY:
            try:
                with open("ai_debug_failures.log", "a", encoding="utf-8") as logf:
                    logf.write(f"\n{'='*40}\n")
                    logf.write(f"TIMESTAMP: {datetime.now(timezone.utc).isoformat()}\n")
                    logf.write(f"STAGE: LANGCHAIN_SUCCESS\n")
                    logf.write(f"MODEL: {model_name}\n")
                    logf.write(f"STRUCTURED OUTPUT GENERATED:\n{json.dumps(data, indent=2)}\n")
            except: pass
            
        except Exception as lc_exc:
            last_exc = lc_exc
            print(f"  [Agent] LangChain invocation failed: {type(lc_exc).__name__}")
            # LOG FAILURE FOR TRANSPARENCY
            try:
                with open("ai_debug_failures.log", "a", encoding="utf-8") as logf:
                    logf.write(f"\n{'='*40}\n")
                    logf.write(f"TIMESTAMP: {datetime.now(timezone.utc).isoformat()}\n")
                    logf.write(f"STAGE: LANGCHAIN_AGENT_INVOCATION\n")
                    logf.write(f"MODEL: {model_name}\n")
                    logf.write(f"EXCEPTION: {type(lc_exc).__name__}: {str(lc_exc)}\n")
                    logf.write(f"CONTEXT PROMPT USED:\n{context_prompt}\n")
            except: pass
            
            # EMERGENCY RESILIENCE FALLBACK:
            # If cloud is totally down (500 Internal Server Error), perform silent recovery
            # utilizing internal physics/rule-based recommendation generation.
            print("  [Agent] Falling back to rule-based safety generator due to API failure...")
            recs = _generate_recommendations_rule_based(plant, crop, stage)
            created = materialize_recommendations(db, plant, recs, approval_mode)
            plant.last_analysis_at = datetime.now(timezone.utc)
            log = AnalysisLogRecord(
                active_plant_id=plant.id,
                is_manual=is_manual,
                status="Anomaly Detected" if has_anomaly else "Stable",
                ai_summary="[Backup Mode] Environmental rules generated due to AI timeout.",
                is_hidden=False
            )
            db.add(log)
            db.commit()
            return created, log
            
        # Clean-up remaining variable bindings needed by tail section
        summary = data.get("summary", "Analysis complete.")
        updated_rules = data.get("updated_rules")
        actions_list = data.get("actions", [])


        # If AI proposed rule updates, append as a separate pending task
        if updated_rules:
            merged_proposed_rules = {k: v for k, v in updated_rules.items() if v is not None}
            if merged_proposed_rules:
                actions_list.append({
                    "action_title": "Update Cultivation Rules",
                    "priority": "High",
                    "reasoning": "AI agent suggests updating cultivation bounds based on recent sensor trends.",
                    "confidence_score": 90.0,
                    "predicted_impact": "Prevents future false alarms and optimizes growth thresholds.",
                    "proposed_rules": merged_proposed_rules
                })

        recommendations = []
        for item in actions_list:
            raw_title = item.get("action_title", "Unknown Action")
            ai_title = f"[AI] {raw_title}"
            recommendations.append(
                Recommendation(
                    action_title=ai_title,
                    priority=item.get("priority", "Medium"),
                    reasoning=item.get("reasoning", "No reasoning provided."),
                    confidence_score=item.get("confidence_score", 80.0),
                    predicted_impact=item.get("predicted_impact", "Unknown impact."),
                    proposed_rules=item.get("proposed_rules", None),
                    metric_adjustments=item.get("metric_adjustments", None)
                )
            )

        # Trust AI judgment: if it returned no actions (stable), skip materialize
        created = materialize_recommendations(db, plant, recommendations, approval_mode) if recommendations else []
            
        plant.last_analysis_at = datetime.now(timezone.utc)
        log = AnalysisLogRecord(
            active_plant_id=plant.id,
            is_manual=is_manual,
            status="Anomaly Detected" if has_anomaly else "Stable",
            ai_summary=summary,
            is_hidden=not is_manual and not has_anomaly
        )
        db.add(log)
        db.commit()
        return created, log
    except Exception as e:
        import traceback
        print(f"Agent Engine AI error for plant {plant.id}: {type(e).__name__}: {e}")
        traceback.print_exc()
        recs = _generate_recommendations_rule_based(plant, crop, stage)
        created = materialize_recommendations(db, plant, recs, approval_mode)
        plant.last_analysis_at = datetime.now(timezone.utc)
        log = AnalysisLogRecord(
            active_plant_id=plant.id,
            is_manual=is_manual,
            status="Anomaly Detected" if has_anomaly else "Stable",
            ai_summary="[Fallback] Analysis failed.",
            is_hidden=False
        )
        db.add(log)
        db.commit()
        return created, log


def _push_simulator_target(plant_id: str, metric: str, target: float) -> None:
    """Submits desired target values to the external IoT Simulation bridge."""
    import httpx
    try:
        url = f"http://localhost:8090/sensors/{plant_id}/target"
        # Short timeout block, fire-and-forget methodology
        httpx.post(url, json={"metric": metric, "target": float(target)}, timeout=1.0)
    except Exception:
        pass # Quiet failure if bridge is temporary offline

def _apply_action_to_plant(plant: ActivePlantRecord, task: AgentTaskRecord) -> str | None:
    # AGENT OVERHAUL: Instead of direct instantaneous persistence, 
    # instruct the hardware simulation node to dynamically target desired threshold!
    
    applied_targets = []

    # PRIMARY PATH: Explicit Payload Logic
    if task.metric_adjustments:
        adj = task.metric_adjustments
        
        if 'dli' in adj and adj['dli'] is not None:
            targ = round(max(0.0, min(40.0, plant.dli + float(adj['dli']))), 2)
            _push_simulator_target(plant.id, "dli", targ)
            applied_targets.append(f"DLI -> {targ}")
            
        if 'temperature' in adj and adj['temperature'] is not None:
            targ = round(max(5.0, min(50.0, plant.temperature + float(adj['temperature']))), 2)
            _push_simulator_target(plant.id, "temperature", targ)
            applied_targets.append(f"Temp -> {targ}C")
            
        if 'humidity' in adj and adj['humidity'] is not None:
            targ = round(max(0.0, min(100.0, plant.humidity + float(adj['humidity']))), 2)
            _push_simulator_target(plant.id, "humidity", targ)
            applied_targets.append(f"Hum -> {targ}%")
            
        if 'soil_moisture' in adj and adj['soil_moisture'] is not None:
            targ = round(max(0.0, min(100.0, plant.soil_moisture + float(adj['soil_moisture']))), 2)
            _push_simulator_target(plant.id, "soil_moisture", targ)
            applied_targets.append(f"Moisture -> {targ}%")
            
        if 'ph' in adj and adj['ph'] is not None:
            targ = round(max(4.0, min(9.0, plant.ph + float(adj['ph']))), 2)
            _push_simulator_target(plant.id, "ph", targ)
            applied_targets.append(f"pH -> {targ}")

        # Pure abstract entity-fields remain direct persisted.
        plant.health_score = min(100.0, plant.health_score + 1.5)
        plant.predicted_yield = max(0.0, plant.predicted_yield + 0.05)
        return " | ".join(applied_targets) if applied_targets else None

    # SECONDARY PATH: Legacy Fallback String-Parsing
    lowered = task.action_title.lower()
    is_increase = any(w in lowered for w in ["increase", "raise", "boost", "up", "add"])
    is_decrease = any(w in lowered for w in ["decrease", "lower", "reduce", "down", "drop"])
    direction = -1.0 if is_decrease else 1.0

    if "fertigation" in lowered or "irrigation" in lowered or "moisture" in lowered or "water" in lowered:
        targ = round(max(0.0, min(100.0, plant.soil_moisture + (6.0 * direction))), 2)
        _push_simulator_target(plant.id, "soil_moisture", targ)
        applied_targets.append(f"Moisture -> {targ}%")

    if "grow-light" in lowered or "dli" in lowered or "light" in lowered:
        targ = round(max(0.0, min(40.0, plant.dli + (2.0 * direction))), 2)
        _push_simulator_target(plant.id, "dli", targ)
        applied_targets.append(f"DLI -> {targ}")

    if "temperature" in lowered or "temp" in lowered:
        match = re.search(r"(\d+(?:\.\d+)?)\s*c", lowered)
        if match:
            t = round(float(match.group(1)), 2)
            _push_simulator_target(plant.id, "temperature", t)
            applied_targets.append(f"Temp -> {t}C")
        else:
            delta = -2.0 if ("lower" in lowered or is_decrease) else 2.0
            targ = round(max(5.0, min(50.0, plant.temperature + delta)), 2)
            _push_simulator_target(plant.id, "temperature", targ)
            applied_targets.append(f"Temp -> {targ}C")

    if "humidity" in lowered:
        targ = round(max(0.0, min(100.0, plant.humidity + (5.0 * direction))), 2)
        _push_simulator_target(plant.id, "humidity", targ)
        applied_targets.append(f"Hum -> {targ}%")
        
    if "ph" in lowered:
        targ = round(max(4.0, min(9.0, plant.ph + (0.2 * direction))), 2)
        _push_simulator_target(plant.id, "ph", targ)
        applied_targets.append(f"pH -> {targ}")

    plant.health_score = min(100.0, plant.health_score + 1.5)
    plant.predicted_yield = max(0.0, plant.predicted_yield + 0.05)
    
    return " | ".join(applied_targets) if applied_targets else None


def materialize_recommendations(
    db: Session,
    plant: ActivePlantRecord,
    recommendations: list[Recommendation],
    approval_mode: str,
) -> list[AgentTaskRecord]:
    # Gather details on what's already queued to prevent infinite spam
    pending_tasks = db.scalars(
        select(AgentTaskRecord).where(
            AgentTaskRecord.active_plant_id == plant.id,
            AgentTaskRecord.status == "Pending",
        )
    ).all()

    existing_pending_titles = {t.action_title for t in pending_tasks}
    existing_pending_metrics = set()
    for t in pending_tasks:
        if t.metric_adjustments:
            existing_pending_metrics.update(t.metric_adjustments.keys())

    created: list[AgentTaskRecord] = []
    now = datetime.now(timezone.utc)

    for rec in recommendations:
        # 1. Standard title dupe prevention
        if rec.action_title in existing_pending_titles:
            continue
        
        # 2. PHYSICAL METRIC BLOCKING: If this rec targets a metric that's already being solved, SKIP.
        # (unless in auto mode where overlapping is fine, though safety prefers suppression even then)
        if rec.metric_adjustments:
            targeted_keys = set(rec.metric_adjustments.keys())
            if targeted_keys.intersection(existing_pending_metrics):
                # Metric is already actively being tuned/addressed in pending state
                continue

        is_auto = approval_mode == "auto"
        task = AgentTaskRecord(
            id=f"t-{plant.id}-{int(now.timestamp() * 1000)}-{len(created)}",
            active_plant_id=plant.id,
            action_title=rec.action_title,
            priority=rec.priority,
            reasoning=rec.reasoning,
            confidence_score=rec.confidence_score,
            predicted_impact=rec.predicted_impact,
            status="Auto-Approved" if is_auto else "Pending",
            created_at=now,
            executed_at=now if is_auto else None,
            approval_required=not is_auto,
            proposed_rules=rec.proposed_rules,
            metric_adjustments=rec.metric_adjustments,
        )
        db.add(task)
        created.append(task)

        if is_auto:
            _apply_action_to_plant(plant, task)
            if task.proposed_rules:
                current_rules = plant.ai_custom_rules or {}
                current_rules.update(task.proposed_rules)
                plant.ai_custom_rules = current_rules

        db.add(
            NotificationRecord(
                active_plant_id=plant.id,
                agent_task_id=task.id,
                title="Agent recommendation generated",
                message=f"{task.action_title} ({task.status})",
                channel="in-app",
            )
        )

    return created


def apply_manual_decision(
    db: Session,
    task: AgentTaskRecord,
    decision: str,
    modified_action_title: str | None = None,
    modified_impact: str | None = None,
) -> AgentTaskRecord:
    plant = db.get(ActivePlantRecord, task.active_plant_id)
    if plant is None:
        return task

    if decision == "reject":
        task.status = "Rejected"
        task.executed_at = datetime.now(timezone.utc)
    elif decision in {"approve", "modify_approve"}:
        if decision == "modify_approve" and modified_action_title:
            task.action_title = modified_action_title
        if decision == "modify_approve" and modified_impact:
            task.predicted_impact = modified_impact
        task.status = "Manually-Approved"
        task.executed_at = datetime.now(timezone.utc)
    # 1. Apply Logic via Simulator, collect summary output string
    summary_notes = ""
    if decision in {"approve", "modify_approve"}:
        notes = _apply_action_to_plant(plant, task)
        if notes:
            summary_notes = f" ({notes})"
        
        # RESTORING RULE COMMIT LOGIC:
        if task.proposed_rules:
            from sqlalchemy.orm.attributes import flag_modified
            current_rules = plant.ai_custom_rules or {}
            current_rules.update(task.proposed_rules)
            plant.ai_custom_rules = current_rules
            flag_modified(plant, "ai_custom_rules")

    # 2. Prepare Final Informative Message
    informative_msg = f"{task.action_title}{summary_notes}"
    
    db.add(
        NotificationRecord(
            active_plant_id=plant.id,
            agent_task_id=task.id,
            title="Action Executed" if decision != "reject" else "Action Rejected",
            message=informative_msg,
            channel="in-app",
        )
    )

    return task
