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
        aiCultivationNotes: ["Keep humidity high to prevent seed coat sticking.", "Ensure gentle airflow to strengthen early stems."]
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
        aiCultivationNotes: ["Watch out for tip burn if DLI exceeds 17.", "Maintain EC around 1.2-1.6."]
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
        aiCultivationNotes: ["Drop temp by 2°C at night to improve crispness.", "Reduce irrigation frequency."]
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
    // Basic mock implementation for adding
    const newPlant: ActivePlant = {
      id: `ap-${Date.now()}`,
      customLabel: name,
      cropProfileId: "prof-lettuce", // Hardcoding to lettuce profile for mock
      status: "Growing",
      plantedAt: new Date(),
      currentStage: "Seedling",
      dayCount: 1,
      healthScore: 100,
      predictedYield: 0,
      location: "Unassigned",
      currentMetrics: {
        temperature: 20,
        humidity: 65,
        soilMoisture: 80,
        ph: 6.0,
        dli: 12
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
