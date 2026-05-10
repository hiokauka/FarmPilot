from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from enum import Enum

class StageName(str, Enum):
    SEEDLING = "Seedling"
    VEGETATIVE = "Vegetative"
    FLOWERING = "Flowering"
    FRUITING = "Fruiting"
    HARVEST = "Harvest"

class MetricRange(BaseModel):
    min: float
    max: float
    optimal: float

class OptimalMetrics(BaseModel):
    temperature: MetricRange
    humidity: MetricRange
    soilMoisture: MetricRange
    ph: MetricRange
    dli: MetricRange

class GrowthStage(BaseModel):
    name: StageName
    startDay: int
    endDay: int
    optimalMetrics: OptimalMetrics
    aiCultivationNotes: List[str]

class CropKnowledgeProfile(BaseModel):
    id: str
    name: str
    scientificName: str
    expectedLifespanDays: int
    stages: List[GrowthStage]

class PlantStatus(str, Enum):
    GROWING = "Growing"
    HARVESTED = "Harvested"
    TERMINATED = "Terminated"

class CurrentMetrics(BaseModel):
    temperature: float
    humidity: float
    soilMoisture: float
    ph: float
    dli: float

class ActivePlant(BaseModel):
    id: str
    customLabel: str
    cropProfileId: str
    status: PlantStatus
    plantedAt: datetime
    currentStage: StageName
    dayCount: int
    healthScore: float
    predictedYield: float
    location: str
    currentMetrics: CurrentMetrics

class SensorType(str, Enum):
    TEMPERATURE = "Temperature"
    HUMIDITY = "Humidity"
    SOIL_MOISTURE = "Soil_Moisture"
    PH = "pH"
    EC = "EC"
    LIGHT = "Light"

class SensorStatus(str, Enum):
    ONLINE = "Online"
    OFFLINE = "Offline"
    WARNING = "Warning"

class Sensor(BaseModel):
    id: str
    type: SensorType
    modelName: str
    batteryLevel: int
    status: SensorStatus
    activePlantId: str
    lastSync: datetime
    currentValue: float

class TaskPriority(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"

class TaskStatus(str, Enum):
    PENDING = "Pending"
    AUTO_APPROVED = "Auto-Approved"
    MANUALLY_APPROVED = "Manually-Approved"
    REJECTED = "Rejected"

class AgentTask(BaseModel):
    id: str
    activePlantId: str
    actionTitle: str
    priority: TaskPriority
    reasoning: str
    confidenceScore: float
    predictedImpact: str
    status: TaskStatus
    createdAt: datetime
    executedAt: Optional[datetime] = None
