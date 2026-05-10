"use client";

import { usePlant } from "@/context/PlantContext";
import PlantHeader from "@/components/PlantHeader";

export default function PlantProfile() {
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

  const optimalRanges = [
    { label: "Temperature", min: activePlant.metrics.temp.min, max: activePlant.metrics.temp.max, unit: "°C", current: activePlant.metrics.temp.current },
    { label: "Humidity", min: activePlant.metrics.humidity.min, max: activePlant.metrics.humidity.max, unit: "%", current: activePlant.metrics.humidity.current },
    { label: "Soil Moisture", min: activePlant.metrics.soilMoisture.min, max: activePlant.metrics.soilMoisture.max, unit: "%", current: activePlant.metrics.soilMoisture.current },
    { label: "Soil pH", min: activePlant.metrics.ph.min, max: activePlant.metrics.ph.max, unit: "", current: activePlant.metrics.ph.current },
  ];

  return (
    <div className="flex-1 flex flex-col bg-[#09090b] animate-fade-in">
      <PlantHeader title="Optimal Profile" />

      <div className="p-8 space-y-8">
        
        <div className="glass-card p-8 rounded-2xl stagger-1">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-xl font-semibold text-zinc-100 mb-1">Optimal Growth Parameters</h2>
              <p className="text-sm text-zinc-400">Target ranges for {activePlant.type} during {activePlant.stage} stage.</p>
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
                <div key={i} className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-sm font-medium text-zinc-300">
                    <span>{range.label}</span>
                    <span className="text-zinc-500">{range.min}{range.unit} — {range.max}{range.unit}</span>
                  </div>
                  
                  <div className="relative h-3 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                    {/* Optimal Range Highlight */}
                    <div 
                      className="absolute top-0 bottom-0 bg-emerald-500/20 border-x border-emerald-500/50"
                      style={{ left: `${minPos}%`, width: `${maxPos - minPos}%` }}
                    ></div>
                    {/* Current Value Marker */}
                    <div 
                      className="absolute top-0 bottom-0 w-1.5 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] z-10"
                      style={{ left: `calc(${currentPos}% - 3px)` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 stagger-2">
          <div className="glass-card p-6 rounded-2xl">
            <h3 className="text-sm font-semibold text-zinc-200 mb-4 tracking-wide uppercase">AI Cultivation Notes</h3>
            <div className="space-y-4 text-sm text-zinc-400">
              <p>For {activePlant.type}, maintaining DLI (Daily Light Integral) between 12-14 mol/m²/d is critical during the vegetative phase to prevent leggy growth.</p>
              <p>Recent observations show slight edge curl on lower leaves. Recommend dropping nighttime temperature by 1°C.</p>
            </div>
          </div>
          
          <div className="glass-card p-6 rounded-2xl">
            <h3 className="text-sm font-semibold text-zinc-200 mb-4 tracking-wide uppercase">Schedule Rules</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-zinc-800/50 rounded-lg text-sm text-zinc-300">
                <span>Irrigation Cycle</span>
                <span className="text-emerald-400 font-medium">Every 4 hours (15m)</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-zinc-800/50 rounded-lg text-sm text-zinc-300">
                <span>Light Schedule</span>
                <span className="text-emerald-400 font-medium">{activePlant.metrics.light.hours}h ON / {24 - activePlant.metrics.light.hours}h OFF</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
