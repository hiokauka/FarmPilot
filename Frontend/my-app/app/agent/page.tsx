"use client";

import { usePlant } from "@/context/PlantContext";
import PlantHeader from "@/components/PlantHeader";
import { useState } from "react";

export default function AgentDecisions() {
  const { activePlant, activeProfile } = usePlant();
  const [approvalMode, setApprovalMode] = useState<"auto" | "ask">("ask");

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

  const pendingTasks = [
    {
      id: "t-1092",
      priority: "high",
      action: "Increase fertigation frequency by 15%",
      reasoning: `Soil moisture dropped faster than predicted over the last 12h. Current EC indicates nutrient uptake is optimal, but water volume is insufficient for the current ${activePlant.currentStage} stage of ${activeProfile.name}.`,
      confidence: 94,
      impact: "Prevents slight tip burn risk identified in ML model.",
      timestamp: "10 mins ago"
    },
    {
      id: "t-1093",
      priority: "medium",
      action: "Lower ambient temperature to 21°C tonight",
      reasoning: "Enhances anthocyanin production for better coloration before harvest.",
      confidence: 82,
      impact: "Improves final crop aesthetics and market value.",
      timestamp: "1 hour ago"
    }
  ];

  return (
    <div className="flex-1 flex flex-col bg-[#09090b] animate-fade-in h-full">
      <PlantHeader title="Agentic Control Center" />

      <div className="p-8 space-y-8 flex-1 overflow-y-auto">
        
        {/* Agent Controls Header */}
        <div className="flex justify-between items-center glass-card p-4 rounded-xl stagger-1">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100">AgriAgent v3.1 is Active</h2>
              <p className="text-xs text-zinc-400">Monitoring {activePlant.customLabel} 24/7</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-zinc-900 p-1.5 rounded-lg border border-zinc-800">
            <button 
              onClick={() => setApprovalMode("ask")}
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${approvalMode === "ask" ? "bg-zinc-700 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              Ask First
            </button>
            <button 
              onClick={() => setApprovalMode("auto")}
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${approvalMode === "auto" ? "bg-emerald-600 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              Auto-Approve
            </button>
          </div>
        </div>

        {/* Pending Decisions */}
        <div className="space-y-4 stagger-2">
          <h3 className="text-sm font-semibold text-zinc-300 mb-2 flex items-center gap-2">
            Pending Actions <span className="bg-yellow-500/20 text-yellow-500 text-[10px] px-2 py-0.5 rounded-full font-bold">{pendingTasks.length}</span>
          </h3>
          
          {pendingTasks.map((task) => (
            <div key={task.id} className="glass-card rounded-2xl border-l-4 overflow-hidden shadow-lg transition-all hover:shadow-xl" style={{ borderLeftColor: task.priority === 'high' ? '#ef4444' : '#f59e0b' }}>
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm ${task.priority === 'high' ? 'bg-red-500/10 text-red-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                        {task.priority} Priority
                      </span>
                      <span className="text-xs text-zinc-500">{task.timestamp}</span>
                    </div>
                    <h4 className="text-lg font-bold text-zinc-100">{task.action}</h4>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-3xl font-black text-emerald-400">{task.confidence}%</span>
                    <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest">Confidence</span>
                  </div>
                </div>

                <div className="bg-zinc-900/50 rounded-lg p-4 mb-6 border border-zinc-800/50">
                  <div className="text-xs font-bold text-zinc-400 mb-1">AGENT REASONING</div>
                  <p className="text-sm text-zinc-300 leading-relaxed mb-3">{task.reasoning}</p>
                  
                  <div className="text-xs font-bold text-zinc-400 mb-1">PREDICTED IMPACT</div>
                  <p className="text-sm text-emerald-400/90 flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    {task.impact}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2.5 rounded-xl transition-colors text-sm">
                    Approve Action
                  </button>
                  <button className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-2.5 rounded-xl transition-colors text-sm border border-zinc-700">
                    Modify & Approve
                  </button>
                  <button className="flex-none px-6 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-medium py-2.5 rounded-xl transition-colors text-sm border border-red-500/20">
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* History Log */}
        <div className="stagger-3 mt-12">
          <h3 className="text-sm font-semibold text-zinc-400 mb-4">Recent Agent Activity</h3>
          <div className="glass-card rounded-xl p-0 overflow-hidden">
            <div className="divide-y divide-zinc-800/50">
              <div className="p-4 flex items-center gap-4 hover:bg-zinc-800/30 transition-colors">
                <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center text-zinc-400">✓</div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-zinc-300">Auto-adjusted pH doser</p>
                  <p className="text-xs text-zinc-500">Lowered pH target from 6.2 to 6.0 based on weekly schedule.</p>
                </div>
                <span className="text-xs text-zinc-500">Yesterday, 14:00</span>
              </div>
              <div className="p-4 flex items-center gap-4 hover:bg-zinc-800/30 transition-colors">
                <div className="w-8 h-8 rounded bg-red-500/10 flex items-center justify-center text-red-400">✕</div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-zinc-300 line-through opacity-70">Turn off grow lights</p>
                  <p className="text-xs text-zinc-500 text-red-400/70">Manually overridden by User</p>
                </div>
                <span className="text-xs text-zinc-500">Yesterday, 09:30</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
