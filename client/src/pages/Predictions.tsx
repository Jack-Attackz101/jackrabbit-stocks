import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, TrendingUp, AlertTriangle } from "lucide-react";
import type { PredictionResponse } from "@shared/schema";

export default function Predictions() {
  const { data: predictions, isLoading, error } = useQuery<PredictionResponse>({
    queryKey: ["/api/predictions"],
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 pt-20">
        <div className="space-y-2 max-w-7xl mx-auto">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 pt-20 max-w-7xl mx-auto">
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          <p>Failed to load predictions. Please ensure your OpenAI integration is active.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 pt-20 pb-12 max-w-7xl mx-auto space-y-12 animate-in fade-in duration-500">
      <div className="text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
          <Sparkles className="w-4 h-4" />
          <span>AI-Powered Analysis</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold font-display text-foreground mb-4">
          Smart Predictions
        </h1>
        <p className="text-lg text-muted-foreground">
          Advanced AI-driven analysis of your portfolio and market opportunities.
        </p>
      </div>

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold mb-6">Portfolio Analysis</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {predictions?.ownedStocks.map((stock) => (
              <Card 
                key={stock.ticker} 
                className="hover-elevate border-0 shadow-lg bg-card/50 backdrop-blur-md rounded-2xl overflow-hidden"
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-2xl font-bold">{stock.ticker}</CardTitle>
                    <Badge variant={stock.action === "Sell" ? "destructive" : "secondary"}>
                      {stock.action}
                    </Badge>
                  </div>
                  <Badge variant="outline" className="text-xs uppercase tracking-wider">
                    {stock.confidence} Confidence
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm font-medium leading-tight">
                    {stock.summary}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {stock.explanation}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-emerald-500" />
            Buy Opportunities
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {predictions?.recommendedBuys.map((stock) => (
              <Card 
                key={stock.ticker}
                className="hover-elevate border-0 shadow-lg bg-emerald-50/30 dark:bg-emerald-950/10 backdrop-blur-md rounded-2xl overflow-hidden"
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-2xl font-bold">{stock.ticker}</CardTitle>
                    <Badge className="bg-emerald-500 text-white border-0">Buy</Badge>
                  </div>
                  <Badge variant="outline" className="text-xs uppercase tracking-wider">
                    {stock.confidence} Confidence
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm font-medium leading-tight">
                    {stock.summary}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {stock.explanation}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
