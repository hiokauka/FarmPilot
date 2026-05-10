"use client";

import { usePlant } from "@/context/PlantContext";
import PlantHeader from "@/components/PlantHeader";
import { computePredictiveData } from "@/lib/predictiveEngine";
import { motion } from "framer-motion";
import { useState } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle,
  Calendar,
  Box,
  Activity,
  X,
  Maximize2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { AnimatePresence } from "framer-motion";

export default function Predictive() {
  const { activePlant, activeProfile } = usePlant();
  const [isRoadmapOpen, setIsRoadmapOpen] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [direction, setDirection] = useState(0);

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

  const handleOpenRoadmap = () => {
    // Start modal at the current growth stage index
    const currentIndex = activeProfile.stages.findIndex(s => s.name === activePlant.currentStage);
    setStageIndex(currentIndex !== -1 ? currentIndex : 0);
    setIsRoadmapOpen(true);
  };

  const paginate = (newDirection: number) => {
    const nextIndex = stageIndex + newDirection;
    if (nextIndex >= 0 && nextIndex < activeProfile.stages.length) {
      setDirection(newDirection);
      setStageIndex(nextIndex);
    }
  };

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

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 500 : -500,
      opacity: 0,
      scale: 0.9,
      rotateY: dir > 0 ? 45 : -45,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
      rotateY: 0,
    },
    exit: (dir: number) => ({
      zIndex: 0,
      x: dir < 0 ? 500 : -500,
      opacity: 0,
      scale: 0.9,
      rotateY: dir < 0 ? 45 : -45,
    })
  };

  return (
    <div className="flex-1 flex flex-col bg-[#09090b] overflow-y-auto">
      <PlantHeader title="Predictive Analysis" />

      <div className="p-8 space-y-8 max-w-7xl mx-auto w-full pb-20">
        
        {/* Top Row: Risk and Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Risk Gauge */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-8 rounded-2xl flex flex-col items-center justify-center text-center relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
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
                <span className="text-[10px] text-zinc-500 font-bold tracking-tighter">PERCENT RISK</span>
              </div>
            </div>
            <p className="mt-8 text-sm text-zinc-400 leading-relaxed max-w-[240px]">
              {data.overallRiskScore < 30 
                ? "Optimal trajectory. Environmental conditions match growth stage benchmarks." 
                : data.overallRiskScore < 60 
                ? "Moderate deviations detected. Minor adjustments recommended."
                : "High risk identified. Immediate correction required."}
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
                <h2 className="text-base font-bold text-zinc-100 uppercase tracking-tight">Metric Health Analysis</h2>
                <p className="text-xs text-zinc-500 mt-1 font-medium tracking-wide">Real-time deviation vs. Stage optimal</p>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 px-2 py-1 bg-emerald-500/10 rounded uppercase tracking-tighter border border-emerald-500/20">Model: BioPredict-v4</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 flex-1">
              {data.metricScores.map((m, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${m.score > 80 ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : m.score > 40 ? "bg-amber-500" : "bg-red-500"}`} />
                      <span className="text-xs font-bold text-zinc-300 uppercase tracking-wide">{m.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-zinc-500 font-mono font-bold">
                        {m.current.toFixed(1)} <span className="opacity-40">/</span> {m.optimal.toFixed(1)}
                      </span>
                      <div className="flex items-center gap-1 w-12 justify-end">
                        <span className={`text-xs font-black ${m.score > 80 ? "text-emerald-400" : m.score > 40 ? "text-amber-400" : "text-red-400"}`}>
                          {m.score}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="h-1 bg-zinc-800/50 rounded-full overflow-hidden">
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
            { label: "Days to Harvest", value: `${data.daysToHarvest} days`, icon: <Calendar className="w-5 h-5" />, color: "text-sky-400", bg: "bg-sky-500/10" },
            { label: "Growth Progress", value: `${data.growthProgress}%`, icon: <Activity className="w-5 h-5" />, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Projected Yield", value: `${activePlant.predictedYield} kg/m²`, icon: <Box className="w-5 h-5" />, color: "text-purple-400", bg: "bg-purple-500/10" },
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="glass-card p-5 rounded-xl flex items-center gap-4 group cursor-default"
            >
              <div className={`p-3 rounded-lg ${stat.bg} ${stat.color} transition-transform group-hover:scale-110 duration-300`}>
                {stat.icon}
              </div>
              <div>
                <div className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">{stat.label}</div>
                <div className="text-xl font-black text-zinc-100">{stat.value}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Stage Timeline Card (Clickable) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          onClick={handleOpenRoadmap}
          className="glass-card p-8 rounded-2xl group cursor-pointer hover:border-emerald-500/30 transition-all active:scale-[0.99]"
        >
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-xs font-black text-zinc-400 uppercase tracking-[0.25em] flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Growth Stage Roadmap
            </h2>
            <div className="p-1.5 rounded-lg bg-zinc-900 group-hover:bg-emerald-500/10 transition-colors">
              <Maximize2 className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
            </div>
          </div>
          
          <div className="relative pt-4 pb-12 px-2 flex justify-between items-center">
            {/* Background Line */}
            <div className="absolute top-[26px] left-0 w-full h-1 bg-zinc-800/50 rounded-full overflow-hidden">
               <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${data.growthProgress}%` }}
                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
               />
            </div>
            
            {data.stageTimeline.map((stage, i) => (
              <div key={i} className="relative flex flex-col items-center flex-1">
                <div className={`w-5 h-5 rounded-full border-4 z-10 transition-all duration-500 ${
                  stage.isCurrent 
                    ? "bg-[#09090b] border-emerald-400 scale-125 shadow-[0_0_15px_rgba(52,211,153,0.5)]" 
                    : stage.isCompleted 
                      ? "bg-emerald-500 border-emerald-600" 
                      : "bg-zinc-900 border-zinc-800"
                }`} />
                <div className="absolute top-8 text-center flex flex-col items-center whitespace-nowrap">
                  <div className={`text-[9px] font-black uppercase tracking-wider transition-colors ${stage.isCurrent ? "text-emerald-400" : "text-zinc-600"}`}>
                    {stage.name}
                  </div>
                  <div className="text-[8px] text-zinc-700 font-bold font-mono mt-0.5">D{stage.startDay}-{stage.endDay}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center text-[10px] font-bold text-zinc-600 uppercase tracking-widest group-hover:text-zinc-400 transition-colors">
            Click to view detailed growth specifications
          </div>
        </motion.div>

        {/* Forecast Graph with Axis Values (Increased Height) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="glass-card p-8 rounded-2xl flex flex-col min-h-[480px]"
        >
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
             <div>
               <h2 className="text-xs font-black text-zinc-400 uppercase tracking-[0.25em]">7-Day Trajectory Forecast</h2>
               <p className="text-[10px] text-zinc-500 font-medium mt-1 uppercase tracking-wide">Predictive modeling based on current environmental trends</p>
             </div>
             <div className="flex gap-6 p-2 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
               {['Temp (°C)', 'Soil (%)', 'DLI'].map((l, i) => (
                 <div key={l} className="flex items-center gap-2">
                   <div className={`w-2.5 h-1 rounded-full ${i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-sky-400' : 'bg-emerald-400'}`} />
                   <span className="text-[10px] text-zinc-400 font-black uppercase tracking-tighter">{l}</span>
                 </div>
               ))}
             </div>
           </div>
           
           <div className="flex-1 flex gap-4 ml-2 mr-6 pb-12">
             {/* Y-Axis Labels */}
             <div className="flex flex-col justify-between text-[10px] font-bold text-zinc-600 font-mono pb-8 pt-2">
                <span>100</span>
                <span>75</span>
                <span>50</span>
                <span>25</span>
                <span>0</span>
             </div>

             {/* Chart Area */}
             <div className="flex-1 relative">
               <svg className="w-full h-full overflow-visible" viewBox="0 0 700 200" preserveAspectRatio="none">
                 {/* Grid Lines */}
                 {[0, 50, 100, 150, 200].map(y => (
                   <line key={y} x1="0" y1={y} x2="700" y2={y} stroke="#27272a" strokeWidth="1" strokeDasharray="6 6" className="opacity-30" />
                 ))}
                 
                 {/* Vertical Day Lines */}
                 {data.forecastPoints.map((_, i) => (
                    <line key={i} x1={i * 100} y1="0" x2={i * 100} y2="200" stroke="#27272a" strokeWidth="1" strokeDasharray="6 6" className="opacity-20" />
                 ))}

                 {/* Forecast Lines */}
                 {['temp', 'soil', 'dli'].map((key, ki) => (
                   <motion.path
                     key={key}
                     d={`M ${data.forecastPoints.map((p, i) => `${i * 100},${200 - (p as any)[key] * (key === 'soil' ? 1.5 : 4)}`).join(' L ')}`}
                     fill="none"
                     stroke={ki === 0 ? '#fbbf24' : ki === 1 ? '#38bdf8' : '#34d399'}
                     strokeWidth="4"
                     strokeLinecap="round"
                     strokeLinejoin="round"
                     initial={{ pathLength: 0 }}
                     animate={{ pathLength: 1 }}
                     transition={{ duration: 2.5, delay: 1 + ki * 0.2, ease: "easeInOut" }}
                   />
                 ))}

                 {/* Data Points */}
                 {data.forecastPoints.map((p, i) => (
                   <g key={i}>
                     <circle cx={i * 100} cy={200 - p.temp * 4} r="4" fill="#fbbf24" className="opacity-50" />
                     <circle cx={i * 100} cy={200 - p.soil * 1.5} r="4" fill="#38bdf8" className="opacity-50" />
                     <circle cx={i * 100} cy={200 - p.dli * 4} r="4" fill="#34d399" className="opacity-50" />
                   </g>
                 ))}
               </svg>

               {/* X-Axis Labels */}
               <div className="absolute top-[calc(100%+16px)] left-0 w-full flex justify-between">
                  {data.forecastPoints.map((p, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <div className="text-[11px] font-black text-zinc-500 font-mono">D{p.day}</div>
                      <div className="text-[9px] text-zinc-700 font-bold uppercase mt-1">Forecast</div>
                    </div>
                  ))}
               </div>
             </div>
           </div>
        </motion.div>

      </div>

      {/* Expanded Roadmap Modal (Fixed Cropping) */}
      <AnimatePresence>
      {isRoadmapOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 backdrop-blur-3xl bg-black/90">
           <motion.div 
            initial={{ opacity: 0, scale: 0.8, filter: "blur(20px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.8, filter: "blur(20px)" }}
            className="w-full max-w-5xl h-[700px] relative flex flex-col items-center justify-center"
           >
              {/* Close Button */}
              <button 
                onClick={() => setIsRoadmapOpen(false)}
                className="absolute top-0 right-0 p-6 text-zinc-500 hover:text-white transition-colors z-30"
              >
                <X className="w-10 h-10" />
              </button>

              {/* Navigation Arrows */}
              <div className="absolute inset-y-0 -left-6 md:-left-16 flex items-center z-20">
                <button 
                  onClick={() => paginate(-1)}
                  disabled={stageIndex === 0}
                  className="p-5 rounded-full bg-zinc-900/80 border border-zinc-800 text-white hover:bg-emerald-500 hover:border-emerald-400 transition-all disabled:opacity-0 disabled:cursor-not-allowed group shadow-[0_0_30px_rgba(0,0,0,0.5)]"
                >
                  <ChevronLeft className="w-10 h-10 group-active:scale-90" />
                </button>
              </div>

              <div className="absolute inset-y-0 -right-6 md:-right-16 flex items-center z-20">
                <button 
                  onClick={() => paginate(1)}
                  disabled={stageIndex === activeProfile.stages.length - 1}
                  className="p-5 rounded-full bg-zinc-900/80 border border-zinc-800 text-white hover:bg-emerald-500 hover:border-emerald-400 transition-all disabled:opacity-0 disabled:cursor-not-allowed group shadow-[0_0_30px_rgba(0,0,0,0.5)]"
                >
                  <ChevronRight className="w-10 h-10 group-active:scale-90" />
                </button>
              </div>

              {/* Carousel Container (Increased Height to prevent clipping) */}
              <div className="w-full h-[650px] relative overflow-visible perspective-2000">
                <AnimatePresence initial={false} custom={direction}>
                  <motion.div
                    key={stageIndex}
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                      x: { type: "spring", stiffness: 300, damping: 32 },
                      opacity: { duration: 0.25 },
                      rotateY: { duration: 0.5 },
                      scale: { duration: 0.5 }
                    }}
                    className="absolute inset-0 flex items-center justify-center p-8"
                  >
                    <div className={`w-full max-w-lg bg-zinc-900/90 border-2 rounded-[2.5rem] p-12 flex flex-col shadow-[0_0_100px_rgba(16,185,129,0.2)] backdrop-blur-2xl ${
                      activeProfile.stages[stageIndex].name === activePlant.currentStage 
                        ? "border-emerald-500/60 shadow-[0_0_120px_rgba(16,185,129,0.3)]" 
                        : "border-zinc-800"
                    }`}>
                        <div className="flex justify-between items-start mb-10">
                           <div>
                             <div className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.4em] mb-3">
                               Growth Stage 0{stageIndex + 1} <span className="text-zinc-600">/ 0{activeProfile.stages.length}</span>
                             </div>
                             <h3 className="text-4xl font-black text-white uppercase tracking-tighter leading-none">{activeProfile.stages[stageIndex].name}</h3>
                           </div>
                           {activeProfile.stages[stageIndex].name === activePlant.currentStage && (
                             <div className="px-4 py-1.5 bg-emerald-500 text-black text-[11px] font-black rounded-xl shadow-[0_0_25px_#10b981] animate-pulse">CURRENT ACTIVE</div>
                           )}
                        </div>

                        <div className="space-y-10 flex-1">
                           <div className="grid grid-cols-2 gap-5">
                              {[
                                { label: 'Temperature', val: activeProfile.stages[stageIndex].optimalMetrics.temperature.optimal, unit: '°C' },
                                { label: 'Humidity', val: activeProfile.stages[stageIndex].optimalMetrics.humidity.optimal, unit: '%' },
                                { label: 'PH Balance', val: activeProfile.stages[stageIndex].optimalMetrics.ph.optimal, unit: '' },
                                { label: 'DLI Target', val: activeProfile.stages[stageIndex].optimalMetrics.dli.optimal, unit: '' },
                              ].map(m => (
                                <div key={m.label} className="bg-zinc-950/80 rounded-[1.5rem] p-5 border border-zinc-800/50 hover:border-emerald-500/30 transition-colors">
                                   <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">{m.label}</div>
                                   <div className="text-2xl font-black text-zinc-100 font-mono tracking-tight">{m.val}{m.unit}</div>
                                </div>
                              ))}
                           </div>

                           <div className="bg-emerald-500/5 rounded-3xl p-8 border border-emerald-500/10">
                              <div className="text-[11px] font-black text-emerald-500/60 uppercase tracking-widest mb-5 flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                AI Cultivation Advisor
                              </div>
                              <div className="space-y-4">
                                {activeProfile.stages[stageIndex].aiCultivationNotes.map((note, ni) => (
                                  <div key={ni} className="text-sm text-zinc-400 leading-relaxed font-semibold flex gap-3">
                                    <span className="text-emerald-500">•</span>
                                    {note}
                                  </div>
                                ))}
                              </div>
                           </div>
                        </div>

                        <div className="mt-12 pt-8 border-t border-zinc-800/50 flex justify-between items-center text-[11px] font-black text-zinc-500 uppercase tracking-[0.2em] font-mono">
                          <div className="flex flex-col">
                            <span className="text-[9px] text-zinc-700 mb-1">STAGE DURATION</span>
                            <span className="text-zinc-300">D{activeProfile.stages[stageIndex].startDay} - D{activeProfile.stages[stageIndex].endDay}</span>
                          </div>
                          <div className="flex flex-col text-right">
                            <span className="text-[9px] text-zinc-700 mb-1">CROP LIFECYCLE</span>
                            <span className="text-zinc-300">{activeProfile.expectedLifespanDays} DAYS TOTAL</span>
                          </div>
                        </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Pagination Dots */}
              <div className="flex gap-4 mt-12">
                {activeProfile.stages.map((_, i) => (
                  <button 
                    key={i} 
                    onClick={() => {
                      setDirection(i > stageIndex ? 1 : -1);
                      setStageIndex(i);
                    }}
                    className={`h-2 rounded-full transition-all duration-500 ${
                      i === stageIndex 
                        ? "w-12 bg-emerald-400 shadow-[0_0_15px_#10b981]" 
                        : "w-3 bg-zinc-800 hover:bg-zinc-700"
                    }`}
                  />
                ))}
              </div>
           </motion.div>
        </div>
      )}
      </AnimatePresence>
    </div>
  );
}
