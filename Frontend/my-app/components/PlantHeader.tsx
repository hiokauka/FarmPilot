"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePlant } from "@/context/PlantContext";

export default function PlantHeader({ title }: { title?: string }) {
  const pathname = usePathname();
  const { activePlant, activeProfile } = usePlant();

  const navItems = [
    { name: "Dashboard", path: "/" },
    { name: "Sensors", path: "/sensors" },
    { name: "Plant Profile", path: "/profile" },
    { name: "Predictive", path: "/predictive" },
    { name: "Agent Decisions", path: "/agent" },
  ];

  if (!activePlant) {
    return (
      <div className="p-8 border-b border-zinc-800/50 bg-[#09090b]">
        <h1 className="text-2xl font-bold text-zinc-100 mb-2">Select a plant</h1>
        <p className="text-zinc-400 text-sm">Add or select a plant profile from the sidebar to view metrics.</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-[#09090b] to-zinc-900/50 border-b border-zinc-800/50">
      <div className="p-8 pb-4 flex justify-between items-start">
        <div className="flex gap-5 items-center">
        <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center text-3xl shadow-inner border border-zinc-700">
          {activeProfile?.name.includes("Lettuce") ? "🥬" : activeProfile?.name.includes("Tomato") ? "🍅" : activeProfile?.name.includes("Basil") ? "🌿" : activeProfile?.name.includes("Strawberry") ? "🍓" : "🌱"}
        </div>
        
        <div>
          <h1 className="text-3xl font-bold text-zinc-100 mb-1">{activePlant.customLabel}</h1>
          <div className="flex items-center gap-3 text-sm text-zinc-400">
            <span>{activeProfile?.name || "Unknown Crop"}</span>
            <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
            <span className="text-emerald-400">{activePlant.currentStage} Stage</span>
            <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
            <span>Day {activePlant.dayCount}</span>
            {title && (
              <>
                <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                <span className="text-zinc-200 font-medium">{title}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick Status Badges */}
      <div className="flex gap-3">
        {activePlant.healthScore < 100 && (
          <div className="px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></div>
            <span className="text-xs font-medium text-yellow-500">Attention Needed</span>
          </div>
        )}
        <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
          <span className="text-xs font-medium text-emerald-400">Sensors Online</span>
        </div>
      </div>
      </div>

      {/* Navigation Tabs */}
      <div className="px-8 mt-2 flex gap-1 border-t border-zinc-800/50 pt-4">
        {navItems.map((item) => (
          <Link 
            key={item.path} 
            href={item.path}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-all border-b-2 ${
              pathname === item.path 
                ? "text-emerald-400 border-emerald-400 bg-emerald-500/5" 
                : "text-zinc-400 border-transparent hover:text-zinc-200 hover:bg-zinc-800/50 hover:border-zinc-700"
            }`}
          >
            {item.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
