"use client";

import { usePlant } from "@/context/PlantContext";
import PlantHeader from "@/components/PlantHeader";

export default function PlantProfile() {
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

  const currentStageProfile = activeProfile.stages.find(s => s.name === activePlant.currentStage) || activeProfile.stages[0];
  const optimal = currentStageProfile.optimalMetrics;
  const current = activePlant.currentMetrics;

  const optimalRanges = [
    { label: "Temperature", min: optimal.temperature.min, max: optimal.temperature.max, unit: "°C", current: current.temperature },
    { label: "Humidity", min: optimal.humidity.min, max: optimal.humidity.max, unit: "%", current: current.humidity },
    { label: "Soil Moisture", min: optimal.soilMoisture.min, max: optimal.soilMoisture.max, unit: "%", current: current.soilMoisture },
    { label: "Soil pH", min: optimal.ph.min, max: optimal.ph.max, unit: "", current: current.ph },
    { label: "Light DLI", min: optimal.dli.min, max: optimal.dli.max, unit: " mol/m²/d", current: current.dli },
  ];

  return (
    <div className="flex-1 flex flex-col bg-[#09090b] animate-fade-in">
      <PlantHeader title="Optimal Profile" />

      <div className="p-8 space-y-8">
        
        <div className="glass-card p-8 rounded-2xl stagger-1">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-xl font-semibold text-zinc-100 mb-1">Optimal Growth Parameters</h2>
              <p className="text-sm text-zinc-400">
                Target ranges for <span className="text-emerald-400 italic">{activeProfile.scientificName}</span> ({activeProfile.name}) during {activePlant.currentStage} stage. 
                Est. Lifespan: {activeProfile.expectedLifespanDays} days.
              </p>
            </div>
            <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors border border-zinc-700">
              Edit Parameters
            </button>
          </div>

          <div className="space-y-6">
            {optimalRanges.map((range, i) => {
              // Calculate rough percentages for visual bar positioning
              const totalRange = (range.max * 1.5) - (range.min * 0.5);
              const minPos = ((range.min - (range.min * 0.5)) / totalRange) * 100;
              const maxPos = ((range.max - (range.min * 0.5)) / totalRange) * 100;
              const currentPos = ((range.current - (range.min * 0.5)) / totalRange) * 100;

              return (
                <div key={i} className="flex flex-col gap-2 relative group">
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{range.label}</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-extrabold text-zinc-100">{range.current.toFixed(1)}{range.unit}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-medium text-zinc-500">Target Band</span>
                      <div className="text-sm font-semibold text-zinc-300">
                        {range.min}{range.unit} <span className="text-zinc-600">to</span> {range.max}{range.unit}
                      </div>
                    </div>
                  </div>
                  
                  <div className="relative h-3 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 my-2">
                    {/* Optimal Range Highlight */}
                    <div 
                      className="absolute top-0 bottom-0 bg-emerald-500/20 border-x border-emerald-500/50"
                      style={{ left: `${Math.max(0, minPos)}%`, width: `${Math.min(100 - minPos, maxPos - minPos)}%` }}
                    ></div>
                    {/* Current Value Marker */}
                    <div 
                      className="absolute top-0 bottom-0 w-1.5 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] z-10"
                      style={{ left: `calc(${Math.min(100, Math.max(0, currentPos))}% - 3px)` }}
                    >
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 stagger-2">
          <div className="glass-card p-6 rounded-2xl">
            <h3 className="text-sm font-semibold text-zinc-200 mb-4 tracking-wide uppercase">AI Cultivation Notes</h3>
            <ul className="space-y-4 text-sm text-zinc-400 list-disc pl-4">
              {currentStageProfile.aiCultivationNotes.map((note, idx) => (
                 <li key={idx}>{note}</li>
              ))}
            </ul>
          </div>
          
          <div className="glass-card p-6 rounded-2xl">
            <h3 className="text-sm font-semibold text-zinc-200 mb-4 tracking-wide uppercase">Schedule Rules</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-zinc-800/50 rounded-lg text-sm text-zinc-300">
                <span>Irrigation Cycle</span>
                <span className="text-emerald-400 font-medium">{currentStageProfile.scheduleRules.irrigationCycle}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-zinc-800/50 rounded-lg text-sm text-zinc-300">
                <span>Target DLI</span>
                <span className="text-emerald-400 font-medium">{currentStageProfile.scheduleRules.targetDli} mol/m²/d</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
