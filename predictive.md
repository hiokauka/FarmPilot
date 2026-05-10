# 📊 Predictive Section — Implementation Plan

## Current State
The `app/predictive/page.tsx` page is **fully hardcoded** and non-functional:
- **Risk factors** (`Powdery Mildew`, etc.) are static arrays with fake numbers.
- **Risk Score** is just `100 - healthScore` with no real logic.
- **Yield Trajectory** chart is a placeholder with a dashed border saying "Historical growth chart renders here."
- Nothing reacts to which plant is active or what stage it's in.

---

## 💡 The Core Idea: Derive Everything from Existing Data

We don't need a real ML model. All the raw data we need already exists:

| What we need | Where it lives |
|---|---|
| Current metric readings | `activePlant.currentMetrics` (temp, humidity, pH, soil, DLI) |
| What the readings *should* be | `activeProfile.stages[n].optimalMetrics` (min/max/optimal) |
| How far along the plant is | `activePlant.dayCount` vs `activeProfile.expectedLifespanDays` |
| When each growth stage starts/ends | `activeProfile.stages[n].startDay` / `.endDay` |
| Predicted yield at harvest | `activePlant.predictedYield` |
| Current stage name | `activePlant.currentStage` |

The predictive system is **rule-based simulation** — we compare current readings vs. optimal ranges, calculate a per-metric health score, and project forward.

---

## 🏗️ Plan: 3 Functional Sections

### Section 1 — Health Score Gauge (Fix the existing one)

**What:** Replace the static `riskScore` with a real computed value.

**How:**
1. Find the current `GrowthStage` from the profile matching `activePlant.currentStage`.
2. For each of the 5 metrics (temp, humidity, soilMoisture, ph, dli), calculate a **per-metric deviation score**:
   - If current value is within `[min, max]` → score is `100`.
   - If outside that range → score decreases proportionally to how far outside it is.
3. Average all 5 scores into one `overallHealthScore` (0–100).
4. `riskScore = 100 - overallHealthScore`.
5. Change the gauge ring color dynamically:
   - `< 30` risk → green (emerald)
   - `30–60` risk → yellow (amber)
   - `> 60` risk → red

**No backend changes needed.** Pure frontend calculation using context data.

---

### Section 2 — Per-Metric Risk Breakdown (Fix the hardcoded risk factors)

**What:** Replace the 4 fake disease names with real per-metric deviation analysis.

**How:** Compute a score for each of the 5 metrics individually, then display them as a bar chart with meaningful labels.

```
Temperature:    ████████░░  82%  ✓ Within range
Humidity:       ██████████  100%  ✓ Optimal
Soil Moisture:  ████░░░░░░  40%  ⚠ Below min
pH:             █████████░  90%  ✓ Within range  
DLI (Light):    ███████░░░  68%  ↑ Approaching max
```

Each bar shows:
- **Name**: Readable metric name
- **Score**: How far from optimal (0–100)
- **Status icon**: ✓ (ok), ⚠ (warning), ✗ (critical)

**Trend indicator** logic:
- Compare current value to the stage's `optimal`. 
- If current > optimal → "↑ High"
- If current < optimal → "↓ Low"
- If within ±5% → "✓ Optimal"

---

### Section 3 — Yield Trajectory & Harvest Timeline (Replace the placeholder)

**What:** Replace the dashed placeholder box with a real visual forecast.

**How:** Generate a simulated growth timeline using the stage data.

**Part A — Stage Progress Timeline (visual bar):**
- A horizontal timeline bar divided into segments (one per stage).
- Each segment shows the stage name and day range (e.g., "Seedling: Day 0–14").
- A marker shows the current day position.
- Completed stages are filled, future stages are dimmed.

**Part B — Projected Harvest Stats:**
Show 3 stat cards:
1. **Days to Harvest**: `expectedLifespanDays - dayCount`
2. **Estimated Yield**: `activePlant.predictedYield` kg/m² (already in data)
3. **Growth Progress**: `(dayCount / expectedLifespanDays) * 100`%

**Part C — 7-Day Metric Forecast (SVG line chart, no library needed):**
- Simulate projected values for the **next 7 days** by interpolating between the current reading and the stage's `optimal` value.
- Draw a simple SVG path for each of the 3 most important metrics (temp, soilMoisture, dli).
- This gives the visual impression of a real ML forecast.

---

## 🔧 Implementation Steps (in order)

### Step 1: Create a `computePredictiveData()` utility function
**File**: `Frontend/my-app/lib/predictiveEngine.ts` (new file)

This pure function takes `(activePlant: ActivePlant, activeProfile: CropKnowledgeProfile)` as input and returns:
```typescript
{
  overallRiskScore: number;          // 0-100
  metricScores: MetricScore[];       // array of 5 scored metrics
  daysToHarvest: number;
  growthProgress: number;            // 0-100%
  stageTimeline: StageTimelineItem[];
  forecastPoints: ForecastPoint[];   // 7 days of projected values
}
```

### Step 2: Rewrite `app/predictive/page.tsx`
- Import and call `computePredictiveData()`.
- Replace the static risk gauge with computed `overallRiskScore`.
- Replace the 4 hardcoded risk factors with the `metricScores` array.
- Replace the placeholder div with the stage timeline + stat cards + SVG chart.

### Step 3: Test with different plants
- Use the "Add Plant" flow to create a Strawberry or Tomato plant.
- Verify all 3 sections update correctly when you switch active plant.

---

## 📐 Metric Score Formula (detailed)

```typescript
function scoreMetric(current: number, min: number, max: number, optimal: number): number {
  // Fully within range = score based on distance to optimal
  if (current >= min && current <= max) {
    const distToOptimal = Math.abs(current - optimal);
    const halfRange = (max - min) / 2;
    return Math.round(100 - (distToOptimal / halfRange) * 15); // Max 15% penalty for being away from optimal
  }
  // Outside range = penalty proportional to how far out
  const breach = current < min ? min - current : current - max;
  const rangeSize = max - min;
  const penalty = Math.min(100, Math.round((breach / rangeSize) * 100));
  return Math.max(0, 100 - penalty - 20); // 20% base penalty for being out of range
}
```

---

## 🎨 UI Notes

- Keep the **dark/premium aesthetic** from `globals.css`.
- Use `framer-motion` for the gauge animation and timeline bar fill.
- The SVG chart should use `emerald`, `amber`, and `sky` stroke colors for the 3 metric lines.
- No external charting library needed (keep bundle small for hackathon demo).

---

## ✅ What This Achieves

| Before | After |
|---|---|
| Static, fake risk factors | Real computed deviation from growth stage benchmarks |
| Placeholder chart box | Visual stage timeline + harvest countdown cards |
| One static gauge | Gauge dynamically reflects live sensor data vs. stage requirements |
| Doesn't change when plant changes | Fully reactive to `activePlant` from `PlantContext` |
