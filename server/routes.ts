import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";

// Initialize OpenAI client - Replit handles the API key automatically via the integration
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Stocks CRUD
  app.get(api.stocks.list.path, async (req, res) => {
    const stocks = await storage.getStocks();
    // Convert numeric strings back to numbers for the frontend
    const parsedStocks = stocks.map(s => ({
      ...s,
      quantity: Number(s.quantity),
      purchasePrice: Number(s.purchasePrice),
    }));
    res.json(parsedStocks);
  });

  app.post(api.stocks.create.path, async (req, res) => {
    try {
      // Allow quantity/purchasePrice as numbers in input, storage handles conversion
      const input = api.stocks.create.input.parse(req.body);
      const stock = await storage.createStock(input);
      res.status(201).json({
        ...stock,
        quantity: Number(stock.quantity),
        purchasePrice: Number(stock.purchasePrice),
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.stocks.delete.path, async (req, res) => {
    await storage.deleteStock(Number(req.params.id));
    res.status(204).send();
  });

  // Real Market Data - Using Yahoo Finance via public API
  // Cache to avoid excessive API calls
  const marketDataCache = new Map<string, { data: any; timestamp: number }>();
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async function fetchRealMarketData(symbol: string) {
    const cacheKey = symbol.toUpperCase();
    const cached = marketDataCache.get(cacheKey);
    
    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`[Market Data] Using cached data for ${symbol}`);
      return cached.data;
    }

    try {
      // Using free stock data API (finnhub or yahoo-finance alternative)
      // For development: using a simple fetch to a financial data provider
      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${cacheKey}?interval=1d&range=1mo`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }
      );

      if (!response.ok) {
        console.error(`[Market Data] Failed to fetch ${symbol}: ${response.status}`);
        return null;
      }

      const data = await response.json();
      const result = data.chart?.result?.[0];

      if (!result || !result.quote || result.quote.length === 0) {
        console.error(`[Market Data] No data found for ${symbol}`);
        return null;
      }

      // Extract current price and historical data
      const quote = result.quote[0];
      const currentPrice = quote.close || quote.adjClose;
      const timestamps = result.timestamp || [];
      const closes = result.quote.map((q: any) => q.close || q.adjClose);

      if (!currentPrice || currentPrice <= 0) {
        console.error(`[Market Data] Invalid price for ${symbol}:`, currentPrice);
        return null;
      }

      // Calculate daily change
      const previousClose = closes[closes.length - 2] || closes[closes.length - 1];
      const change = Number((currentPrice - previousClose).toFixed(2));
      const changePercent = Number(((change / previousClose) * 100).toFixed(2));

      // Build history for last 30 days
      const history = timestamps
        .slice(-30)
        .map((ts: number, idx: number) => ({
          date: new Date(ts * 1000).toISOString().split('T')[0],
          price: Number((closes[closes.length - 30 + idx] || currentPrice).toFixed(2)),
        }));

      const marketData = {
        symbol: cacheKey,
        price: Number(currentPrice.toFixed(2)),
        change,
        changePercent,
        history,
        timestamp: new Date().toISOString(),
      };

      // Cache the result
      marketDataCache.set(cacheKey, { data: marketData, timestamp: Date.now() });
      console.log(`[Market Data] Fetched real data for ${symbol}: $${currentPrice}`);

      return marketData;
    } catch (error) {
      console.error(`[Market Data] Error fetching ${symbol}:`, error);
      return null;
    }
  }

  app.get(api.market.get.path, async (req, res) => {
    const symbol = req.params.symbol.toUpperCase();
    
    try {
      const marketData = await fetchRealMarketData(symbol);

      if (!marketData) {
        return res.status(503).json({
          error: "Live data unavailable",
          symbol,
          message: `Unable to fetch market data for ${symbol}. Please try again later.`,
        });
      }

      res.json(marketData);
    } catch (error) {
      console.error(`[Market Data] Unexpected error for ${symbol}:`, error);
      res.status(503).json({
        error: "Live data unavailable",
        symbol,
        message: "Market data service temporarily unavailable",
      });
    }
  });

  // AI Predictions
  app.get(api.predictions.get.path, async (req, res) => {
    const symbol = req.params.symbol.toUpperCase();

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a financial analyst AI. Analyze the given stock symbol. Return a JSON object with 'recommendation' (BUY, HOLD, SELL), 'confidence' (0-100 number), and 'reasoning' (short string). Do not include markdown formatting."
          },
          {
            role: "user",
            content: `Analyze stock symbol: ${symbol}`
          }
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content;
      if (!content) {
         throw new Error("No content from OpenAI");
      }
      const prediction = JSON.parse(content);

      res.json({
        symbol,
        recommendation: prediction.recommendation,
        confidence: prediction.confidence,
        reasoning: prediction.reasoning,
      });
    } catch (error) {
      console.error("OpenAI error:", error);
      // Fallback for demo if AI fails or quota exceeded
      res.json({
        symbol,
        recommendation: "HOLD",
        confidence: 50,
        reasoning: "AI analysis unavailable, defaulting to neutral stance.",
      });
    }
  });

  await seedDatabase();

  return httpServer;
}

// Seed function
async function seedDatabase() {
  const stocks = await storage.getStocks();
  if (stocks.length === 0) {
    await storage.createStock({
      symbol: "AAPL",
      name: "Apple Inc.",
      exchange: "NASDAQ",
      currency: "USD",
      quantity: 10,
      purchasePrice: 150.00,
    });
    await storage.createStock({
      symbol: "TSLA",
      name: "Tesla, Inc.",
      exchange: "NASDAQ",
      currency: "USD",
      quantity: 5,
      purchasePrice: 200.00,
    });
  }
}
