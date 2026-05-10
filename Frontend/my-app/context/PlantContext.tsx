"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { ActivePlant, CropKnowledgeProfile } from "@/lib/schema";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

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
  const [plants, setPlants] = useState<ActivePlant[]>([]);
  const [profiles, setProfiles] = useState<
    Record<string, CropKnowledgeProfile>
  >({});
  const [activePlantId, setActivePlantId] = useState<string | null>(null);

  const activePlant = plants.find((p) => p.id === activePlantId) || null;
  const activeProfile = activePlant
    ? (profiles[activePlant.cropProfileId] ?? null)
    : null;

  useEffect(() => {
    async function load() {
      try {
        const [profilesRes, plantsRes] = await Promise.all([
          fetch(`${API_BASE}/api/profiles`),
          fetch(`${API_BASE}/api/plants`),
        ]);
        if (!profilesRes.ok || !plantsRes.ok)
          throw new Error("Failed to load data from API");
        const profilesJson = await profilesRes.json();
        const plantsJson = await plantsRes.json();

        const profilesMap: Record<string, CropKnowledgeProfile> = {};
        for (const p of profilesJson) profilesMap[p.id] = p;

        const plantsData: ActivePlant[] = plantsJson.map((pl: { plantedAt: string; [key: string]: unknown }) => ({
          ...pl,
          plantedAt: new Date(pl.plantedAt),
        }));

        setProfiles(profilesMap);
        setPlants(plantsData);
        if (plantsData.length) setActivePlantId((id) => id ?? plantsData[0].id);
      } catch (err) {
        console.error("Error loading plants/profiles:", err);
      }
    }
    load();
  }, []);

  const addPlant = (name: string, type: string) => {
    const profile = Object.values(profiles).find((p) =>
      p.name.toLowerCase().includes(type.toLowerCase()),
    );
    const cropProfileId = profile?.id ?? Object.keys(profiles)[0];
    if (!cropProfileId) return;

    fetch(`${API_BASE}/api/plants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customLabel: name, cropProfileId }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to create plant");
        const pl = await res.json();
        const newPlant: ActivePlant = {
          ...pl,
          plantedAt: new Date(pl.plantedAt),
        };
        setPlants((prev) => [...prev, newPlant]);
        setActivePlantId(newPlant.id);
      })
      .catch((err) => console.error("Error creating plant:", err));
  };

  return (
    <PlantContext.Provider
      value={{
        plants,
        activePlantId,
        activePlant,
        activeProfile,
        setActivePlantId,
        addPlant,
      }}
    >
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
