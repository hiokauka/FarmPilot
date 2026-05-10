from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class CropProfileRecord(Base):
    __tablename__ = "crop_profiles"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    scientific_name: Mapped[str] = mapped_column(String(160), nullable=False)
    expected_lifespan_days: Mapped[int] = mapped_column(Integer, nullable=False)

    stages: Mapped[list["GrowthStageRecord"]] = relationship(back_populates="crop_profile", cascade="all, delete-orphan")
    plants: Mapped[list["ActivePlantRecord"]] = relationship(back_populates="crop_profile")


class GrowthStageRecord(Base):
    __tablename__ = "growth_stages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    crop_profile_id: Mapped[str] = mapped_column(ForeignKey("crop_profiles.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(40), nullable=False)
    start_day: Mapped[int] = mapped_column(Integer, nullable=False)
    end_day: Mapped[int] = mapped_column(Integer, nullable=False)
    temperature_min: Mapped[float] = mapped_column(Float, nullable=False)
    temperature_max: Mapped[float] = mapped_column(Float, nullable=False)
    temperature_optimal: Mapped[float] = mapped_column(Float, nullable=False)
    humidity_min: Mapped[float] = mapped_column(Float, nullable=False)
    humidity_max: Mapped[float] = mapped_column(Float, nullable=False)
    humidity_optimal: Mapped[float] = mapped_column(Float, nullable=False)
    soil_moisture_min: Mapped[float] = mapped_column(Float, nullable=False)
    soil_moisture_max: Mapped[float] = mapped_column(Float, nullable=False)
    soil_moisture_optimal: Mapped[float] = mapped_column(Float, nullable=False)
    ph_min: Mapped[float] = mapped_column(Float, nullable=False)
    ph_max: Mapped[float] = mapped_column(Float, nullable=False)
    ph_optimal: Mapped[float] = mapped_column(Float, nullable=False)
    dli_min: Mapped[float] = mapped_column(Float, nullable=False)
    dli_max: Mapped[float] = mapped_column(Float, nullable=False)
    dli_optimal: Mapped[float] = mapped_column(Float, nullable=False)
    ai_cultivation_notes: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    irrigation_cycle: Mapped[str] = mapped_column(String(80), nullable=False, default="Every 6 hours (5m)")
    target_dli: Mapped[float] = mapped_column(Float, nullable=False, default=12)

    crop_profile: Mapped[CropProfileRecord] = relationship(back_populates="stages")


class ActivePlantRecord(Base):
    __tablename__ = "active_plants"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    custom_label: Mapped[str] = mapped_column(String(120), nullable=False)
    crop_profile_id: Mapped[str] = mapped_column(ForeignKey("crop_profiles.id", ondelete="RESTRICT"), nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False)
    planted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    current_stage: Mapped[str] = mapped_column(String(40), nullable=False)
    day_count: Mapped[int] = mapped_column(Integer, nullable=False)
    health_score: Mapped[float] = mapped_column(Float, nullable=False)
    predicted_yield: Mapped[float] = mapped_column(Float, nullable=False)
    location: Mapped[str] = mapped_column(String(120), nullable=False)
    temperature: Mapped[float] = mapped_column(Float, nullable=False)
    humidity: Mapped[float] = mapped_column(Float, nullable=False)
    soil_moisture: Mapped[float] = mapped_column(Float, nullable=False)
    ph: Mapped[float] = mapped_column(Float, nullable=False)
    dli: Mapped[float] = mapped_column(Float, nullable=False)
    ai_custom_rules: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    last_analysis_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    crop_profile: Mapped[CropProfileRecord] = relationship(back_populates="plants")
    agent_config: Mapped["AgentConfigRecord | None"] = relationship(back_populates="plant", cascade="all, delete-orphan", uselist=False)
    sensors: Mapped[list["SensorRecord"]] = relationship(back_populates="plant", cascade="all, delete-orphan")
    tasks: Mapped[list["AgentTaskRecord"]] = relationship(back_populates="plant", cascade="all, delete-orphan")
    notifications: Mapped[list["NotificationRecord"]] = relationship(back_populates="plant", cascade="all, delete-orphan")


class AgentConfigRecord(Base):
    __tablename__ = "agent_configs"

    active_plant_id: Mapped[str] = mapped_column(ForeignKey("active_plants.id", ondelete="CASCADE"), primary_key=True)
    approval_mode: Mapped[str] = mapped_column(String(16), nullable=False, default="ask")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)

    plant: Mapped[ActivePlantRecord] = relationship(back_populates="agent_config")


class SensorRecord(Base):
    __tablename__ = "sensors"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    sensor_type: Mapped[str] = mapped_column(String(40), nullable=False)
    model_name: Mapped[str] = mapped_column(String(120), nullable=False)
    battery_level: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False)
    active_plant_id: Mapped[str] = mapped_column(ForeignKey("active_plants.id", ondelete="CASCADE"), nullable=False)
    last_sync: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    current_value: Mapped[float] = mapped_column(Float, nullable=False)

    plant: Mapped[ActivePlantRecord] = relationship(back_populates="sensors")


class AgentTaskRecord(Base):
    __tablename__ = "agent_tasks"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    active_plant_id: Mapped[str] = mapped_column(ForeignKey("active_plants.id", ondelete="CASCADE"), nullable=False)
    action_title: Mapped[str] = mapped_column(String(180), nullable=False)
    priority: Mapped[str] = mapped_column(String(20), nullable=False)
    reasoning: Mapped[str] = mapped_column(Text, nullable=False)
    confidence_score: Mapped[float] = mapped_column(Float, nullable=False)
    predicted_impact: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)
    executed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    approval_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    proposed_rules: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    metric_adjustments: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    plant: Mapped[ActivePlantRecord] = relationship(back_populates="tasks")


class NotificationRecord(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    active_plant_id: Mapped[str] = mapped_column(ForeignKey("active_plants.id", ondelete="CASCADE"), nullable=False)
    agent_task_id: Mapped[str | None] = mapped_column(ForeignKey("agent_tasks.id", ondelete="SET NULL"), nullable=True)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    channel: Mapped[str] = mapped_column(String(40), nullable=False, default="in-app")
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    plant: Mapped[ActivePlantRecord] = relationship(back_populates="notifications")

class AnalysisLogRecord(Base):
    __tablename__ = "analysis_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    active_plant_id: Mapped[str] = mapped_column(ForeignKey("active_plants.id", ondelete="CASCADE"), nullable=False)
    is_manual: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    status: Mapped[str] = mapped_column(String(40), nullable=False)
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_hidden: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)
