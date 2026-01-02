import { useMarketData } from "@/hooks/use-stocks";
import { type StockResponse } from "@shared/routes";
import { ArrowUpRight, ArrowDownRight, Trash2, TrendingUp } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface StockCardProps {
  stock: StockResponse;
  onDelete: (id: number) => void;
  isDeleting: boolean;
  currency?: "USD" | "EUR" | "GBP" | "JPY";
}

const currencySymbols: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
};

export function StockCard({ stock, onDelete, isDeleting, currency = "USD" }: StockCardProps) {
  const { data: market, isLoading, error } = useMarketData(stock.symbol);
  const currencySymbol = currencySymbols[currency] || "$";

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl p-6 border border-border shadow-sm h-[200px] flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    );
  }

  if (error || !market) {
    return (
      <div className="bg-card rounded-2xl p-6 border border-red-200/50 shadow-sm h-[200px] flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-2xl font-bold text-foreground">{stock.symbol}</h3>
            <p className="text-sm text-muted-foreground">{stock.name}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            disabled={isDeleting}
            onClick={() => onDelete(stock.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
        <div className="bg-red-50 p-3 rounded-lg border border-red-100">
          <p className="text-xs text-red-700 font-semibold">Live data unavailable</p>
          <p className="text-xs text-red-600 mt-1">Unable to fetch current price. Refresh to try again.</p>
        </div>
      </div>
    );
  }

  const currentValue = Number(stock.quantity) * market.price;
  const totalCost = Number(stock.quantity) * Number(stock.purchasePrice);
  const profitLoss = currentValue - totalCost;
  const profitLossPercent = totalCost > 0 ? (profitLoss / totalCost) * 100 : 0;
  const isPositive = profitLoss >= 0;

  // Chart Logic: green if daily change is positive
  const chartColor = market.change >= 0 ? "var(--success)" : "var(--danger)";
  const chartHex = market.change >= 0 ? "#22c55e" : "#ef4444";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative bg-card rounded-2xl border border-border/50 shadow-sm hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 transition-all duration-300 overflow-hidden"
      data-testid={`card-stock-${stock.symbol}`}
    >
      <div className="absolute top-2 right-2 p-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          disabled={isDeleting}
          onClick={() => onDelete(stock.id)}
          data-testid={`button-delete-${stock.symbol}`}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-2xl font-bold font-display tracking-tight text-foreground">{stock.symbol}</h3>
              <span className="px-2 py-0.5 rounded-full bg-secondary text-xs font-semibold text-muted-foreground">
                {stock.exchange}
              </span>
            </div>
            <p className="text-sm text-muted-foreground font-medium truncate max-w-[180px]">{stock.name}</p>
          </div>
          
          <div className={`flex items-center gap-1 text-sm font-bold ${market.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {market.change >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            {Math.abs(market.changePercent).toFixed(2)}%
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Current Value</p>
            <p className="text-lg font-bold font-mono text-foreground">
              {currencySymbol}{currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Total P&L</p>
            <p className={`text-lg font-bold font-mono ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {isPositive ? "+" : ""}{profitLossPercent.toFixed(2)}%
            </p>
          </div>
        </div>

        <div className="flex justify-between items-end mb-4">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">P&L Amount</p>
            <p className={`text-sm font-bold font-mono ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {isPositive ? "+" : ""}{currencySymbol}{Math.abs(profitLoss).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="text-right text-[10px] text-muted-foreground italic">
            Fetched: {new Date(market.timestamp).toLocaleTimeString()}
          </div>
        </div>

        {/* Mini Sparkline Chart */}
        <div className="h-16 -mx-6 -mb-6 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-background/50 to-transparent z-10 pointer-events-none" />
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={market.history}>
              <defs>
                <linearGradient id={`gradient-${stock.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartHex} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={chartHex} stopOpacity={0} />
                </linearGradient>
              </defs>
              <YAxis domain={['dataMin', 'dataMax']} hide />
              <Area
                type="monotone"
                dataKey="price"
                stroke={chartHex}
                fillOpacity={1}
                fill={`url(#gradient-${stock.id})`}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}
