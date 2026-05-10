import { ActivePlant, CropKnowledgeProfile, GrowthStage } from "./schema";

export interface MetricScore {
  name: string;
  key: string;
  score: number; // 0-100
  status: "ok" | "warning" | "critical";
  trend: "up" | "down" | "stable";
  current: number;
  optimal: number;
}

export interface StageTimelineItem {
  name: string;
  startDay: number;
  endDay: number;
  isCurrent: boolean;
  isCompleted: boolean;
}

export interface ForecastPoint {
  day: number;
  temp: number;
  soil: number;
  dli: number;
}

export interface PredictiveData {
  overallRiskScore: number;
  metricScores: MetricScore[];
  daysToHarvest: number;
  growthProgress: number;
  stageTimeline: StageTimelineItem[];
  forecastPoints: ForecastPoint[];
}

function scoreMetric(current: number, min: number, max: number, optimal: number): number {
  if (current >= min && current <= max) {
    const distToOptimal = Math.abs(current - optimal);
    const halfRange = (max - min) / 2 || 1;
    return Math.round(100 - (distToOptimal / halfRange) * 15);
  }
  const breach = current < min ? min - current : current - max;
  const rangeSize = max - min || 1;
  const penalty = Math.min(100, Math.round((breach / rangeSize) * 100));
  return Math.max(0, 100 - penalty - 20);
}

export function computePredictiveData(
  plant: ActivePlant,
  profile: CropKnowledgeProfile
): PredictiveData {
  const currentStage = profile.stages.find((s) => s.name === plant.currentStage) || profile.stages[0];

  const metrics = [
    { name: "Temperature", key: "temperature", current: plant.currentMetrics.temperature, range: currentStage.optimalMetrics.temperature },
    { name: "Humidity", key: "humidity", current: plant.currentMetrics.humidity, range: currentStage.optimalMetrics.humidity },
    { name: "Soil Moisture", key: "soilMoisture", current: plant.currentMetrics.soilMoisture, range: currentStage.optimalMetrics.soilMoisture },
    { name: "pH Level", key: "ph", current: plant.currentMetrics.ph, range: currentStage.optimalMetrics.ph },
    { name: "DLI (Light)", key: "dli", current: plant.currentMetrics.dli, range: currentStage.optimalMetrics.dli },
  ];

  const metricScores: MetricScore[] = metrics.map((m) => {
    const score = scoreMetric(m.current, m.range.min, m.range.max, m.range.optimal);
    let status: "ok" | "warning" | "critical" = "ok";
    if (score < 40) status = "critical";
    else if (score < 80) status = "warning";

    let trend: "up" | "down" | "stable" = "stable";
    if (m.current > m.range.optimal * 1.05) trend = "up";
    else if (m.current < m.range.optimal * 0.95) trend = "down";

    return {
      name: m.name,
      key: m.key,
      score,
      status,
      trend,
      current: m.current,
      optimal: m.range.optimal,
    };
  });

  const averageHealth = metricScores.reduce((acc, s) => acc + s.score, 0) / metricScores.length;
  const overallRiskScore = Math.round(100 - averageHealth);

  const daysToHarvest = Math.max(0, profile.expectedLifespanDays - plant.dayCount);
  const growthProgress = Math.min(100, Math.round((plant.dayCount / profile.expectedLifespanDays) * 100));

  const stageTimeline: StageTimelineItem[] = profile.stages.map((s) => ({
    name: s.name,
    startDay: s.startDay,
    endDay: s.endDay,
    isCurrent: s.name === plant.currentStage,
    isCompleted: plant.dayCount > s.endDay,
  }));

  // Simple 7-day forecast simulation
  const forecastPoints: ForecastPoint[] = Array.from({ length: 7 }).map((_, i) => {
    const day = plant.dayCount + i + 1;
    // Interpolate towards optimal or simulate jitter
    const factor = (i + 1) / 10;
    return {
      day,
      temp: plant.currentMetrics.temperature + (currentStage.optimalMetrics.temperature.optimal - plant.currentMetrics.temperature) * factor + (Math.random() - 0.5),
      soil: plant.currentMetrics.soilMoisture + (currentStage.optimalMetrics.soilMoisture.optimal - plant.currentMetrics.soilMoisture) * factor + (Math.random() - 0.5) * 2,
      dli: plant.currentMetrics.dli + (currentStage.optimalMetrics.dli.optimal - plant.currentMetrics.dli) * factor + (Math.random() - 0.5),
    };
  });

  return {
    overallRiskScore,
    metricScores,
    daysToHarvest,
    growthProgress,
    stageTimeline,
    forecastPoints,
  };
}
