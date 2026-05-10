"use client";

import { usePlant } from "@/context/PlantContext";
import PlantHeader from "@/components/PlantHeader";

export default function Predictive() {
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

  // ML Risk Mock Data
  const riskScore = 12; // 0-100
  const riskFactors = [
    { name: "Powdery Mildew", risk: 8, trend: "down" },
    { name: "Nutrient Lockout", risk: 15, trend: "up" },
    { name: "Tip Burn", risk: 5, trend: "stable" },
    { name: "Root Rot", risk: 2, trend: "stable" },
  ];

  return (
    <div className="flex-1 flex flex-col bg-[#09090b] animate-fade-in">
      <PlantHeader title="Predictive Analysis" />

      <div className="p-8 space-y-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 stagger-1">
          {/* Main Risk Gauge */}
          <div className="glass-card p-8 rounded-2xl flex flex-col items-center justify-center text-center">
            <h2 className="text-sm font-semibold text-zinc-400 mb-6 uppercase tracking-wider">Overall Risk Score</h2>
            <div className="relative w-40 h-40 flex items-center justify-center">
              {/* Simulated Gauge SVG */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#27272a" strokeWidth="8" />
                <circle cx="50" cy="50" r="45" fill="none" stroke="#10b981" strokeWidth="8" strokeDasharray="283" strokeDashoffset={283 - (283 * (100 - riskScore)) / 100} className="transition-all duration-1000 ease-out" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-emerald-400">{riskScore}</span>
                <span className="text-xs text-zinc-500">/ 100</span>
              </div>
            </div>
            <p className="mt-6 text-sm text-zinc-300">
              Low risk detected. Conditions are optimal for the next 7 days based on current trajectory.
            </p>
          </div>

          {/* Risk Factors Breakdown */}
          <div className="lg:col-span-2 glass-card p-6 rounded-2xl flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-sm font-semibold text-zinc-200">ML Risk Factor Breakdown (7-Day Forecast)</h2>
              <span className="text-xs font-medium text-emerald-400 px-2 py-1 bg-emerald-500/10 rounded">Model: Vision-Ag v2.4</span>
            </div>
            
            <div className="space-y-4 flex-1 flex flex-col justify-center">
              {riskFactors.map((factor, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-32 text-sm text-zinc-400">{factor.name}</div>
                  <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${factor.risk > 50 ? "bg-red-500" : factor.risk > 20 ? "bg-yellow-500" : "bg-emerald-500"}`} 
                      style={{ width: `${factor.risk}%` }}
                    ></div>
                  </div>
                  <div className="w-12 text-right text-sm font-medium text-zinc-300">{factor.risk}%</div>
                  <div className="w-6 flex justify-center text-zinc-500">
                    {factor.trend === "up" ? "↑" : factor.trend === "down" ? "↓" : "−"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Forecast Graph Placeholder */}
        <div className="glass-card p-6 rounded-2xl h-64 flex flex-col stagger-2">
           <h2 className="text-sm font-semibold text-zinc-200 mb-4">Predicted Yield Trajectory</h2>
           <div className="flex-1 border border-zinc-800 border-dashed rounded-lg flex items-center justify-center bg-zinc-900/30">
              <div className="text-center">
                <svg className="w-8 h-8 text-zinc-600 mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                <p className="text-sm text-zinc-500">Historical growth chart renders here.</p>
                <p className="text-xs text-zinc-600 mt-1">Expected harvest yield: 1.2kg per sq/m</p>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}
