"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type Plant = {
  id: string;
  name: string;
  type: string;
  stage: string;
  day: number;
  health: number; // 0-100
  metrics: {
    temp: { current: number; min: number; max: number };
    humidity: { current: number; min: number; max: number };
    soilMoisture: { current: number; min: number; max: number };
    ph: { current: number; min: number; max: number };
    light: { current: number; min: number; max: number; hours: number };
  };
};

const defaultPlants: Plant[] = [
  {
    id: "p1",
    name: "Lettuce A",
    type: "Lettuce (Butterhead)",
    stage: "Vegetative",
    day: 24,
    health: 98,
    metrics: {
      temp: { current: 22.5, min: 18, max: 24 },
      humidity: { current: 65, min: 50, max: 70 },
      soilMoisture: { current: 72, min: 60, max: 80 },
      ph: { current: 6.2, min: 5.8, max: 6.5 },
      light: { current: 14000, min: 12000, max: 18000, hours: 14 },
    },
  },
  {
    id: "p2",
    name: "Basil B",
    type: "Sweet Basil",
    stage: "Harvest",
    day: 42,
    health: 92,
    metrics: {
      temp: { current: 24.1, min: 20, max: 28 },
      humidity: { current: 58, min: 40, max: 60 },
      soilMoisture: { current: 65, min: 50, max: 70 },
      ph: { current: 6.5, min: 6.0, max: 7.0 },
      light: { current: 16000, min: 14000, max: 20000, hours: 16 },
    },
  },
  {
    id: "p3",
    name: "Microgreens C",
    type: "Arugula Microgreens",
    stage: "Seedling",
    day: 5,
    health: 100,
    metrics: {
      temp: { current: 21.0, min: 18, max: 22 },
      humidity: { current: 75, min: 60, max: 80 },
      soilMoisture: { current: 85, min: 70, max: 90 },
      ph: { current: 6.0, min: 5.5, max: 6.5 },
      light: { current: 8000, min: 5000, max: 10000, hours: 12 },
    },
  },
];

type PlantContextType = {
  plants: Plant[];
  activePlantId: string | null;
  activePlant: Plant | null;
  setActivePlantId: (id: string) => void;
  addPlant: (name: string, type: string) => void;
};

const PlantContext = createContext<PlantContextType | undefined>(undefined);

export function PlantProvider({ children }: { children: React.ReactNode }) {
  const [plants, setPlants] = useState<Plant[]>(defaultPlants);
  const [activePlantId, setActivePlantId] = useState<string | null>(defaultPlants[0].id);

  const activePlant = plants.find((p) => p.id === activePlantId) || null;

  const addPlant = (name: string, type: string) => {
    const newPlant: Plant = {
      id: `p${Date.now()}`,
      name,
      type,
      stage: "Seedling",
      day: 1,
      health: 100,
      metrics: {
        temp: { current: 22, min: 18, max: 24 },
        humidity: { current: 60, min: 50, max: 70 },
        soilMoisture: { current: 70, min: 60, max: 80 },
        ph: { current: 6.0, min: 5.8, max: 6.5 },
        light: { current: 10000, min: 8000, max: 12000, hours: 14 },
      },
    };
    setPlants((prev) => [...prev, newPlant]);
    setActivePlantId(newPlant.id); // Auto-select the newly added plant
  };

  return (
    <PlantContext.Provider value={{ plants, activePlantId, activePlant, setActivePlantId, addPlant }}>
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
