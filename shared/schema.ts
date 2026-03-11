import { pgTable, text, serial, integer, numeric, timestamp, date, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===
export const stocks = pgTable("stocks", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  name: text("name").notNull(),
  exchange: text("exchange").notNull(),
  currency: text("currency").notNull(),
  quantity: numeric("quantity").notNull(), // using numeric for precision
  purchasePrice: numeric("purchase_price").notNull(),
  purchaseDate: timestamp("purchase_date").defaultNow(),
});

export const investorProfiles = pgTable("investor_profiles", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().default("default"),
  riskTolerance: text("risk_tolerance").notNull().default("Moderate"),
  preferredSectors: text("preferred_sectors").notNull().default("[]"),
  growthVsDividendBias: text("growth_vs_dividend_bias").notNull().default("Balanced"),
  volatilityPreference: text("volatility_preference").notNull().default("Moderate"),
  investmentStyle: text("investment_style").notNull().default("Diversified"),
  dominantTheme: text("dominant_theme").notNull().default("Mixed"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export type InvestorProfile = typeof investorProfiles.$inferSelect;
export type InvestorProfileParsed = Omit<InvestorProfile, "preferredSectors"> & {
  preferredSectors: string[];
};

// === BASE SCHEMAS ===
export const insertStockSchema = createInsertSchema(stocks).omit({ 
  id: true, 
  purchaseDate: true 
}).extend({
  quantity: z.number().min(0.0001),
  purchasePrice: z.number().min(0),
});

// === EXPLICIT API CONTRACT TYPES ===
export type Stock = typeof stocks.$inferSelect;
export type InsertStock = z.infer<typeof insertStockSchema>;

export type CreateStockRequest = InsertStock;

export type StockResponse = Stock & {
  // Add derived fields that might be useful for frontend if backend computed them
  // But for now, let's keep it simple.
  // Frontend will likely merge this with market data.
};

export type StocksListResponse = StockResponse[];

// Market Data Type (Mocked or Real)
export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  history: { date: string; price: number }[]; // For mini-chart
}

export type SimulationPositionResult = {
  ticker: string;
  sector: string;
  current_value: number;
  simulated_value: number;
  loss_dollar: number;
  loss_percent: number;
};

export type SimulationResult = {
  current_value: number;
  simulated_value: number;
  percent_change: number;
  dollar_change: number;
  worst_position: { ticker: string; loss_dollar: number; loss_percent: number };
  top_losses: SimulationPositionResult[];
  scenario_description: string;
  explanation: string;
};

export type SimulationInput = {
  scenario_type: "market_crash" | "sector_crash" | "stock_crash" | "rate_shock";
  severity?: number;
  sector?: string;
  ticker?: string;
};

export type XRaySlice = { label: string; percentage: number; value: number };

export type XRayReport = {
  portfolio_value: number;
  sector_distribution: XRaySlice[];
  geographic_distribution: XRaySlice[];
  top_holdings: { ticker: string; percentage: number; value: number }[];
  top3_concentration_percent: number;
  beta_score: number;
  volatility_score: number;
  risk_score: number;
  concentration_warning: string | null;
  benchmark_comparison: {
    portfolio_sectors: { sector: string; portfolio_pct: number; sp500_pct: number }[];
  };
  generated_at: string;
};

export type SmartPredictionResponse = {
  ownedStocks: {
    ticker: string;
    action: "Sell" | "Hold";
    confidence: "High" | "Medium" | "Low";
    summary: string;
    explanation: string;
  }[];
  recommendedBuys: {
    ticker: string;
    confidence: "High" | "Medium" | "Low";
    summary: string;
    explanation: string;
  }[];
};
