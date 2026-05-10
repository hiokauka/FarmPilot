"use client";

import { usePlant } from "@/context/PlantContext";
import PlantHeader from "@/components/PlantHeader";

export default function Dashboard() {
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

  const metrics = [
    { label: "Temperature", value: `${activePlant.metrics.temp.current}°C`, target: `${activePlant.metrics.temp.min}-${activePlant.metrics.temp.max}°C`, status: "normal" },
    { label: "Soil Moisture", value: `${activePlant.metrics.soilMoisture.current}%`, target: `${activePlant.metrics.soilMoisture.min}-${activePlant.metrics.soilMoisture.max}%`, status: "normal" },
    { label: "Humidity", value: `${activePlant.metrics.humidity.current}%`, target: `${activePlant.metrics.humidity.min}-${activePlant.metrics.humidity.max}%`, status: "warning" },
    { label: "Soil pH", value: `${activePlant.metrics.ph.current}`, target: `${activePlant.metrics.ph.min}-${activePlant.metrics.ph.max}`, status: "normal" },
  ];

  return (
    <div className="flex-1 flex flex-col bg-[#09090b] animate-fade-in">
      <PlantHeader title="Dashboard Overview" />

      <div className="p-8 space-y-8">
        
        {/* Growth Progress */}
        <section className="glass-card rounded-2xl p-6 stagger-1">
          <h2 className="text-xs font-bold text-zinc-400 tracking-wider mb-4">GROWTH STAGE PROGRESS</h2>
          <div className="flex justify-between text-xs font-medium text-zinc-500 mb-2 px-1">
            <span className={activePlant.stage === "Seedling" ? "text-emerald-400" : "text-emerald-400/50"}>Seedling</span>
            <span className={activePlant.stage === "Vegetative" ? "text-emerald-400" : activePlant.day > 10 ? "text-emerald-400/50" : ""}>Vegetative</span>
            <span className={activePlant.stage === "Flowering" ? "text-emerald-400" : activePlant.day > 30 ? "text-emerald-400/50" : ""}>Flowering</span>
            <span className={activePlant.stage === "Fruiting" ? "text-emerald-400" : ""}>Fruiting</span>
            <span className={activePlant.stage === "Harvest" ? "text-emerald-400" : ""}>Harvest</span>
          </div>
          <div className="flex h-2 gap-1 rounded-full overflow-hidden">
            <div className={`flex-1 ${activePlant.day > 0 ? "bg-emerald-500" : "bg-zinc-800"}`}></div>
            <div className={`flex-1 ${activePlant.day > 10 ? "bg-emerald-500" : "bg-zinc-800"}`}></div>
            <div className={`flex-1 ${activePlant.day > 30 ? "bg-emerald-500" : "bg-zinc-800"}`}></div>
            <div className={`flex-1 ${activePlant.day > 50 ? "bg-emerald-500" : "bg-zinc-800"}`}></div>
            <div className={`flex-1 ${activePlant.stage === "Harvest" ? "bg-emerald-500" : "bg-zinc-800"}`}></div>
          </div>
        </section>

        {/* Metrics Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 stagger-2">
          {metrics.map((m, i) => (
            <div key={i} className="glass-card p-5 rounded-2xl flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${m.status === "warning" ? "bg-yellow-500" : "bg-emerald-500"}`}></div>
                  <span className="text-sm font-medium text-zinc-300">{m.label}</span>
                </div>
              </div>
              <div>
                <div className={`text-3xl font-bold mb-1 ${m.status === "warning" ? "text-yellow-500" : "text-white"}`}>
                  {m.value}
                </div>
                <div className="text-xs text-zinc-500">Target: {m.target}</div>
              </div>
            </div>
          ))}
        </section>

        {/* Mini Agent Panel */}
        <section className="glass-card rounded-2xl p-6 border-l-4 border-l-emerald-500 stagger-3">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
              AI Agent Status
            </div>
            <span className="text-xs px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/20">Active monitoring</span>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed">
            All metrics for {activePlant.name} are within acceptable ranges. Adjusted LED light schedule (+30m) for optimal vegetative growth based on yesterday's DLI calculations.
          </p>
        </section>

      </div>
    </div>
  );
}