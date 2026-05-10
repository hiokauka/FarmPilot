"use client";

import { usePlant } from "@/context/PlantContext";
import PlantHeader from "@/components/PlantHeader";

export default function Sensors() {
  const { activePlant } = usePlant();

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

  const sensors = [
    { id: "S-104", type: "Air Temp/Humidity", model: "DHT-22 Plus", battery: 84, status: "online", lastSync: "Just now", value: `${activePlant.metrics.temp.current}°C / ${activePlant.metrics.humidity.current}%` },
    { id: "S-211", type: "Soil Moisture", model: "Capacitive SM-3", battery: 92, status: "online", lastSync: "2 min ago", value: `${activePlant.metrics.soilMoisture.current}%` },
    { id: "S-305", type: "Soil pH / EC", model: "Bluelab Pulse", battery: 45, status: "warning", lastSync: "15 min ago", value: `pH ${activePlant.metrics.ph.current}` },
    { id: "S-402", type: "Light Sensor", model: "PAR Meter X", battery: 100, status: "online", lastSync: "Just now", value: `${activePlant.metrics.light.current} lux` },
  ];

  return (
    <div className="flex-1 flex flex-col bg-[#09090b] animate-fade-in">
      <PlantHeader title="Sensor Network" />

      <div className="p-8 space-y-8">
        
        <div className="flex justify-between items-end stagger-1">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">Active Sensors</h2>
            <p className="text-sm text-zinc-400">Monitoring equipment linked to {activePlant.name}</p>
          </div>
          <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors border border-zinc-700">
            + Link New Sensor
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 stagger-2">
          {sensors.map((s) => (
            <div key={s.id} className="glass-card p-5 rounded-2xl">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-zinc-400 ${s.status === "warning" ? "bg-yellow-500/10" : "bg-emerald-500/10"}`}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1" fill="currentColor"/></svg>
                  </div>
                  <div>
                    <div className="font-semibold text-zinc-200">{s.type}</div>
                    <div className="text-xs text-zinc-500">{s.id} · {s.model}</div>
                  </div>
                </div>
              </div>
              
              <div className="mb-4">
                <div className="text-2xl font-bold text-white mb-1">{s.value}</div>
                <div className="flex items-center gap-2 text-xs">
                  <span className={`px-2 py-0.5 rounded ${s.status === "online" ? "bg-emerald-500/10 text-emerald-400" : "bg-yellow-500/10 text-yellow-500"}`}>
                    {s.status.toUpperCase()}
                  </span>
                  <span className="text-zinc-500">Sync: {s.lastSync}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800/50 flex justify-between items-center text-xs text-zinc-400">
                <span>Battery</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div className={`h-full ${s.battery > 50 ? "bg-emerald-500" : "bg-yellow-500"}`} style={{ width: `${s.battery}%` }}></div>
                  </div>
                  <span>{s.battery}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
