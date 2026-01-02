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

  // Financial API Configuration
  const API_KEY = process.env.FINNHUB_API_KEY || process.env.ALPHA_VANTAGE_API_KEY;
  
  if (!API_KEY) {
    console.warn("[Market Data] WARNING: No API key found for Finnhub or Alpha Vantage. Market data will fail.");
  }

  // Real Market Data - Using Finnhub as primary provider
  const marketDataCache = new Map<string, { data: any; timestamp: number }>();
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async function fetchWithRetry(url: string, options: any, retries = 3, backoff = 1000) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, options);
        if (response.status === 429) {
          console.log(`[Market Data] Rate limited. Retrying in ${backoff}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoff));
          backoff *= 2;
          continue;
        }
        return response;
      } catch (err) {
        if (i === retries - 1) throw err;
        await new Promise(resolve => setTimeout(resolve, backoff));
        backoff *= 2;
      }
    }
    throw new Error("Max retries exceeded");
  }

  async function fetchRealMarketData(symbol: string) {
    const cacheKey = symbol.toUpperCase();
    const cached = marketDataCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`[Market Data] Using cached data for ${symbol}`);
      return cached.data;
    }

    if (!API_KEY) {
      console.error("[Market Data] API key missing. Cannot fetch data.");
      return null;
    }

    try {
      // Finnhub Quote API
      const quoteUrl = `https://finnhub.io/api/v1/quote?symbol=${cacheKey}&token=${API_KEY}`;
      const response = await fetchWithRetry(quoteUrl, {});

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Market Data] Finnhub error for ${symbol}: ${response.status} - ${errorText}`);
        return null;
      }

      const data = await response.json();
      
      // Finnhub returns 0 for price if symbol not found
      if (!data.c || data.c === 0) {
        console.error(`[Market Data] Symbol not found or no data: ${symbol}`);
        return null;
      }

      // Calculations according to mandatory requirements
      const currentPrice = Number(data.c);
      const previousClose = Number(data.pc);
      const change = Number((currentPrice - previousClose).toFixed(2));
      const changePercent = Number(((change / previousClose) * 100).toFixed(2));

      // Fetch basic history for the chart (candles)
      const to = Math.floor(Date.now() / 1000);
      const from = to - (30 * 24 * 60 * 60); // 30 days
      const candleUrl = `https://finnhub.io/api/v1/stock/candle?symbol=${cacheKey}&resolution=D&from=${from}&to=${to}&token=${API_KEY}`;
      const candleRes = await fetchWithRetry(candleUrl, {});
      
      let history = [];
      if (candleRes.ok) {
        const candleData = await candleRes.json();
        if (candleData.s === "ok") {
          history = candleData.t.map((ts: number, idx: number) => ({
            date: new Date(ts * 1000).toISOString().split('T')[0],
            price: Number(candleData.c[idx].toFixed(2)),
          }));
        }
      }

      const marketData = {
        symbol: cacheKey,
        price: Number(currentPrice.toFixed(2)),
        change,
        changePercent,
        history: history.length > 0 ? history : [{ date: new Date().toISOString().split('T')[0], price: currentPrice }],
        timestamp: new Date().toISOString(),
        raw: data, // For debugging as requested
      };

      marketDataCache.set(cacheKey, { data: marketData, timestamp: Date.now() });
      console.log(`[Market Data] REAL DATA: ${symbol} = $${currentPrice} (Change: ${change}%)`);

      return marketData;
    } catch (error) {
      console.error(`[Market Data] Critical error fetching ${symbol}:`, error);
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
