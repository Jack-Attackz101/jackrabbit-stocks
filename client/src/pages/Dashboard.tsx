import { useStocks, useDeleteStock } from "@/hooks/use-stocks";
import { AddStockForm } from "@/components/AddStockForm";
import { StockCard } from "@/components/StockCard";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Loader2, TrendingUp, DollarSign, PieChart as PieIcon } from "lucide-react";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { data: stocks, isLoading } = useStocks();
  const deleteStock = useDeleteStock();

  // Calculate Summary Stats
  const totalInvested = stocks?.reduce((sum, stock) => sum + (Number(stock.quantity) * Number(stock.purchasePrice)), 0) || 0;
  // NOTE: In a real app, current value would require aggregating all market prices.
  // Since market prices are fetched per-card asynchronously, we'll just display "Total Invested" here 
  // or a placeholder to keep it simple without complex context aggregation.
  const stockCount = stocks?.length || 0;

  // Chart Data for Asset Allocation
  const allocationData = stocks?.map((stock, index) => ({
    name: stock.symbol,
    value: Number(stock.quantity) * Number(stock.purchasePrice), // Using cost basis for allocation visualization
    color: `hsl(226, 70%, ${55 + (index * 5)}%)`
  })) || [];

  return (
    <div className="min-h-screen bg-background pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold font-display text-foreground mb-2">Portfolio Dashboard</h1>
            <p className="text-muted-foreground text-lg">Track your investments and market performance.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Form & Stats (4 cols) */}
          <div className="lg:col-span-4 space-y-8">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-card p-4 rounded-2xl border border-border shadow-sm">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Invested</span>
                </div>
                <p className="text-2xl font-bold font-mono text-foreground">
                  ${totalInvested.toLocaleString()}
                </p>
              </div>
              <div className="bg-card p-4 rounded-2xl border border-border shadow-sm">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <PieIcon className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Holdings</span>
                </div>
                <p className="text-2xl font-bold font-mono text-foreground">{stockCount}</p>
              </div>
            </div>

            <AddStockForm />

            {/* Allocation Chart */}
            {allocationData.length > 0 && (
              <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Allocation (Cost Basis)</h3>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={allocationData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {allocationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => `$${value.toLocaleString()}`}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Stock Grid (8 cols) */}
          <div className="lg:col-span-8">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : stocks && stocks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {stocks.map((stock) => (
                  <StockCard 
                    key={stock.id} 
                    stock={stock} 
                    onDelete={(id) => deleteStock.mutate(id)}
                    isDeleting={deleteStock.isPending}
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
                  Add your first stock position using the form on the left to start tracking your portfolio performance.
                </p>
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
