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
    from app.services.tools import RecommendationList
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False

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

    rules_context = json.dumps(plant.ai_custom_rules) if plant.ai_custom_rules else "None (Using Stage Defaults)"

    context_prompt = f"""
    You are an expert autonomous agricultural AI agent. 
    Your task is to analyze the current sensor metrics for a plant and output recommended actions to optimize its growth.
    
    Plant Details:
    - Crop: {crop.name}
    - Current Stage: {stage.name}
    - Current Health Score: {plant.health_score}

    Stage Default Optimal Ranges:
    - Temperature: {stage.temperature_min}-{stage.temperature_max}C
    - Soil Moisture: {stage.soil_moisture_min}-{stage.soil_moisture_max}%
    - DLI (Daily Light Integral): Target {stage.target_dli}
    
    Active Custom AI Rules for this plant:
    {rules_context}

    Current Sensor Readings:
    - Temperature: {plant.temperature}C
    - Soil Moisture: {plant.soil_moisture}%
    - DLI: {plant.dli}

    Analyze the sensor readings. Propose specific actions to fix any metrics that are out of bounds.
    If you think the rule bounds should be updated (e.g. the plant is stable but slightly outside default range), supply updated_rules.
    If stable, propose an action to maintain settings, or leave actions empty.
    Provide a concise summary of your findings.
    """

    try:
        model_name = os.environ.get("LLM_MODEL", "gemini-2.5-flash")
        response = client.models.generate_content(
            model=model_name,
            contents=context_prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=AgentResponse,
                temperature=0.2,
            ),
        )
        
        data = json.loads(response.text)
        summary = data.get("summary", "Analysis complete.")
        updated_rules = data.get("updated_rules")
        
        if updated_rules:
            merged_proposed_rules = {}
            for k, v in updated_rules.items():
                if v is not None:
                    merged_proposed_rules[k] = v
            
            if merged_proposed_rules:
                actions_list.append({
                    "action_title": "Update Cultivation Rules",
                    "priority": "High",
                    "reasoning": "AI agent suggests updating cultivation bounds based on recent sensor trends.",
                    "confidence_score": 90.0,
                    "predicted_impact": "Prevents future false alarms and optimizes growth thresholds.",
                    "proposed_rules": merged_proposed_rules
                })

        actions_list = data.get("actions", [])
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
            
        if not recommendations and not has_anomaly:
            # They didn't propose anything, that's fine if stable
            created = []
        else:
            if not recommendations:
                recommendations = _generate_recommendations_rule_based(plant, crop, stage)
            created = materialize_recommendations(db, plant, recommendations, approval_mode)
            
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
        print(f"Agent Engine error: {e}")
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
