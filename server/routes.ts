import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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
    const errorMsg = "[Market Data] CRITICAL ERROR: No API key found for Finnhub or Alpha Vantage. Stock market data engine cannot start. Please add FINNHUB_API_KEY or ALPHA_VANTAGE_API_KEY to your Replit Secrets.";
    console.error(errorMsg);
    // We throw an error at runtime but for the server to stay up we just log it and handle it in the routes
  }

  // Real Market Data - Using Finnhub as primary provider
  const marketDataCache = new Map<string, { data: any; timestamp: number }>();
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async function fetchWithRetry(url: string, options: any, retries = 3, backoff = 1000) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, options);
        if (response.status === 429) {
          const retryAfter = response.headers.get("retry-after");
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : backoff;
          console.warn(`[Market Data] Rate limited (429). Retrying in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          backoff *= 2;
          continue;
        }
        if (!response.ok) {
          const text = await response.text();
          throw new Error(`API returned ${response.status}: ${text}`);
        }
        return response;
      } catch (err) {
        console.error(`[Market Data] Attempt ${i + 1} failed:`, err);
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
      throw new Error("API key missing. Cannot fetch live data. Please configure FINNHUB_API_KEY in Secrets.");
    }

    try {
      // Finnhub Quote API: c=current, pc=prev close, o=open, h=high, l=low, v=volume(not provided in quote but available in candle)
      const quoteUrl = `https://finnhub.io/api/v1/quote?symbol=${cacheKey}&token=${API_KEY}`;
      const response = await fetchWithRetry(quoteUrl, {});
      const data = await response.json();
      
      if (!data.c || data.c === 0) {
        throw new Error(`Invalid ticker or no data found for symbol: ${symbol}`);
      }

      const currentPrice = Number(data.c);
      const previousClose = Number(data.pc);
      const open = Number(data.o);
      const high = Number(data.h);
      const low = Number(data.l);
      
      // Mandatory financial calculations
      const change = Number((currentPrice - previousClose).toFixed(2));
      const changePercent = Number(((change / previousClose) * 100).toFixed(2));

      // Fetch 30-day candles for history and volume
      const to = Math.floor(Date.now() / 1000);
      const from = to - (30 * 24 * 60 * 60); 
      const candleUrl = `https://finnhub.io/api/v1/stock/candle?symbol=${cacheKey}&resolution=D&from=${from}&to=${to}&token=${API_KEY}`;
      
      let history: { date: string; price: number }[] = [{ date: new Date().toISOString().split('T')[0], price: currentPrice }];
      let volume = 0;
      let candleData: any = null;

      try {
        const candleRes = await fetchWithRetry(candleUrl, {});
        if (candleRes.ok) {
          candleData = await candleRes.json();
          if (candleData && candleData.s === "ok") {
            history = candleData.t.map((ts: number, idx: number) => ({
              date: new Date(ts * 1000).toISOString().split('T')[0],
              price: Number(candleData.c[idx].toFixed(2)),
            }));
            volume = Number(candleData.v[candleData.v.length - 1]); // Last day volume
          }
        }
      } catch (err: any) {
        console.warn(`[Market Data] History fetch failed for ${symbol}, using minimal data:`, err.message);
      }

      const marketData = {
        symbol: cacheKey,
        price: Number(currentPrice.toFixed(2)),
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        previousClose: Number(previousClose.toFixed(2)),
        volume,
        change,
        changePercent,
        history,
        timestamp: new Date().toISOString(),
        raw: { quote: data, candles: candleData }, // Return raw for debugging
      };

      marketDataCache.set(cacheKey, { data: marketData, timestamp: Date.now() });
      console.log(`[Market Data] SUCCESS: ${symbol} = $${currentPrice}`);

      return marketData;
    } catch (error: any) {
      console.error(`[Market Data] ERROR for ${symbol}:`, error.message);
      throw error;
    }
  }

  app.get(api.market.get.path, async (req, res) => {
    const symbol = req.params.symbol.toUpperCase();
    
    try {
      const marketData = await fetchRealMarketData(symbol);
      res.json(marketData);
    } catch (error: any) {
      res.status(503).json({
        error: "Market Data Unavailable",
        reason: error.message,
        symbol,
        instructions: !API_KEY ? "Add FINNHUB_API_KEY to Replit Secrets to fix." : "Verify ticker symbol or check API rate limits."
      });
    }
  });

  // AI Predictions
  app.get(api.predictions.get.path, async (req, res) => {
    try {
      const stocks = await storage.getStocks();
      const parsedStocks = stocks.map(s => ({
        ticker: s.symbol,
        quantity: Number(s.quantity),
        purchasePrice: Number(s.purchasePrice),
      }));

      // Gather market data for owned stocks
      const marketDataPromises = parsedStocks.map(s => fetchRealMarketData(s.ticker).catch(() => null));
      const marketDataResults = await Promise.all(marketDataPromises);
      
      const portfolioData = parsedStocks.map((s, idx) => {
        const md = marketDataResults[idx];
        return {
          ...s,
          currentPrice: md?.price || s.purchasePrice,
          changePercent: md?.changePercent || 0,
          volume: md?.volume || 0,
        };
      });

      const systemPrompt = `You are ORION PREDICT, the analytical core of a premium stock portfolio intelligence platform.

You receive the user's live portfolio with real-time market data (price, % change, volume, cost basis). Your role is to deliver sharp, high-conviction investment signals.

## PRIMARY OBJECTIVE
1. Evaluate every owned stock and assign: Hold or Sell. Be willing to say Sell, do not default to Hold.
2. Recommend EXACTLY 6 stocks the user does NOT own. Pick them based on current macro trends, sector strength, momentum, and valuation opportunity. Ensure sector diversity across all 6 picks.

## OUTPUT FORMAT - STRICT JSON
{
  "ownedStocks": [
    {
      "ticker": "string",
      "action": "Hold or Sell",
      "confidence": "High or Medium or Low",
      "summary": "One decisive sentence - what to do and why.",
      "explanation": "2-3 sentences. Use price momentum, earnings trend, sector positioning, or risk factors. Be specific."
    }
  ],
  "recommendedBuys": [
    {
      "ticker": "string",
      "confidence": "High or Medium or Low",
      "summary": "One sentence on why this stands out right now.",
      "explanation": "2-3 sentences. Cover growth catalyst, sector tailwind, valuation angle, or momentum signal. Be specific and timely."
    }
  ]
}

## RULES
* No markdown, no emojis, no disclaimers, no API mentions.
* Never recommend a ticker the user already owns.
* Sell signals must appear when: price is significantly below cost basis, fundamentals are weak, or sector outlook is deteriorating.
* Buy picks must reflect current market conditions, not outdated patterns.
* Confidence: High = strong multi-factor conviction, Medium = 2+ signals aligned, Low = single signal or mixed data.
* Language: tight, decisive, premium. Think Bloomberg Terminal meets Apple design.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: `User Portfolio: ${JSON.stringify(portfolioData)}`
          }
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error("No content from OpenAI");
      
      res.json(JSON.parse(content));
    } catch (error) {
      console.error("Prediction error:", error);
      res.status(500).json({ message: "Failed to generate predictions" });
    }
  });

  // ORION AI Chat
  app.post(api.orion.chat.path, async (req, res) => {
    try {
      const { message, history = [] } = api.orion.chat.input.parse(req.body);
      const stocks = await storage.getStocks();
      const portfolioData = stocks.map(s => ({
        symbol: s.symbol,
        name: s.name,
        quantity: Number(s.quantity),
        purchasePrice: Number(s.purchasePrice),
        exchange: s.exchange,
      }));

      const systemPrompt = `You are ORION, running in FAST MODE inside a live fintech web application.

You are NOT a reasoning sandbox. You are a real-time response engine.

EXECUTION GUARANTEES (CRITICAL)
* You must never pause, stall, or narrate internal steps.
* You must never say: "Let me calculate", "Please wait", "Apologies for the delay", or "I am processing".
* You must respond immediately with the best available result.

DATA SOURCES (ASSUME LIVE)
You have automatic access to the user’s current portfolio data: ${JSON.stringify(portfolioData)}.
Assume data is current, normalized, and safe to use instantly.
You do NOT ask the user for prices. You do NOT delay for confirmation.

WHEN ASKED QUESTIONS LIKE: “What is my top performing stock?”
* Instantly return the answer.
* Use pre-computed portfolio performance.
* Rank by: Total dollar gain (default). Use % gain only if dollar gain is unavailable.

No preamble. No follow-up unless useful. No delay.

PERFORMANCE OPTIMIZATION RULES
* Prefer cached portfolio metrics over recomputation.
* Favor concise answers over exhaustive analysis.
* One insight per paragraph. Avoid unnecessary speculation.

This assistant is optimized for: Low latency, Low token usage, High confidence output.

UI & EXPERIENCE AWARENESS
Your responses appear instantly in glass-style chat bubbles on a clean white background. Be decisive, clean, and fast.

You are ORION in FAST MODE. Users should never feel waiting.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...history.map((h: any) => ({ role: h.role, content: h.content })),
          { role: "user", content: message }
        ],
      });

      res.json({ response: response.choices[0].message.content });
    } catch (error) {
      console.error("Orion error:", error);
      res.status(500).json({ message: "ORION is currently resting. Please try again later." });
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
