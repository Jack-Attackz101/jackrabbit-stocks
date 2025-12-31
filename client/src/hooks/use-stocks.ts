import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type StockInput, type StockResponse, type MarketDataResponse, type PredictionResponse } from "@shared/routes";

// ============================================
// STOCKS CRUD
// ============================================

export function useStocks() {
  return useQuery({
    queryKey: [api.stocks.list.path],
    queryFn: async () => {
      const res = await fetch(api.stocks.list.path);
      if (!res.ok) throw new Error("Failed to fetch stocks");
      return api.stocks.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: StockInput) => {
      // Ensure numeric fields are numbers (zod coerce handles strings but explicit is safer)
      const payload = {
        ...data,
        quantity: Number(data.quantity),
        purchasePrice: Number(data.purchasePrice),
      };
      
      const res = await fetch(api.stocks.create.path, {
        method: api.stocks.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = api.stocks.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to create stock");
      }
      return api.stocks.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.stocks.list.path] }),
  });
}

export function useDeleteStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.stocks.delete.path, { id });
      const res = await fetch(url, { method: api.stocks.delete.method });
      if (!res.ok) throw new Error("Failed to delete stock");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.stocks.list.path] }),
  });
}

// ============================================
// MARKET DATA
// ============================================

export function useMarketData(symbol: string) {
  const query = useQuery({
    queryKey: [api.market.get.path, symbol],
    queryFn: async () => {
      const url = buildUrl(api.market.get.path, { symbol });
      const res = await fetch(url);
      
      // Handle 503 error response properly
      if (res.status === 503) {
        return { error: "Live data unavailable", symbol } as any;
      }
      
      if (!res.ok) throw new Error("Failed to fetch market data");
      return api.market.get.responses[200].parse(await res.json());
    },
    enabled: !!symbol,
    staleTime: 60 * 1000, // Cache for 1 minute
    retry: 1,
  });

  // Expose error state for data unavailable errors
  return {
    ...query,
    error: query.error || query.data?.error === "Live data unavailable",
  };
}

// ============================================
// AI PREDICTIONS
// ============================================

export function usePrediction(symbol: string) {
  return useQuery({
    queryKey: [api.predictions.get.path, symbol],
    queryFn: async () => {
      const url = buildUrl(api.predictions.get.path, { symbol });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch prediction");
      return api.predictions.get.responses[200].parse(await res.json());
    },
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000, // Cache predictions longer (5 mins)
  });
}
