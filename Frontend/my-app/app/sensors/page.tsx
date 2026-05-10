"use client";

import { usePlant } from "@/context/PlantContext";
import PlantHeader from "@/components/PlantHeader";
import { Sensor } from "@/lib/schema";
import { useEffect, useState } from "react";

export default function Sensors() {
  const { activePlant } = usePlant();
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSensorType, setNewSensorType] = useState("Temperature");
  const [newModelName, setNewModelName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const fetchSensors = async (showLoading = true) => {
    if (!activePlant) return;
    if (showLoading) setIsLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/plants/${activePlant.id}/sensors`);
      if (res.ok) {
        const data = await res.json();
        setSensors(data);
      }
    } catch (error) {
      console.error("Failed to fetch sensors:", error);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSensors(true);

    const interval = setInterval(() => fetchSensors(false), 5000);
    return () => clearInterval(interval);
  }, [activePlant?.id]);

  const handleAddSensor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePlant || !newModelName.trim()) return;

    setIsAdding(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/plants/${activePlant.id}/sensors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sensorType: newSensorType,
          modelName: newModelName,
          batteryLevel: 100
        }),
      });

      if (res.ok) {
        // Refresh sensor list
        await fetchSensors();
        setIsModalOpen(false);
        setNewModelName("");
        setNewSensorType("Temperature");
      }
    } catch (error) {
      console.error("Failed to add sensor:", error);
    } finally {
      setIsAdding(false);
    }
  };

  if (!activePlant) {
    return (
      <div className="flex-1 flex flex-col">
        <PlantHeader />
        <div className="flex-1 flex items-center justify-center text-zinc-500">
          Select a plant from the sidebar
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#09090b] animate-fade-in relative">
      <PlantHeader title="Sensor Network" />

      <div className="p-8 space-y-8 flex-1 overflow-y-auto">
        
        <div className="flex justify-between items-end stagger-1">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">Active Sensors</h2>
            <p className="text-sm text-zinc-400">Monitoring equipment linked to {activePlant.customLabel}</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors border border-emerald-500/20 shadow-lg shadow-emerald-500/10"
          >
            + Link New Sensor
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-zinc-500">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mr-3"></div>
            Loading sensors from database...
          </div>
        ) : sensors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/30">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mb-4 opacity-50"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1" fill="currentColor"/></svg>
            <p className="mb-2 text-zinc-300 font-medium">No sensors linked</p>
            <p className="text-sm mb-6">Connect hardware to start monitoring environmental data.</p>
            <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors">
              Add First Sensor
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 stagger-2">
            {sensors.map((s) => {
              const date = new Date(s.lastSync);
              const formattedSync = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
              
              let unit = "";
              if (s.type === "Temperature") unit = "°C";
              else if (s.type === "Humidity" || s.type === "Soil_Moisture") unit = "%";
              else if (s.type === "pH") unit = "";

              return (
                <div key={s.id} className="glass-card p-5 rounded-2xl">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-zinc-400 ${s.status.toLowerCase() === "warning" ? "bg-yellow-500/10" : "bg-emerald-500/10"}`}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1" fill="currentColor"/></svg>
                      </div>
                      <div>
                        <div className="font-semibold text-zinc-200">{s.type.replace('_', ' ')}</div>
                        <div className="text-xs text-zinc-500">{s.id} · {s.modelName}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="text-2xl font-bold text-white mb-1">{s.currentValue}{unit}</div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`px-2 py-0.5 rounded ${s.status.toLowerCase() === "online" ? "bg-emerald-500/10 text-emerald-400" : "bg-yellow-500/10 text-yellow-500"}`}>
                        {s.status.toUpperCase()}
                      </span>
                      <span className="text-zinc-500">Sync: {formattedSync}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-zinc-800/50 flex justify-between items-center text-xs text-zinc-400">
                    <span>Battery</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div className={`h-full ${s.batteryLevel > 50 ? "bg-emerald-500" : "bg-yellow-500"}`} style={{ width: `${s.batteryLevel}%` }}></div>
                      </div>
                      <span>{s.batteryLevel}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Sensor Modal Overlay */}
      {isModalOpen && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f0f13] border border-zinc-800 rounded-2xl p-8 w-full max-w-md shadow-2xl animate-fade-in">
            <h3 className="text-xl font-bold text-white mb-2">Add New Sensor</h3>
            <p className="text-sm text-zinc-400 mb-6">Link a new IoT sensor to {activePlant.customLabel}.</p>
            
            <form onSubmit={handleAddSensor} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Sensor Type</label>
                <select 
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  value={newSensorType}
                  onChange={(e) => setNewSensorType(e.target.value)}
                >
                  <option value="Temperature">Temperature</option>
                  <option value="Humidity">Humidity</option>
                  <option value="Soil_Moisture">Soil Moisture</option>
                  <option value="pH">pH Sensor</option>
                  <option value="EC">Electrical Conductivity (EC)</option>
                  <option value="Light">Light / DLI Meter</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Hardware Model Name</label>
                <input 
                  type="text" 
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="e.g. DHT-22 Plus"
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                  required
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isAdding || !newModelName.trim()}
                  className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center"
                >
                  {isAdding ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    "Add to Farm"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
