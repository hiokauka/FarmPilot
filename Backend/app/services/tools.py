from __future__ import annotations
from typing import Optional
from pydantic import BaseModel, Field

class ProposeActionTool(BaseModel):
    """
    Tool used by the Agentic AI to propose an actionable recommendation for a plant.
    Call this tool multiple times to propose multiple different actions.
    If no actions are necessary, call it once with an action indicating to maintain current settings.
    """
    action_title: str = Field(
        ...,
        description="A concise, actionable title for the recommendation (e.g., 'Increase fertigation frequency by 15%')."
    )
    priority: str = Field(
        ...,
        description="Priority of the recommendation. Must be one of 'Low', 'Medium', or 'High'."
    )
    reasoning: str = Field(
        ...,
        description="Detailed explanation of why this action is recommended, based on current sensor data and stage optimal metrics."
    )
    confidence_score: float = Field(
        ...,
        description="A confidence score between 0.0 and 100.0 representing how certain the AI is about this recommendation."
    )
    predicted_impact: str = Field(
        ...,
        description="The expected outcome if this action is applied (e.g., 'Reduces water stress and restores stable root uptake')."
    )

class PlantRules(BaseModel):
    """Specific environmental rules customized by the AI for this plant."""
    temperature_min: float | None = None
    temperature_max: float | None = None
    soil_moisture_min: float | None = None
    soil_moisture_max: float | None = None
    target_dli: float | None = None
    ph_min: float | None = None
    ph_max: float | None = None
    humidity_min: float | None = None
    humidity_max: float | None = None
    ai_cultivation_notes: list[str] | None = None

class AgentResponse(BaseModel):
    """The structured response from the Agentic AI."""
    summary: str = Field(..., description="A short summary of your overall analysis (e.g. 'Environment is stable', or 'Anomaly detected in soil moisture, recommending fertigation').")
    actions: list[ProposeActionTool] = Field(default_factory=list, description="A list of proposed actions. If the environment is stable, you can propose a single action to 'Keep current settings' or leave empty.")
    updated_rules: Optional[PlantRules] = Field(default=None, description="If you determine the current optimal ranges need to be adjusted for this specific plant's health, provide the updated rules here.")
