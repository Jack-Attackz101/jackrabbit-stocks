import { usePrediction } from "@/hooks/use-stocks";
import { type StockResponse } from "@shared/routes";
import { Loader2, BrainCircuit, CheckCircle2, AlertTriangle, AlertOctagon } from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface PredictionCardProps {
  stock: StockResponse;
}

export function PredictionCard({ stock }: PredictionCardProps) {
  const { data: prediction, isLoading, isError } = usePrediction(stock.symbol);

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl p-6 border border-border shadow-sm space-y-4">
        <div className="flex justify-between">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-24" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-2 w-full mt-4" />
      </div>
    );
  }

  if (isError || !prediction) {
    return (
      <div className="bg-card rounded-2xl p-6 border border-border shadow-sm flex items-center justify-center h-[200px] text-muted-foreground">
        Prediction unavailable for {stock.symbol}
      </div>
    );
  }

  const getRecommendationStyle = (rec: string) => {
    switch (rec) {
      case "BUY": return "bg-green-100 text-green-700 border-green-200 hover:bg-green-100";
      case "SELL": return "bg-red-100 text-red-700 border-red-200 hover:bg-red-100";
      default: return "bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100";
    }
  };

  const getRecommendationIcon = (rec: string) => {
    switch (rec) {
      case "BUY": return <CheckCircle2 className="w-4 h-4 mr-1" />;
      case "SELL": return <AlertOctagon className="w-4 h-4 mr-1" />;
      default: return <AlertTriangle className="w-4 h-4 mr-1" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-card rounded-2xl border border-border/50 shadow-lg shadow-primary/5 p-6 relative overflow-hidden"
    >
      {/* Decorative background accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none" />

      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-2xl font-bold font-display">{stock.symbol}</h3>
          <p className="text-sm text-muted-foreground">{stock.name}</p>
        </div>
        <Badge variant="outline" className={`px-3 py-1 text-sm font-bold border ${getRecommendationStyle(prediction.recommendation)}`}>
          {getRecommendationIcon(prediction.recommendation)}
          {prediction.recommendation}
        </Badge>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground font-medium">AI Confidence</span>
            <span className="font-bold text-foreground">{prediction.confidence}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${prediction.confidence}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-primary rounded-full" 
            />
          </div>
        </div>

        <div className="bg-secondary/50 p-4 rounded-xl">
          <div className="flex items-start gap-2">
            <BrainCircuit className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-foreground/80 leading-relaxed">
              {prediction.reasoning}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
