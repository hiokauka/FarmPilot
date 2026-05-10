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
)

load_dotenv()

try:
    from google import genai
    from google.genai import types
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
            )
        )

    if plant.dli < stage.target_dli:
        delta = stage.target_dli - plant.dli
        recommendations.append(
            Recommendation(
                action_title="[Rule-Based] Increase grow-light intensity by 10% for next 8 hours",
                priority="Medium" if delta < 4 else "High",
                reasoning=(
                    f"DLI ({plant.dli:.1f}) is below target ({stage.target_dli:.1f}) from schedule rules "
                    f"for {stage.name} stage."
                ),
                confidence_score=_bounded_confidence(delta, 6),
                predicted_impact="Improves photosynthesis rate and supports consistent biomass accumulation.",
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


def evaluate_anomaly(plant: ActivePlantRecord, stage: GrowthStageRecord) -> bool:
    rules = plant.ai_custom_rules or {}
    t_min = rules.get("temperature_min") or stage.temperature_min
    t_max = rules.get("temperature_max") or stage.temperature_max
    sm_min = rules.get("soil_moisture_min") or stage.soil_moisture_min
    sm_max = rules.get("soil_moisture_max") or stage.soil_moisture_max
    dli_target = rules.get("target_dli") or stage.target_dli

    if plant.temperature < t_min or plant.temperature > t_max: return True
    if plant.soil_moisture < sm_min or plant.soil_moisture > sm_max: return True
    if plant.dli < dli_target: return True
    return False


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

    has_anomaly = evaluate_anomaly(plant, stage)

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
        "Analyze the sensor readings below against the optimal ranges and respond with a JSON object.\n\n"
        f"Crop: {crop.name} | Stage: {stage.name} | Health: {plant.health_score}\n\n"
        "Optimal Ranges:\n"
        f"  Temperature: {stage.temperature_min}-{stage.temperature_max}C (current: {plant.temperature}C)\n"
        f"  Soil Moisture: {stage.soil_moisture_min}-{stage.soil_moisture_max}% (current: {plant.soil_moisture}%)\n"
        f"  DLI: target {stage.target_dli} (current: {plant.dli})\n"
        f"  Humidity: {stage.humidity_min}-{stage.humidity_max}% (current: {plant.humidity}%)\n"
        f"  pH: {stage.ph_min}-{stage.ph_max} (current: {plant.ph})\n"
        f"  Custom AI Rules: {rules_context}\n\n"
        "Instructions:\n"
        "- If all readings are within range: return summary='stable', actions=[], updated_rules=null\n"
        "- If anomalies found: propose specific corrective actions in 'actions'\n"
        "- Only populate updated_rules if default thresholds need permanent adjustment\n\n"
        "Return JSON with keys: summary (string), actions (array of objects with keys: "
        "action_title, priority, reasoning, confidence_score, predicted_impact), "
        "updated_rules (object with optional keys: temperature_min, temperature_max, "
        "soil_moisture_min, soil_moisture_max, target_dli, humidity_min, humidity_max, "
        "ph_min, ph_max — or null if no changes needed)."
    )

    try:
        model_name = os.environ.get("LLM_MODEL", "gemini-2.5-flash")

        response = None
        last_exc: Exception | None = None

        # Attempt 1: structured JSON schema (Gemini models)
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=context_prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=AgentResponse,
                    temperature=0.2,
                ),
            )
        except Exception as exc1:
            last_exc = exc1
            print(f"  [AI] response_schema failed ({type(exc1).__name__}), trying mime-type only...")

        # Attempt 2: JSON mime type without schema (Gemma + other models)
        if response is None:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=context_prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.2,
                    ),
                )
                last_exc = None
            except Exception as exc2:
                last_exc = exc2
                print(f"  [AI] mime-type-only failed ({type(exc2).__name__}), trying plain text...")

        # Attempt 3: plain text with JSON-in-prompt
        if response is None:
            response = client.models.generate_content(
                model=model_name,
                contents=context_prompt,
                config=types.GenerateContentConfig(temperature=0.2),
            )

        # Extract JSON — strip markdown fences if present
        raw = response.text.strip()
        if "```" in raw:
            parts = raw.split("```")
            for part in parts:
                part = part.strip()
                if part.startswith("json"):
                    part = part[4:].strip()
                if part.startswith("{"):
                    raw = part
                    break
        data = json.loads(raw)
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
                    proposed_rules=item.get("proposed_rules", None)
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


def _apply_action_to_plant(plant: ActivePlantRecord, action_title: str) -> None:
    lowered = action_title.lower()

    if "fertigation" in lowered or "irrigation" in lowered:
        plant.soil_moisture = min(100.0, plant.soil_moisture + 6.0)

    if "grow-light" in lowered or "dli" in lowered or "light" in lowered:
        plant.dli = min(40.0, plant.dli + 2.0)

    if "lower ambient temperature" in lowered or "temperature" in lowered:
        match = re.search(r"(\d+(?:\.\d+)?)\s*c", lowered)
        if match:
            plant.temperature = float(match.group(1))
        else:
            plant.temperature = max(12.0, plant.temperature - 2.0)

    plant.health_score = min(100.0, plant.health_score + 1.5)
    plant.predicted_yield = max(0.0, plant.predicted_yield + 0.05)


def materialize_recommendations(
    db: Session,
    plant: ActivePlantRecord,
    recommendations: list[Recommendation],
    approval_mode: str,
) -> list[AgentTaskRecord]:
    existing_pending_titles = {
        t.action_title
        for t in db.scalars(
            select(AgentTaskRecord).where(
                AgentTaskRecord.active_plant_id == plant.id,
                AgentTaskRecord.status == "Pending",
            )
        )
    }

    created: list[AgentTaskRecord] = []
    now = datetime.now(timezone.utc)

    for rec in recommendations:
        if rec.action_title in existing_pending_titles and approval_mode == "ask":
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
        )
        db.add(task)
        created.append(task)

        if is_auto:
            _apply_action_to_plant(plant, task.action_title)
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
        _apply_action_to_plant(plant, task.action_title)
        # Apply proposed rule changes on approval
        if task.proposed_rules:
            from sqlalchemy.orm.attributes import flag_modified
            current_rules = plant.ai_custom_rules or {}
            current_rules.update(task.proposed_rules)
            plant.ai_custom_rules = current_rules
            flag_modified(plant, "ai_custom_rules")

    db.add(
        NotificationRecord(
            active_plant_id=plant.id,
            agent_task_id=task.id,
            title="Agent task decision recorded",
            message=f"{task.action_title} -> {task.status}",
            channel="in-app",
        )
    )

    return task
