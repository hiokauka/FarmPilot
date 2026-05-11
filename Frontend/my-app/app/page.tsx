"use client";

import { usePlant } from "@/context/PlantContext";
import PlantHeader from "@/components/PlantHeader";

export default function Dashboard() {
  const { activePlant, activeProfile } = usePlant();

  if (!activePlant || !activeProfile) {
    return (
      <div className="flex-1 flex flex-col">
        <PlantHeader />
        <div className="flex-1 flex items-center justify-center text-zinc-500">
          Select a plant from the sidebar
        </div>
      </div>
    );
  }

  // Find the optimal metrics for the current stage from the profile
  const currentStageProfile = activeProfile.stages.find(s => s.name === activePlant.currentStage) || activeProfile.stages[0];
  const optimal = currentStageProfile.optimalMetrics;
  const current = activePlant.currentMetrics;

  const metrics = [
    { label: "Temperature", value: `${current.temperature}°C`, target: `${optimal.temperature.min}-${optimal.temperature.max}°C`, status: (current.temperature < optimal.temperature.min || current.temperature > optimal.temperature.max) ? "warning" : "normal" },
    { label: "Soil Moisture", value: `${current.soilMoisture}%`, target: `${optimal.soilMoisture.min}-${optimal.soilMoisture.max}%`, status: (current.soilMoisture < optimal.soilMoisture.min || current.soilMoisture > optimal.soilMoisture.max) ? "warning" : "normal" },
    { label: "Humidity", value: `${current.humidity}%`, target: `${optimal.humidity.min}-${optimal.humidity.max}%`, status: (current.humidity < optimal.humidity.min || current.humidity > optimal.humidity.max) ? "warning" : "normal" },
    { label: "Soil pH", value: `${current.ph}`, target: `${optimal.ph.min}-${optimal.ph.max}`, status: (current.ph < optimal.ph.min || current.ph > optimal.ph.max) ? "warning" : "normal" },
  ];

  return (
    <div className="flex-1 flex flex-col bg-[#09090b] animate-fade-in h-full">
      <PlantHeader title="Dashboard Overview" />

      <div className="p-8 space-y-8 flex-1 overflow-y-auto">
        
        {/* Growth Progress */}
        <section className="glass-card rounded-2xl p-6 stagger-1">
          <h2 className="text-xs font-bold text-zinc-400 tracking-wider mb-4">GROWTH STAGE PROGRESS</h2>
          <div className="flex justify-between text-xs font-medium text-zinc-500 mb-2 px-1">
            {activeProfile.stages.map(stage => (
               <span key={stage.name} className={activePlant.currentStage === stage.name ? "text-emerald-400 font-bold" : activePlant.dayCount > stage.endDay ? "text-emerald-400/50" : ""}>
                 {stage.name}
               </span>
            ))}
          </div>
          <div className="flex h-2 gap-1 rounded-full overflow-hidden">
            {activeProfile.stages.map((stage, i) => (
               <div key={i} className={`flex-1 ${activePlant.dayCount >= stage.startDay ? "bg-emerald-500" : "bg-zinc-800"}`}></div>
            ))}
          </div>
        </section>

        {/* Metrics Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 stagger-2">
          {metrics.map((m, i) => (
            <div key={i} className="glass-card p-5 rounded-2xl flex flex-col justify-between border border-zinc-800/50 hover:border-zinc-700/50 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${m.status === "warning" ? "bg-yellow-500 animate-pulse" : "bg-emerald-500"}`}></div>
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
            All metrics for {activePlant.customLabel} are within acceptable ranges. Adjusted LED light schedule (+30m) for optimal {activePlant.currentStage.toLowerCase()} growth based on yesterday&apos;s DLI calculations.
          </p>
        </section>

      </div>
    </div>
  );
}