export type StageName = "Seedling" | "Vegetative" | "Flowering" | "Fruiting" | "Harvest";

export interface MetricRange {
  min: number;
  max: number;
  optimal: number;
}

export interface GrowthStage {
  name: StageName;
  startDay: number;
  endDay: number;
  optimalMetrics: {
    temperature: MetricRange;
    humidity: MetricRange;
    soilMoisture: MetricRange;
    ph: MetricRange;
    dli: MetricRange; // Daily Light Integral
  };
  aiCultivationNotes: string[];
  scheduleRules: {
    irrigationCycle: string;
    targetDli: number;
  };
}

export interface CropKnowledgeProfile {
  id: string;
  name: string;
  scientificName: string;
  expectedLifespanDays: number;
  stages: GrowthStage[];
}

export interface ActivePlant {
  id: string;
  customLabel: string;
  cropProfileId: string;
  status: "Growing" | "Harvested" | "Terminated";
  plantedAt: Date;
  currentStage: StageName;
  dayCount: number; // Current day relative to plantedAt
  healthScore: number;
  predictedYield: number;
  location: string;
  
  // Real-time metrics aggregated from sensors linked to this plant
  currentMetrics: {
    temperature: number;
    humidity: number;
    soilMoisture: number;
    ph: number;
    dli: number;
  };
  aiCustomRules?: Record<string, unknown>;
  lastAnalysisAt?: string;
  attentionNeeded?: boolean;
}

export interface Sensor {
  id: string;
  type: "Temperature" | "Humidity" | "Soil_Moisture" | "pH" | "EC" | "Light";
  modelName: string;
  batteryLevel: number;
  status: "Online" | "Offline" | "Warning" | "Interpolating";
  activePlantId: string;
  lastSync: Date;
  currentValue: number;
}

export interface AgentTask {
  id: string;
  activePlantId: string;
  actionTitle: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  reasoning: string;
  confidenceScore: number;
  predictedImpact: string;
  status: "Pending" | "Auto-Approved" | "Manually-Approved" | "Rejected";
  createdAt: Date;
  executedAt?: Date;
  approvalRequired?: boolean;
  proposedRules?: Record<string, unknown>;
  metricAdjustments?: Record<string, number>;
}

export interface AgentConfig {
  activePlantId: string;
  approvalMode: "ask" | "auto";
  updatedAt: Date;
}

export interface AgentActivityEvent {
  kind: "task" | "notification" | "analysis";
  timestamp: Date;
  title: string;
  detail: string;
  status?: string;
}
