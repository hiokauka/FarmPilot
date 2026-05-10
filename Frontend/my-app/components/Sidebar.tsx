"use client";

import { usePlant } from "@/context/PlantContext";
import { useState, useEffect } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

function PlantStatusDot({ plantId, attentionNeeded }: { plantId: string; attentionNeeded?: boolean }) {
  const [status, setStatus] = useState<"attention" | "offline" | "online">("online");

  useEffect(() => {
    if (attentionNeeded) {
      setStatus("attention");
      return;
    }
    fetch(`${API_BASE}/api/plants/${plantId}/sensors`)
      .then(res => res.json())
      .then((sensors: { status: string }[]) => {
        if (!Array.isArray(sensors) || sensors.length === 0) { setStatus("online"); return; }
        const hasOffline = sensors.some(s => s.status === "Offline");
        setStatus(hasOffline ? "offline" : "online");
      })
      .catch(() => setStatus("offline"));
  }, [plantId, attentionNeeded]);

  const dotClass =
    status === "attention" ? "bg-yellow-500 animate-pulse" :
    status === "offline"   ? "bg-red-500" :
                             "bg-emerald-500";

  return <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dotClass}`} />;
}

export default function Sidebar() {
  const { plants, activePlantId, setActivePlantId, addPlant } = usePlant();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPlantName, setNewPlantName] = useState("");
  const [newPlantType, setNewPlantType] = useState("Strawberry");

  const handleAddPlant = () => {
    if (newPlantName) {
      addPlant(newPlantName, newPlantType);
      setIsModalOpen(false);
      setNewPlantName("");
    }
  };

  return (
    <>
      <div className="w-72 bg-[#09090b] border-r border-zinc-800 flex flex-col h-full flex-shrink-0 z-10 glass-panel">
        {/* Logo */}
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10"/>
              <path d="M12 2c2.5 2.5 4 6 4 10"/>
              <path d="M12 2c-2.5 2.5-4 6-4 10"/>
              <path d="M2 12h20"/>
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-zinc-100">FarmPilot</span>
        </div>

        {/* Add Plant Button */}
        <div className="px-4 pb-4">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-all border border-zinc-700 hover:border-zinc-600 text-sm font-medium"
          >
            <span>＋</span> Add plant profile
          </button>
        </div>

        {/* Plant List */}
        <div className="px-4 py-2 flex-1 overflow-y-auto">
          <div className="text-xs font-semibold text-zinc-500 mb-3 px-2 tracking-wider">MY PLANTS</div>
          <div className="flex flex-col gap-2">
            {plants.map((plant) => (
              <button
                key={plant.id}
                onClick={() => setActivePlantId(plant.id)}
                className={`flex items-center justify-between p-3 rounded-xl text-left transition-all ${
                  activePlantId === plant.id 
                    ? "bg-emerald-500/10 border border-emerald-500/30" 
                    : "bg-zinc-900/50 border border-zinc-800/50 hover:bg-zinc-800 hover:border-zinc-700"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className={`font-medium text-sm truncate ${activePlantId === plant.id ? "text-emerald-400" : "text-zinc-300"}`}>
                    {plant.customLabel}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    {plant.currentStage} · Day {plant.dayCount}
                  </div>
                </div>
                {/* Dynamic Status Dot: attention > offline > online */}
                <PlantStatusDot plantId={plant.id} attentionNeeded={plant.attentionNeeded} />
              </button>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="px-4 pt-3 pb-2 border-t border-zinc-800/50">
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-2">Status Legend</p>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-[10px] text-zinc-500">
              <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" /> Attention needed
            </div>
            <div className="flex items-center gap-2 text-[10px] text-zinc-500">
              <div className="w-2 h-2 rounded-full bg-red-500" /> Sensor offline
            </div>
            <div className="flex items-center gap-2 text-[10px] text-zinc-500">
              <div className="w-2 h-2 rounded-full bg-emerald-500" /> All systems online
            </div>
          </div>
        </div>

        {/* Navigation / Global actions */}
        <div className="p-4 border-t border-zinc-800 space-y-1">
          <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 text-left">
            <div className="w-4 h-4 rounded-full border border-current opacity-70"></div>
            Global Overview
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 text-left">
            <div className="w-4 h-4 rounded-full border border-current opacity-70"></div>
            Settings
          </button>
        </div>
      </div>

      {/* Add Plant Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#09090b] border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-2">Add Plant Profile</h2>
            <p className="text-sm text-zinc-400 mb-6">Create a new plant profile to begin tracking metrics.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Custom Name</label>
                <input 
                  type="text" 
                  value={newPlantName}
                  onChange={(e) => setNewPlantName(e.target.value)}
                  placeholder="e.g. Strawberry A"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Crop Type</label>
                <select 
                  value={newPlantType}
                  onChange={(e) => setNewPlantType(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-200 focus:outline-none focus:border-emerald-500"
                >
                  <option>Strawberry</option>
                  <option>Tomato</option>
                  <option>Lettuce</option>
                  <option>Basil</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddPlant}
                disabled={!newPlantName}
                className="px-4 py-2 text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add to Farm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}