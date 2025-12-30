import { useStocks } from "@/hooks/use-stocks";
import { PredictionCard } from "@/components/PredictionCard";
import { Loader2, Sparkles } from "lucide-react";

export default function Predictions() {
  const { data: stocks, isLoading } = useStocks();

  return (
    <div className="min-h-screen bg-background pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            <span>AI-Powered Insights</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold font-display text-foreground mb-4">
            Smart Predictions
          </h1>
          <p className="text-lg text-muted-foreground">
            Our AI analyzes market trends, news sentiment, and technical indicators to provide buy, hold, or sell recommendations for your portfolio.
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
            <p className="text-muted-foreground mt-2">Add stocks to your dashboard to see AI predictions.</p>
          </div>
        )}
      </div>
    </div>
  );
}
