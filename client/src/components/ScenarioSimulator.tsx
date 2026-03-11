import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, ChevronDown, Play, TrendingDown, Zap, Info } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { SimulationResult } from "@shared/schema";
import type { XRayReport } from "@shared/schema";

const SCENARIO_OPTIONS = [
  { value: "market_crash", label: "Market Crash", icon: "📉", description: "Broad market decline across all holdings" },
  { value: "sector_crash", label: "Sector Crash", icon: "🏭", description: "−25% applied to a specific sector" },
  { value: "stock_crash", label: "Single Stock Crash", icon: "💥", description: "−40% drop in one holding" },
  { value: "rate_shock", label: "Interest Rate Shock", icon: "📈", description: "Rate hike impact on growth stocks" },
] as const;

const SEVERITY_LABELS: Record<number, string> = {
  [-10]: "Mild (−10%)",
  [-20]: "Moderate (−20%)",
  [-30]: "Severe (−30%)",
};

function HeatmapBar({ loss_percent }: { loss_percent: number }) {
  const intensity = Math.min(Math.abs(loss_percent) / 40, 1);
  const isNegative = loss_percent < 0;

  if (!isNegative) {
    return <div className="w-full h-2 rounded-full bg-emerald-200" />;
  }

  return (
    <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{
          width: `${intensity * 100}%`,
          background: `rgb(${Math.round(239 * intensity + 252 * (1 - intensity))}, ${Math.round(68 * intensity + 211 * (1 - intensity))}, ${Math.round(68 * intensity + 153 * (1 - intensity))})`,
        }}
      />
    </div>
  );
}

function LossBadge({ pct }: { pct: number }) {
  const isNeg = pct < 0;
  if (!isNeg) return <span className="text-xs font-bold text-emerald-600">+{pct.toFixed(1)}%</span>;
  const intensity = Math.min(Math.abs(pct) / 40, 1);
  const red = Math.round(220 + 20 * intensity);
  const green = Math.round(80 - 60 * intensity);
  return (
    <span className="text-xs font-bold" style={{ color: `rgb(${red},${green},68)` }}>
      {pct.toFixed(1)}%
    </span>
  );
}

export function ScenarioSimulator() {
  const [scenarioType, setScenarioType] = useState<"market_crash" | "sector_crash" | "stock_crash" | "rate_shock">("market_crash");
  const [severity, setSeverity] = useState(-20);
  const [selectedSector, setSelectedSector] = useState("");
  const [selectedTicker, setSelectedTicker] = useState("");
  const [result, setResult] = useState<SimulationResult | null>(null);

  const { data: xray } = useQuery<XRayReport>({
    queryKey: ["/api/portfolio/xray"],
    staleTime: 15 * 60 * 1000,
  });

  const sectors = xray?.sector_distribution.map(s => s.label).filter(s => s !== "Unknown") || [];
  const tickers = xray?.top_holdings.map(h => h.ticker) || [];

  const simulate = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = { scenario_type: scenarioType };
      if (scenarioType === "market_crash") body.severity = severity;
      if (scenarioType === "sector_crash") body.sector = selectedSector || sectors[0];
      if (scenarioType === "stock_crash") body.ticker = selectedTicker || tickers[0];
      const res = await apiRequest("POST", "/api/portfolio/simulate", body);
      return res.json() as Promise<SimulationResult>;
    },
    onSuccess: (data) => setResult(data),
  });

  const currentScenario = SCENARIO_OPTIONS.find(o => o.value === scenarioType)!;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-6 space-y-6" data-testid="scenario-simulator">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Zap className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Scenario Simulator</h3>
      </div>

      {/* Controls */}
      <div className="space-y-4">
        {/* Scenario Selector */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Scenario</label>
          <div className="grid grid-cols-2 gap-2">
            {SCENARIO_OPTIONS.map(opt => (
              <button
                key={opt.value}
                data-testid={`scenario-btn-${opt.value}`}
                onClick={() => { setScenarioType(opt.value); setResult(null); }}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all text-xs font-semibold ${
                  scenarioType === opt.value
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                <span className="text-base">{opt.icon}</span>
                <span className="leading-tight">{opt.label}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">{currentScenario.description}</p>
        </div>

        {/* Severity Slider (market crash only) */}
        {scenarioType === "market_crash" && (
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">
              Severity: <span className="text-foreground">{SEVERITY_LABELS[severity]}</span>
            </label>
            <input
              type="range"
              min={-30}
              max={-10}
              step={10}
              value={severity}
              onChange={e => { setSeverity(Number(e.target.value)); setResult(null); }}
              data-testid="severity-slider"
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>−30%</span><span>−20%</span><span>−10%</span>
            </div>
          </div>
        )}

        {/* Sector Selector */}
        {scenarioType === "sector_crash" && sectors.length > 0 && (
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Target Sector</label>
            <div className="relative">
              <select
                value={selectedSector || sectors[0]}
                onChange={e => { setSelectedSector(e.target.value); setResult(null); }}
                data-testid="sector-select"
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {sectors.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        )}

        {/* Ticker Selector */}
        {scenarioType === "stock_crash" && tickers.length > 0 && (
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Target Stock</label>
            <div className="relative">
              <select
                value={selectedTicker || tickers[0]}
                onChange={e => { setSelectedTicker(e.target.value); setResult(null); }}
                data-testid="ticker-select"
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {tickers.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        )}

        {/* Simulate Button */}
        <button
          onClick={() => simulate.mutate()}
          disabled={simulate.isPending}
          data-testid="simulate-btn"
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3 font-bold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {simulate.isPending ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          {simulate.isPending ? "Simulating…" : "Run Simulation"}
        </button>
      </div>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-5"
            data-testid="simulation-results"
          >
            {/* Divider */}
            <div className="border-t border-border" />

            {/* Before vs After */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                {result.scenario_description}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-secondary/50 rounded-xl p-4">
                  <p className="text-xs text-muted-foreground mb-1">Before</p>
                  <p className="text-xl font-bold text-foreground font-mono">${result.current_value.toLocaleString()}</p>
                </div>
                <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                  <p className="text-xs text-red-600 mb-1">After Shock</p>
                  <p className="text-xl font-bold text-red-700 font-mono">${result.simulated_value.toLocaleString()}</p>
                  <p className="text-xs font-bold text-red-500 mt-0.5">
                    {result.dollar_change.toLocaleString()} ({result.percent_change.toFixed(2)}%)
                  </p>
                </div>
              </div>
            </div>

            {/* Worst Position Alert */}
            {result.worst_position.loss_dollar < 0 && (
              <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-amber-800">
                    Hardest hit: {result.worst_position.ticker}
                  </p>
                  <p className="text-xs text-amber-700">
                    ${Math.abs(result.worst_position.loss_dollar).toLocaleString()} loss ({result.worst_position.loss_percent.toFixed(1)}%)
                  </p>
                </div>
              </div>
            )}

            {/* Loss Heatmap */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Loss Heatmap</p>
              <div className="space-y-2.5">
                {result.top_losses.map((pos, i) => (
                  <div key={pos.ticker} data-testid={`heatmap-row-${i}`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground w-12">{pos.ticker}</span>
                        <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">{pos.sector}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground font-mono">
                          ${Math.abs(pos.loss_dollar).toFixed(0)}
                        </span>
                        <LossBadge pct={pos.loss_percent} />
                      </div>
                    </div>
                    <HeatmapBar loss_percent={pos.loss_percent} />
                  </div>
                ))}
              </div>
            </div>

            {/* Explanation */}
            <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-xl p-3">
              <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700 leading-relaxed">{result.explanation}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
