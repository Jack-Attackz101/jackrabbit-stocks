import { useStocks } from "@/hooks/use-stocks";
import { PredictionCard } from "@/components/PredictionCard";
import { Loader2, Sparkles } from "lucide-react";

export default function Predictions() {
  const { data: stocks, isLoading } = useStocks();

  return (
    <div className="min-h-screen bg-background pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            <span>AI-Powered Analysis</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold font-display text-foreground mb-4">
            Smart Predictions
          </h1>
          <p className="text-lg text-muted-foreground">
            Our advanced AI analyzes real market data, technical indicators, and trading patterns to provide intelligent buy, hold, or sell recommendations. Make smarter investment decisions backed by data-driven insights.
          </p>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground animate-pulse">Analyzing market data...</p>
          </div>
        ) : stocks && stocks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {stocks.map((stock) => (
              <PredictionCard key={stock.id} stock={stock} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-card rounded-3xl border border-dashed border-border">
            <h3 className="text-xl font-bold text-foreground">No stocks in portfolio</h3>
            <p className="text-muted-foreground mt-2">Add stocks to your portfolio to see AI predictions.</p>
          </div>
        )}

        {/* Recommended Stocks Section */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold font-display text-foreground mb-4">AI-Recommended Stocks to Buy</h2>
          <p className="text-muted-foreground mb-6">Based on current market analysis and trends</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { symbol: "MSFT", name: "Microsoft", reason: "Strong cloud growth momentum", confidence: 92 },
              { symbol: "NVDA", name: "NVIDIA", reason: "AI industry leader, expanding TAM", confidence: 88 },
              { symbol: "AMZN", name: "Amazon", reason: "AWS dominance and retail recovery", confidence: 85 },
            ].map((stock) => (
              <div key={stock.symbol} className="bg-card rounded-2xl p-6 border border-green-200/50 shadow-sm hover:shadow-lg transition-all">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{stock.symbol}</h3>
                    <p className="text-sm text-muted-foreground">{stock.name}</p>
                  </div>
                  <div className="px-2 py-1 bg-green-100 rounded-full">
                    <span className="text-xs font-bold text-green-700">BUY</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{stock.reason}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Confidence</span>
                  <span className="text-lg font-bold text-green-600">{stock.confidence}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
