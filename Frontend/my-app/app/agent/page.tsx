"use client";

import { usePlant } from "@/context/PlantContext";
import PlantHeader from "@/components/PlantHeader";
import { AgentActivityEvent, AgentTask } from "@/lib/schema";
import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

/** Ensure a bare ISO string (no Z) from the backend is treated as UTC */
function toUtcDate(iso: string | undefined | null): Date | null {
  if (!iso) return null;
  // Append Z if the string has no timezone indicator
  const normalized = /[Zz+]|\d{2}:\d{2}$/.test(iso) ? iso : iso + "Z";
  return new Date(normalized);
}

function toRelativeTime(iso: string | Date | undefined | null): string {
  if (!iso) return "just now";
  const d = typeof iso === "string" ? toUtcDate(iso) : iso;
  if (!d || isNaN(d.getTime())) return "just now";
  return formatDistanceToNow(d, { addSuffix: true, includeSeconds: true });
}

export default function AgentDecisions() {
  const { activePlant, activeProfile } = usePlant();
  const [approvalMode, setApprovalMode] = useState<"auto" | "ask">("ask");
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [activity, setActivity] = useState<AgentActivityEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [updatingMode, setUpdatingMode] = useState(false);
  const [actingTaskId, setActingTaskId] = useState<string | null>(null);

  const pendingTasks = useMemo(
    () => tasks.filter((task) => task.status === "Pending"),
    [tasks],
  );

  async function loadAgentState(plantId: string, showLoader = false) {
    if (showLoader) setLoading(true);
    try {
      const [configRes, tasksRes, activityRes] = await Promise.all([
        fetch(`${API_BASE}/api/plants/${plantId}/agent/config`),
        fetch(`${API_BASE}/api/plants/${plantId}/agent/tasks?includeResolved=true`),
        fetch(`${API_BASE}/api/plants/${plantId}/agent/activity?limit=20`),
      ]);

      if (!configRes.ok || !tasksRes.ok || !activityRes.ok) return;

      const configJson = await configRes.json();
      const tasksJson = await tasksRes.json();
      const activityJson = await activityRes.json();

      setApprovalMode(configJson.approvalMode === "auto" ? "auto" : "ask");
      const pending = tasksJson.map((t: { createdAt: string; executedAt?: string; [key: string]: unknown }) => ({
        ...t,
        createdAt: toUtcDate(t.createdAt) ?? new Date(),
        executedAt: t.executedAt ? toUtcDate(t.executedAt) : undefined,
      })) as AgentTask[];
      setTasks(pending);
      const events = activityJson.map((e: { timestamp: string; [key: string]: unknown }) => ({
        ...e,
        timestamp: toUtcDate(e.timestamp) ?? new Date(),
      })) as AgentActivityEvent[];
      setActivity(events);
    } catch (error) {
      console.error("Failed to sync agent state", error);
    } finally {
      if (showLoader) setLoading(false);
    }
  }

  useEffect(() => {
    if (!activePlant?.id) return;

    let mounted = true;
    const pid = activePlant.id;

    const sync = async (showLoader: boolean) => {
      if (!mounted) return;
      await loadAgentState(pid, showLoader);
    };

    // Initialize asynchronously to prevent synchronous setState during hook installation phase
    setTimeout(() => {
      sync(true);
    }, 0);

    const interval = setInterval(() => {
      sync(false); // Background sync poll
    }, 3000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [activePlant?.id]);

  async function handleModeChange(mode: "ask" | "auto") {
    if (!activePlant || mode === approvalMode) return;
    setUpdatingMode(true);
    try {
      const res = await fetch(`${API_BASE}/api/plants/${activePlant.id}/agent/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalMode: mode }),
      });
      if (!res.ok) throw new Error("Failed to update approval mode");
      setApprovalMode(mode);
    } catch (error) {
      console.error(error);
    } finally {
      setUpdatingMode(false);
    }
  }

  async function runAnalysis() {
    if (!activePlant) return;
    setRunning(true);
    try {
      const res = await fetch(`${API_BASE}/api/plants/${activePlant.id}/agent/run`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to run analysis");
      await loadAgentState(activePlant.id, false); // Don't override full-page running state loader
    } catch (error) {
      console.error(error);
    } finally {
      setRunning(false);
    }
  }

  async function decideTask(task: AgentTask, decision: "approve" | "reject" | "modify_approve") {
    if (!activePlant) return;
    setActingTaskId(task.id);
    try {
      let modifiedActionTitle: string | undefined;
      if (decision === "modify_approve") {
        const userInput = window.prompt("Modify action title", task.actionTitle);
        if (!userInput) {
          setActingTaskId(null);
          return;
        }
        modifiedActionTitle = userInput;
      }

      const res = await fetch(`${API_BASE}/api/agent/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, modifiedActionTitle }),
      });
      if (!res.ok) throw new Error("Failed to update task");
      await loadAgentState(activePlant.id);
    } catch (error) {
      console.error(error);
    } finally {
      setActingTaskId(null);
    }
  }

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

  return (
    <div className="flex-1 flex flex-col bg-dark-900 animate-fade-in h-full">
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

          <div className="flex flex-col items-end gap-2">
            <button
              onClick={runAnalysis}
              disabled={running || loading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-500/50"
            >
                {running ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
                    Run Analysis Now
                  </>
                )}
            </button>
            <span className="text-[10px] text-zinc-500 font-medium">
              {activePlant?.lastAnalysisAt 
                ? `Last check: ${toRelativeTime(activePlant.lastAnalysisAt)}`
                : "Awaiting first analysis"}
            </span>
          </div>
          
          <div className="flex items-center gap-3 bg-zinc-900 p-1.5 rounded-lg border border-zinc-800">
            <button 
              onClick={() => handleModeChange("ask")}
              disabled={updatingMode}
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${approvalMode === "ask" ? "bg-zinc-700 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              Ask First
            </button>
            <button 
              onClick={() => handleModeChange("auto")}
              disabled={updatingMode}
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${approvalMode === "auto" ? "bg-emerald-600 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              Auto-Approve
            </button>
          </div>
        </div>

        {/* Active AI Rules (if any) */}
        {activePlant.aiCustomRules && Object.keys(activePlant.aiCustomRules).length > 0 && (
          <div className="glass-card rounded-xl p-4 border border-cyan-500/30 bg-cyan-500/5 stagger-1 mb-4">
            <h3 className="text-xs font-bold text-cyan-400 mb-2 uppercase tracking-wider flex items-center gap-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              AI-Optimized Custom Rules Active
            </h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(activePlant.aiCustomRules).map(([k, v]) => (
                <span key={k} className="text-[10px] bg-cyan-500/10 text-cyan-300 px-2 py-1 rounded border border-cyan-500/20 capitalize">
                  {k.replace(/_/g, " ")}: <span className="font-bold text-white">{String(v)}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Pending Decisions */}
        <div className="space-y-4 stagger-2">
          <h3 className="text-sm font-semibold text-zinc-300 mb-2 flex items-center gap-2">
            Pending Actions <span className="bg-yellow-500/20 text-yellow-500 text-[10px] px-2 py-0.5 rounded-full font-bold">{pendingTasks.length}</span>
          </h3>

          {!loading && pendingTasks.length === 0 && (
            <div className="glass-card rounded-xl p-5 text-sm text-zinc-400 border border-zinc-800">
              No pending actions. Run analysis to generate new recommendations.
            </div>
          )}
          
          {pendingTasks.map((task) => (
            <div key={task.id} className="glass-card rounded-2xl border-l-4 overflow-hidden shadow-lg transition-all hover:shadow-xl" style={{ borderLeftColor: task.priority.toLowerCase() === "high" || task.priority.toLowerCase() === "critical" ? "#ef4444" : "#f59e0b" }}>
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm ${task.priority.toLowerCase() === "high" || task.priority.toLowerCase() === "critical" ? "bg-red-500/10 text-red-500" : "bg-yellow-500/10 text-yellow-500"}`}>
                        {task.priority} Priority
                      </span>
                      <span className="text-xs text-zinc-500">{toRelativeTime(task.createdAt?.toISOString())}</span>
                    </div>
                    <h4 className="text-lg font-bold text-zinc-100">{task.actionTitle}</h4>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-3xl font-black text-emerald-400">{Math.round(task.confidenceScore)}%</span>
                    <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest">Confidence</span>
                  </div>
                </div>

                <div className="bg-zinc-900/50 rounded-lg p-4 mb-6 border border-zinc-800/50">
                  <div className="text-xs font-bold text-zinc-400 mb-1">AGENT REASONING</div>
                  <p className="text-sm text-zinc-300 leading-relaxed mb-3">{task.reasoning}</p>
                  
                  <div className="text-xs font-bold text-zinc-400 mb-1">PREDICTED IMPACT</div>
                  <p className="text-sm text-emerald-400/90 flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    {task.predictedImpact}
                  </p>
                </div>

                {/* Proposed Rule Changes */}
                {task.proposedRules && Object.keys(task.proposedRules).length > 0 && (
                  <div className="mb-5 rounded-lg p-4 border border-amber-500/25 bg-amber-500/5">
                    <div className="text-xs font-bold text-amber-400 mb-2 flex items-center gap-1.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                      PROPOSED RULE CHANGES (applied on approve)
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(task.proposedRules).map(([k, v]) => (
                        <span key={k} className="text-[10px] bg-amber-500/10 text-amber-300 px-2 py-1 rounded border border-amber-500/20 capitalize">
                          {k.replace(/_/g, " ")}: <span className="font-bold text-white">{String(v)}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => decideTask(task, "approve")}
                    disabled={actingTaskId === task.id}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2.5 rounded-xl transition-colors text-sm disabled:opacity-60"
                  >
                    Approve Action
                  </button>
                  <button
                    onClick={() => decideTask(task, "modify_approve")}
                    disabled={actingTaskId === task.id}
                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-2.5 rounded-xl transition-colors text-sm border border-zinc-700 disabled:opacity-60"
                  >
                    Modify & Approve
                  </button>
                  <button
                    onClick={() => decideTask(task, "reject")}
                    disabled={actingTaskId === task.id}
                    className="flex-none px-6 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-medium py-2.5 rounded-xl transition-colors text-sm border border-red-500/20 disabled:opacity-60"
                  >
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
              {activity.length === 0 && (
                <div className="p-4 text-sm text-zinc-500">No activity yet.</div>
              )}
              {activity.map((event, idx) => (
                <div key={`${event.kind}-${idx}-${event.timestamp.toISOString()}`} className="p-4 flex items-center gap-4 hover:bg-zinc-800/30 transition-colors">
                  <div className={`w-8 h-8 rounded flex items-center justify-center ${event.kind === "notification" ? "bg-zinc-800 text-zinc-300" : event.kind === "analysis" ? "bg-cyan-500/10 text-cyan-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                    {event.kind === "notification" ? "i" : event.kind === "analysis" ? "⚡" : "✓"}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-zinc-300">{event.title}</p>
                    <p className="text-xs text-zinc-500">{event.detail}</p>
                  </div>
                  <span className="text-xs text-zinc-500">{toRelativeTime(event.timestamp.toISOString())}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
