"use client";

import { usePlant } from "@/context/PlantContext";
import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

function PlantStatusDot({ plantId, attentionNeeded }: { plantId: string; attentionNeeded?: boolean }) {
  const [sensorStatus, setSensorStatus] = useState<"offline" | "online">("online");

  useEffect(() => {
    let mounted = true;
    // If high priority flag already active, we can skip network fetch overhead
    if (attentionNeeded) return;

    fetch(`${API_BASE}/api/plants/${plantId}/sensors`)
      .then(res => {
        if (!res.ok) return [];
        return res.json();
      })
      .then((sensors: { status: string }[]) => {
        if (!mounted) return;
        if (!Array.isArray(sensors) || sensors.length === 0) { 
          setSensorStatus("online"); 
          return; 
        }
        const hasOffline = sensors.some(s => s.status === "Offline");
        setSensorStatus(hasOffline ? "offline" : "online");
      })
      .catch(() => {
        if (mounted) setSensorStatus("offline");
      });

    return () => { mounted = false; };
  }, [plantId, attentionNeeded]);

  // Derive status dynamically: Attention > Sensor State
  const finalStatus = attentionNeeded ? "attention" : sensorStatus;

  const dotClass =
    finalStatus === "attention" ? "bg-yellow-500 animate-pulse" :
    finalStatus === "offline"   ? "bg-red-500" :
                                 "bg-emerald-500";

  return <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dotClass}`} />;
}

export default function Sidebar() {
  const { plants, activePlantId, setActivePlantId, addPlant } = usePlant();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [newPlantName, setNewPlantName] = useState("");
  
  const [readmeContent, setReadmeContent] = useState<string>("");
  const [loadingReadme, setLoadingReadme] = useState(false);

  const handleOpenDocs = () => {
    setIsDocModalOpen(true);
    if (!readmeContent && !loadingReadme) {
      setLoadingReadme(true);
      fetch(`${API_BASE}/api/docs/readme`)
        .then(res => res.json())
        .then(data => {
          setReadmeContent(data.content || "Failed to parse documentation.");
        })
        .catch(e => {
          console.error(e);
          setReadmeContent("Failed to fetch documentation from server.");
        })
        .finally(() => setLoadingReadme(false));
    }
  };

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

        {/* Navigation / Global actions */}
        <div className="p-4 border-t border-zinc-800 space-y-1">
          <button 
            onClick={handleOpenDocs}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 text-left"
          >
            <div className="w-4 h-4 rounded flex items-center justify-center text-xs border border-current opacity-70 font-bold">?</div>
            System Documentation
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 text-left opacity-50 cursor-not-allowed">
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

      {/* System Documentation Modal */}
      {isDocModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#09090b] border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-6 bg-zinc-900/50 border-b border-zinc-800 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white">Operations Manual</h2>
                <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider font-medium">FarmPilot Control Infrastructure</p>
              </div>
              <button 
                onClick={() => setIsDocModalOpen(false)}
                className="text-zinc-500 hover:text-white transition-colors font-bold text-lg"
              >
                &times;
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-8 overflow-y-auto custom-scrollbar text-sm text-zinc-300 leading-relaxed prose prose-invert max-w-none">
              {loadingReadme ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">Locating README.md...</p>
                </div>
              ) : (
                <ReactMarkdown
                  components={{
                    h1: ({ ...props }) => <h1 className="text-emerald-400 text-2xl font-black mb-6 border-b border-zinc-800 pb-4" {...props} />,
                    h2: ({ ...props }) => <h2 className="text-zinc-100 text-lg font-bold mt-8 mb-4 border-l-4 border-emerald-500 pl-3" {...props} />,
                    h3: ({ ...props }) => <h3 className="text-zinc-200 text-base font-semibold mt-6 mb-2" {...props} />,
                    p: ({ ...props }) => <p className="text-zinc-400 mb-4 leading-relaxed" {...props} />,
                    ul: ({ ...props }) => <ul className="list-disc list-inside mb-4 space-y-1 text-zinc-400" {...props} />,
                    code: ({ className, children, ...props }) => {
                      const match = /language-(\w+)/.exec(className || '');
                      const isInline = !match;
                      return isInline ? (
                        <code className="bg-zinc-800 text-zinc-200 px-1.5 py-0.5 rounded text-xs font-mono" {...props}>{children}</code>
                      ) : (
                        <pre className="bg-black border border-zinc-800 rounded-xl p-4 my-4 overflow-x-auto font-mono text-emerald-500 text-xs leading-normal">
                          <code>{children}</code>
                        </pre>
                      );
                    },
                    li: ({ ...props }) => <li className="mb-1" {...props} />,
                    a: ({ ...props }) => <a className="text-emerald-500 hover:underline font-medium" target="_blank" rel="noreferrer" {...props} />
                  }}
                >
                  {readmeContent}
                </ReactMarkdown>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-zinc-900/50 border-t border-zinc-800 flex justify-end">
              <button 
                onClick={() => setIsDocModalOpen(false)}
                className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold rounded-xl transition-all"
              >
                Close Manual
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}