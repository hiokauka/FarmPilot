"use client";

import { usePlant } from "@/context/PlantContext";
import PlantHeader from "@/components/PlantHeader";
import { computePredictiveData } from "@/lib/predictiveEngine";
import { motion } from "framer-motion";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle,
  Calendar,
  Box,
  Activity
} from "lucide-react";

export default function Predictive() {
  const { activePlant, activeProfile } = usePlant();

  if (!activePlant || !activeProfile) {
    return (
      <div className="flex-1 flex flex-col">
        <PlantHeader title="Predictive Analysis" />
        <div className="flex-1 flex items-center justify-center text-zinc-500">
          Select a plant from the sidebar
        </div>
      </div>
    );
  }

  const data = computePredictiveData(activePlant, activeProfile);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ok": return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case "warning": return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case "critical": return <AlertCircle className="w-4 h-4 text-red-400" />;
      default: return null;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up": return <TrendingUp className="w-4 h-4 text-zinc-500" />;
      case "down": return <TrendingDown className="w-4 h-4 text-zinc-500" />;
      case "stable": return <Minus className="w-4 h-4 text-zinc-600" />;
      default: return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#09090b] overflow-y-auto">
      <PlantHeader title="Predictive Analysis" />

      <div className="p-8 space-y-8 max-w-7xl mx-auto w-full">
        
        {/* Top Row: Risk and Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Risk Gauge */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-8 rounded-2xl flex flex-col items-center justify-center text-center"
          >
            <h2 className="text-xs font-bold text-zinc-500 mb-6 uppercase tracking-widest">Overall Risk Score</h2>
            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#27272a" strokeWidth="8" />
                <motion.circle 
                  cx="50" cy="50" r="45" fill="none" 
                  stroke={data.overallRiskScore > 60 ? "#ef4444" : data.overallRiskScore > 30 ? "#f59e0b" : "#10b981"}
                  strokeWidth="8" 
                  strokeDasharray="283"
                  initial={{ strokeDashoffset: 283 }}
                  animate={{ strokeDashoffset: 283 - (283 * data.overallRiskScore) / 100 }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-5xl font-black ${data.overallRiskScore > 60 ? "text-red-400" : data.overallRiskScore > 30 ? "text-amber-400" : "text-emerald-400"}`}>
                  {data.overallRiskScore}
                </span>
                <span className="text-xs text-zinc-500 font-medium">PERCENT RISK</span>
              </div>
            </div>
            <p className="mt-8 text-sm text-zinc-400 leading-relaxed">
              {data.overallRiskScore < 30 
                ? "Optimal trajectory. Environmental conditions match growth stage benchmarks perfectly." 
                : data.overallRiskScore < 60 
                ? "Moderate deviations detected. Adjust metrics to return to optimal growth curve."
                : "High risk identified. Immediate correction required to prevent yield loss."}
            </p>
          </motion.div>

          {/* Metric Breakdown */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 glass-card p-6 rounded-2xl flex flex-col"
          >
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-base font-bold text-zinc-100">Metric Health Analysis</h2>
                <p className="text-xs text-zinc-500 mt-1">Real-time deviation vs. Stage optimal</p>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 px-2 py-1 bg-emerald-500/10 rounded uppercase tracking-tighter">Model: BioPredict-v4</span>
            </div>
            
            <div className="space-y-6 flex-1">
              {data.metricScores.map((m, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(m.status)}
                      <span className="text-sm font-medium text-zinc-300">{m.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-zinc-500 font-mono">
                        {m.current.toFixed(1)} / {m.optimal.toFixed(1)}
                      </span>
                      <div className="flex items-center gap-1.5 w-16 justify-end">
                        <span className={`text-xs font-bold ${m.score > 80 ? "text-emerald-400" : m.score > 40 ? "text-amber-400" : "text-red-400"}`}>
                          {m.score}%
                        </span>
                        {getTrendIcon(m.trend)}
                      </div>
                    </div>
                  </div>
                  <div className="h-1.5 bg-zinc-800/50 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${m.score}%` }}
                      transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
                      className={`h-full ${m.score > 80 ? "bg-emerald-500" : m.score > 40 ? "bg-amber-500" : "bg-red-500"}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Harvest Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { label: "Days to Harvest", value: `${data.daysToHarvest} days`, icon: <Calendar className="w-5 h-5" />, color: "text-sky-400" },
            { label: "Growth Progress", value: `${data.growthProgress}%`, icon: <Activity className="w-5 h-5" />, color: "text-emerald-400" },
            { label: "Projected Yield", value: `${activePlant.predictedYield} kg/m²`, icon: <Box className="w-5 h-5" />, color: "text-purple-400" },
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="glass-card p-5 rounded-xl flex items-center gap-4"
            >
              <div className={`p-3 rounded-lg bg-zinc-900/50 ${stat.color}`}>
                {stat.icon}
              </div>
              <div>
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{stat.label}</div>
                <div className="text-xl font-bold text-zinc-100">{stat.value}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Stage Timeline */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass-card p-6 rounded-2xl"
        >
          <h2 className="text-sm font-bold text-zinc-200 mb-8 uppercase tracking-widest flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            Growth Stage Roadmap
          </h2>
          
          <div className="relative pt-8 pb-4 px-2">
            <div className="absolute top-1/2 left-0 w-full h-1 bg-zinc-800 -translate-y-1/2 rounded-full overflow-hidden">
               <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${data.growthProgress}%` }}
                className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
               />
            </div>
            
            <div className="relative flex justify-between">
              {data.stageTimeline.map((stage, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className={`w-4 h-4 rounded-full border-2 z-10 transition-colors ${
                    stage.isCurrent ? "bg-emerald-500 border-white" : stage.isCompleted ? "bg-emerald-500/50 border-emerald-500" : "bg-zinc-900 border-zinc-700"
                  }`} />
                  <div className="absolute mt-6 text-center">
                    <div className={`text-[10px] font-bold uppercase transition-colors ${stage.isCurrent ? "text-emerald-400" : "text-zinc-500"}`}>
                      {stage.name}
                    </div>
                    <div className="text-[9px] text-zinc-600 font-mono mt-0.5">Day {stage.startDay}-{stage.endDay}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Forecast Graph */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="glass-card p-6 rounded-2xl h-80 flex flex-col"
        >
           <div className="flex justify-between items-center mb-8">
             <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-widest">7-Day Trajectory Forecast</h2>
             <div className="flex gap-4">
               {['Temp', 'Soil', 'Light'].map((l, i) => (
                 <div key={l} className="flex items-center gap-1.5">
                   <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-sky-400' : 'bg-emerald-400'}`} />
                   <span className="text-[10px] text-zinc-500 font-bold uppercase">{l}</span>
                 </div>
               ))}
             </div>
           </div>
           
           <div className="flex-1 relative mt-4">
             <svg className="w-full h-full overflow-visible" viewBox="0 0 700 200">
               {/* Grid Lines */}
               {[0, 50, 100, 150, 200].map(y => (
                 <line key={y} x1="0" y1={y} x2="700" y2={y} stroke="#27272a" strokeWidth="0.5" strokeDasharray="4 4" />
               ))}
               
               {/* Forecast Lines */}
               {['temp', 'soil', 'dli'].map((key, ki) => (
                 <motion.path
                   key={key}
                   d={`M ${data.forecastPoints.map((p, i) => `${i * 100},${200 - (p as any)[key] * (key === 'soil' ? 1.5 : 4)}`).join(' L ')}`}
                   fill="none"
                   stroke={ki === 0 ? '#fbbf24' : ki === 1 ? '#38bdf8' : '#34d399'}
                   strokeWidth="3"
                   strokeLinecap="round"
                   initial={{ pathLength: 0 }}
                   animate={{ pathLength: 1 }}
                   transition={{ duration: 2, delay: 1 + ki * 0.2 }}
                 />
               ))}

               {/* Data Points */}
               {data.forecastPoints.map((p, i) => (
                 <g key={i}>
                   <text x={i * 100} y="220" textAnchor="middle" className="text-[10px] fill-zinc-600 font-mono">Day {p.day}</text>
                   <circle cx={i * 100} cy={200 - p.temp * 4} r="3" fill="#fbbf24" className="opacity-50" />
                 </g>
               ))}
             </svg>
           </div>
        </motion.div>

      </div>
    </div>
  );
}
