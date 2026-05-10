"use client";

import React, { createContext, useContext, useState } from "react";
import { ActivePlant, CropKnowledgeProfile, Sensor, AgentTask } from "@/lib/schema";

// --- MOCK DATA BASED ON NEW SCHEMA ---

export const mockCropProfiles: Record<string, CropKnowledgeProfile> = {
  "prof-lettuce": {
    id: "prof-lettuce",
    name: "Butterhead Lettuce",
    scientificName: "Lactuca sativa",
    expectedLifespanDays: 45,
    stages: [
      {
        name: "Seedling", startDay: 0, endDay: 14,
        optimalMetrics: {
          temperature: { min: 18, max: 22, optimal: 20 },
          humidity: { min: 60, max: 75, optimal: 65 },
          soilMoisture: { min: 70, max: 85, optimal: 80 },
          ph: { min: 5.8, max: 6.2, optimal: 6.0 },
          dli: { min: 10, max: 14, optimal: 12 }
        },
        aiCultivationNotes: ["Keep humidity high to prevent seed coat sticking.", "Ensure gentle airflow to strengthen early stems."],
        scheduleRules: { irrigationCycle: "Every 6 hours (5m)", targetDli: 12 }
      },
      {
        name: "Vegetative", startDay: 15, endDay: 35,
        optimalMetrics: {
          temperature: { min: 16, max: 24, optimal: 21 },
          humidity: { min: 50, max: 70, optimal: 60 },
          soilMoisture: { min: 60, max: 80, optimal: 70 },
          ph: { min: 5.8, max: 6.5, optimal: 6.2 },
          dli: { min: 12, max: 17, optimal: 15 }
        },
        aiCultivationNotes: ["Watch out for tip burn if DLI exceeds 17.", "Maintain EC around 1.2-1.6."],
        scheduleRules: { irrigationCycle: "Every 4 hours (10m)", targetDli: 15 }
      },
      {
        name: "Harvest", startDay: 36, endDay: 45,
        optimalMetrics: {
          temperature: { min: 15, max: 20, optimal: 18 },
          humidity: { min: 40, max: 60, optimal: 50 },
          soilMoisture: { min: 50, max: 70, optimal: 60 },
          ph: { min: 6.0, max: 6.5, optimal: 6.2 },
          dli: { min: 12, max: 15, optimal: 14 }
        },
        aiCultivationNotes: ["Drop temp by 2°C at night to improve crispness.", "Reduce irrigation frequency."],
        scheduleRules: { irrigationCycle: "Every 8 hours (10m)", targetDli: 14 }
      }
    ]
  },
  "prof-strawberry": {
    id: "prof-strawberry",
    name: "Albion Strawberry",
    scientificName: "Fragaria × ananassa",
    expectedLifespanDays: 90,
    stages: [
      {
        name: "Vegetative", startDay: 0, endDay: 30,
        optimalMetrics: {
          temperature: { min: 18, max: 24, optimal: 21 },
          humidity: { min: 60, max: 75, optimal: 65 },
          soilMoisture: { min: 60, max: 75, optimal: 70 },
          ph: { min: 5.5, max: 6.2, optimal: 5.8 },
          dli: { min: 15, max: 20, optimal: 18 }
        },
        aiCultivationNotes: ["Ensure high light intensity for strong crown development.", "Keep roots moist but not waterlogged."],
        scheduleRules: { irrigationCycle: "Every 4 hours (10m)", targetDli: 18 }
      },
      {
        name: "Flowering", startDay: 31, endDay: 60,
        optimalMetrics: {
          temperature: { min: 16, max: 22, optimal: 20 },
          humidity: { min: 50, max: 65, optimal: 60 },
          soilMoisture: { min: 65, max: 80, optimal: 75 },
          ph: { min: 5.5, max: 6.2, optimal: 5.8 },
          dli: { min: 20, max: 25, optimal: 22 }
        },
        aiCultivationNotes: ["Pollination via airflow or insects is critical.", "Increase potassium in nutrient solution."],
        scheduleRules: { irrigationCycle: "Every 3 hours (15m)", targetDli: 22 }
      },
      {
        name: "Fruiting", startDay: 61, endDay: 90,
        optimalMetrics: {
          temperature: { min: 15, max: 21, optimal: 18 },
          humidity: { min: 45, max: 60, optimal: 50 },
          soilMoisture: { min: 65, max: 75, optimal: 70 },
          ph: { min: 5.5, max: 6.0, optimal: 5.7 },
          dli: { min: 18, max: 22, optimal: 20 }
        },
        aiCultivationNotes: ["Lower night temps to increase sugar content (Brix).", "Monitor for grey mold (Botrytis)."],
        scheduleRules: { irrigationCycle: "Every 4 hours (15m)", targetDli: 20 }
      }
    ]
  },
  "prof-tomato": {
    id: "prof-tomato",
    name: "Cherry Tomato",
    scientificName: "Solanum lycopersicum",
    expectedLifespanDays: 120,
    stages: [
      {
        name: "Vegetative", startDay: 0, endDay: 40,
        optimalMetrics: {
          temperature: { min: 20, max: 28, optimal: 24 },
          humidity: { min: 60, max: 70, optimal: 65 },
          soilMoisture: { min: 60, max: 80, optimal: 70 },
          ph: { min: 6.0, max: 6.8, optimal: 6.3 },
          dli: { min: 20, max: 30, optimal: 25 }
        },
        aiCultivationNotes: ["Prune side shoots (suckers) regularly.", "Ensure strong support structure."],
        scheduleRules: { irrigationCycle: "Every 4 hours (15m)", targetDli: 25 }
      },
      {
        name: "Flowering", startDay: 41, endDay: 80,
        optimalMetrics: {
          temperature: { min: 18, max: 26, optimal: 22 },
          humidity: { min: 50, max: 65, optimal: 55 },
          soilMoisture: { min: 70, max: 85, optimal: 75 },
          ph: { min: 6.0, max: 6.5, optimal: 6.2 },
          dli: { min: 25, max: 35, optimal: 30 }
        },
        aiCultivationNotes: ["Vibrating flower clusters improves fruit set.", "High calcium prevents blossom end rot."],
        scheduleRules: { irrigationCycle: "Every 3 hours (20m)", targetDli: 30 }
      }
    ]
  },
  "prof-basil": {
    id: "prof-basil",
    name: "Genovese Basil",
    scientificName: "Ocimum basilicum",
    expectedLifespanDays: 60,
    stages: [
      {
        name: "Vegetative", startDay: 0, endDay: 60,
        optimalMetrics: {
          temperature: { min: 21, max: 30, optimal: 25 },
          humidity: { min: 50, max: 70, optimal: 60 },
          soilMoisture: { min: 60, max: 80, optimal: 70 },
          ph: { min: 6.0, max: 7.0, optimal: 6.5 },
          dli: { min: 12, max: 18, optimal: 15 }
        },
        aiCultivationNotes: ["Pinch off flower buds to maintain leaf production.", "Sensitive to cold; avoid temps below 15°C."],
        scheduleRules: { irrigationCycle: "Every 6 hours (10m)", targetDli: 15 }
      }
    ]
  }
};

const defaultPlants: ActivePlant[] = [
  {
    id: "ap-1",
    customLabel: "Lettuce Rack A",
    cropProfileId: "prof-lettuce",
    status: "Growing",
    plantedAt: new Date(Date.now() - 24 * 24 * 60 * 60 * 1000), // 24 days ago
    currentStage: "Vegetative",
    dayCount: 24,
    healthScore: 98,
    predictedYield: 1.2,
    location: "Zone A, Rack 2",
    currentMetrics: {
      temperature: 22.5,
      humidity: 65,
      soilMoisture: 72,
      ph: 6.2,
      dli: 14.5
    }
  }
];

// --- CONTEXT SETUP ---

type PlantContextType = {
  plants: ActivePlant[];
  activePlantId: string | null;
  activePlant: ActivePlant | null;
  activeProfile: CropKnowledgeProfile | null;
  setActivePlantId: (id: string) => void;
  addPlant: (name: string, type: string) => void;
};

const PlantContext = createContext<PlantContextType | undefined>(undefined);

export function PlantProvider({ children }: { children: React.ReactNode }) {
  const [plants, setPlants] = useState<ActivePlant[]>(defaultPlants);
  const [activePlantId, setActivePlantId] = useState<string | null>(defaultPlants[0].id);

  const activePlant = plants.find((p) => p.id === activePlantId) || null;
  const activeProfile = activePlant ? mockCropProfiles[activePlant.cropProfileId] : null;

  const addPlant = (name: string, type: string) => {
    // Map human-readable type to profile ID
    const typeToId: Record<string, string> = {
      "Lettuce": "prof-lettuce",
      "Strawberry": "prof-strawberry",
      "Tomato": "prof-tomato",
      "Basil": "prof-basil"
    };

    const profileId = typeToId[type] || "prof-lettuce";
    const profile = mockCropProfiles[profileId];

    const newPlant: ActivePlant = {
      id: `ap-${Date.now()}`,
      customLabel: name,
      cropProfileId: profileId,
      status: "Growing",
      plantedAt: new Date(),
      currentStage: profile.stages[0].name,
      dayCount: 1,
      healthScore: 100,
      predictedYield: 0,
      location: "Unassigned",
      currentMetrics: {
        temperature: profile.stages[0].optimalMetrics.temperature.optimal,
        humidity: profile.stages[0].optimalMetrics.humidity.optimal,
        soilMoisture: profile.stages[0].optimalMetrics.soilMoisture.optimal,
        ph: profile.stages[0].optimalMetrics.ph.optimal,
        dli: profile.stages[0].optimalMetrics.dli.optimal
      }
    };
    setPlants((prev) => [...prev, newPlant]);
    setActivePlantId(newPlant.id);
  };

  return (
    <PlantContext.Provider value={{ plants, activePlantId, activePlant, activeProfile, setActivePlantId, addPlant }}>
      {children}
    </PlantContext.Provider>
  );
}

export function usePlant() {
  const context = useContext(PlantContext);
  if (context === undefined) {
    throw new Error("usePlant must be used within a PlantProvider");
  }
  return context;
}
