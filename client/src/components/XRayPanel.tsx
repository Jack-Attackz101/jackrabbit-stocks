import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Legend } from "recharts";
import { motion } from "framer-motion";
import { AlertTriangle, Activity, Globe, Layers, TrendingUp, Zap } from "lucide-react";
import type { XRayReport } from "@shared/schema";

const SECTOR_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b",
  "#10b981", "#3b82f6", "#ef4444", "#14b8a6",
  "#f97316", "#84cc16", "#06b6d4",
];

const GEO_COLORS = [
  "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b",
  "#ef4444", "#ec4899", "#14b8a6", "#f97316",
];

function RiskBadge({ score }: { score: number }) {
  const level = score <= 3 ? "Low" : score <= 6 ? "Medium" : "High";
  const styles = {
    Low: "bg-emerald-100 text-emerald-800 border-emerald-200",
    Medium: "bg-amber-100 text-amber-800 border-amber-200",
    High: "bg-red-100 text-red-800 border-red-200",
  }[level];

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-bold ${styles}`}>
      <Activity className="w-3.5 h-3.5" />
      Risk: {level} ({score.toFixed(1)}/10)
    </div>
  );
}

function MetricPill({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="flex flex-col items-center bg-secondary/60 rounded-xl p-3 gap-1 min-w-[80px]">
      <Icon className="w-4 h-4 text-muted-foreground" />
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <span className="text-sm font-bold text-foreground">{value}</span>
    </div>
  );
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border border-border rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-bold text-foreground">{payload[0].name}</p>
      <p className="text-muted-foreground">{payload[0].value.toFixed(1)}%</p>
    </div>
  );
};

export function XRayPanel() {
  const { data, isLoading, error } = useQuery<XRayReport>({
    queryKey: ["/api/portfolio/xray"],
    staleTime: 15 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <Zap className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Portfolio X-Ray</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-10 bg-secondary/50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data || data.portfolio_value === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Portfolio X-Ray</h3>
        </div>
        <p className="text-sm text-muted-foreground">Add stocks to your portfolio to generate the X-Ray analysis.</p>
      </div>
    );
  }

  const sectorChartData = data.sector_distribution.map(s => ({ name: s.label, value: s.percentage }));
  const geoChartData = data.geographic_distribution.map(g => ({ name: g.label, value: g.percentage }));
  const benchmarkData = data.benchmark_comparison.portfolio_sectors.slice(0, 8).map(s => ({
    name: s.sector.length > 12 ? s.sector.slice(0, 10) + "…" : s.sector,
    Portfolio: s.portfolio_pct,
    "S&P 500": s.sp500_pct,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-card rounded-2xl border border-border shadow-sm p-6 space-y-6"
      data-testid="xray-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Portfolio X-Ray</h3>
        </div>
        <RiskBadge score={data.risk_score} />
      </div>

      {/* Concentration Warning */}
      {data.concentration_warning && (
        <motion.div
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3"
          data-testid="concentration-warning"
        >
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800 font-medium">{data.concentration_warning}</p>
        </motion.div>
      )}

      {/* Metric Pills */}
      <div className="flex gap-3 flex-wrap">
        <MetricPill label="Beta" value={data.beta_score.toFixed(2)} icon={Activity} />
        <MetricPill label="Volatility" value={`${data.volatility_score.toFixed(1)}/10`} icon={TrendingUp} />
        <MetricPill label="Top 3" value={`${data.top3_concentration_percent.toFixed(0)}%`} icon={Layers} />
        <MetricPill label="Regions" value={`${data.geographic_distribution.length}`} icon={Globe} />
      </div>

      {/* Sector + Geo Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sector Donut */}
        {sectorChartData.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Sector Allocation</p>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sectorChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                    {sectorChartData.map((_, i) => (
                      <Cell key={i} fill={SECTOR_COLORS[i % SECTOR_COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 mt-2">
              {data.sector_distribution.slice(0, 5).map((s, i) => (
                <div key={s.label} className="flex items-center justify-between text-xs" data-testid={`sector-row-${i}`}>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: SECTOR_COLORS[i % SECTOR_COLORS.length] }} />
                    <span className="text-muted-foreground truncate max-w-[120px]">{s.label}</span>
                  </div>
                  <span className="font-bold text-foreground">{s.percentage.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Geography Donut */}
        {geoChartData.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Geographic Exposure</p>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={geoChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                    {geoChartData.map((_, i) => (
                      <Cell key={i} fill={GEO_COLORS[i % GEO_COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 mt-2">
              {data.geographic_distribution.slice(0, 5).map((g, i) => (
                <div key={g.label} className="flex items-center justify-between text-xs" data-testid={`geo-row-${i}`}>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: GEO_COLORS[i % GEO_COLORS.length] }} />
                    <span className="text-muted-foreground">{g.label}</span>
                  </div>
                  <span className="font-bold text-foreground">{g.percentage.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Benchmark Comparison */}
      {benchmarkData.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">vs S&P 500 Sector Weights</p>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={benchmarkData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barSize={8}>
                <XAxis dataKey="name" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} contentStyle={{ borderRadius: "10px", border: "none", fontSize: "11px" }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "10px" }} />
                <Bar dataKey="Portfolio" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="S&P 500" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground/50 text-right">
        Generated {new Date(data.generated_at).toLocaleTimeString()} · Refreshes every 15 min
      </p>
    </motion.div>
  );
}
