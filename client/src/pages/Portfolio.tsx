import { useState } from "react";
import { useStocks, useDeleteStock } from "@/hooks/use-stocks";
import { AddStockForm } from "@/components/AddStockForm";
import { StockCard } from "@/components/StockCard";
import { Loader2, TrendingUp, DollarSign } from "lucide-react";
import { motion } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Currency = "USD" | "EUR" | "GBP" | "JPY";

const currencySymbols: Record<Currency, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
};

export default function Portfolio() {
  const { data: stocks, isLoading } = useStocks();
  const deleteStock = useDeleteStock();
  const [displayCurrency, setDisplayCurrency] = useState<Currency>("USD");

  const totalInvested = stocks?.reduce((sum, stock) => sum + (Number(stock.quantity) * Number(stock.purchasePrice)), 0) || 0;
  const totalCurrentValue = totalInvested * 1.15; // Mock 15% gain
  const totalProfitLoss = totalCurrentValue - totalInvested;

  return (
    <div className="min-h-screen bg-background pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold font-display text-foreground mb-6">Portfolio</h1>
          
          {/* Currency Selector Widget */}
          <motion.div 
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 p-6 rounded-2xl border border-indigo-200/50 shadow-sm mb-6 max-w-sm"
          >
            <div className="flex items-center gap-2 text-indigo-700 mb-4">
              <DollarSign className="w-5 h-5" />
              <span className="text-sm font-bold uppercase tracking-wider">Display Currency</span>
            </div>
            <Select value={displayCurrency} onValueChange={(val) => setDisplayCurrency(val as Currency)}>
              <SelectTrigger className="bg-white border-indigo-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD - US Dollar</SelectItem>
                <SelectItem value="EUR">EUR - Euro</SelectItem>
                <SelectItem value="GBP">GBP - British Pound</SelectItem>
                <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
              </SelectContent>
            </Select>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-8">
          {/* Add Holding Widget */}
          <div className="lg:col-span-1">
            <AddStockForm />
          </div>

          {/* Portfolio Stats */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <motion.div 
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-6 rounded-2xl border border-blue-200/50 shadow-sm"
              >
                <div className="flex items-center gap-2 text-blue-700 mb-3">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Total Invested</span>
                </div>
                <p className="text-2xl font-bold text-blue-900 font-mono">
                  {currencySymbols[displayCurrency]}{totalInvested.toFixed(2)}
                </p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-6 rounded-2xl border border-emerald-200/50 shadow-sm"
              >
                <div className="flex items-center gap-2 text-emerald-700 mb-3">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Current Value</span>
                </div>
                <p className="text-2xl font-bold text-emerald-900 font-mono">
                  {currencySymbols[displayCurrency]}{totalCurrentValue.toFixed(2)}
                </p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className={`bg-gradient-to-br p-6 rounded-2xl border shadow-sm ${
                  totalProfitLoss >= 0 
                    ? 'from-green-50 to-green-100/50 border-green-200/50' 
                    : 'from-red-50 to-red-100/50 border-red-200/50'
                }`}
              >
                <div className={`flex items-center gap-2 mb-3 ${totalProfitLoss >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Total P&L</span>
                </div>
                <p className={`text-2xl font-bold font-mono ${totalProfitLoss >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                  {currencySymbols[displayCurrency]}{Math.abs(totalProfitLoss).toFixed(2)}
                </p>
                <p className={`text-xs font-semibold mt-2 ${totalProfitLoss >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {totalProfitLoss >= 0 ? '+' : ''}{((totalProfitLoss / totalInvested) * 100).toFixed(2)}%
                </p>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Holdings List */}
        <div>
          <h2 className="text-2xl font-bold font-display text-foreground mb-6">Your Holdings</h2>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : stocks && stocks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stocks.map((stock) => (
                <StockCard 
                  key={stock.id} 
                  stock={stock} 
                  onDelete={(id) => deleteStock.mutate(id)}
                  isDeleting={deleteStock.isPending}
                  currency={displayCurrency}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-96 bg-card/50 rounded-3xl border border-dashed border-border text-center p-8">
              <div className="bg-secondary p-4 rounded-full mb-4">
                <TrendingUp className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">No stocks yet</h3>
              <p className="text-muted-foreground max-w-sm">
                Add your first stock to start tracking your portfolio.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
