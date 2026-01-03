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

      const systemPrompt = `You are an advanced AI investment analysis engine embedded inside a stock portfolio tracking web application.

You will be given:
* The user’s current stock holdings (ticker, quantity, average cost)
* Real-time and recent historical stock data retrieved via the Finnhub API (price, % change, volume)

Your task is to generate clear, actionable smart predictions — NOT financial advice — using data-driven reasoning.

## CORE OBJECTIVE
1. Analyze each stock the user currently owns
2. Classify each one into exactly one of the following: Sell, Hold
3. Recommend new stocks the user does NOT own as: Buy Opportunities

## OUTPUT STRUCTURE (VERY IMPORTANT)
Return your response in clean, structured JSON exactly matching this schema:
{
  "ownedStocks": [
    {
      "ticker": "AAPL",
      "action": "Hold",
      "confidence": "High",
      "summary": "Short one-sentence verdict.",
      "explanation": "A concise but insightful explanation using market trends, fundamentals, recent performance, and sentiment."
    }
  ],
  "recommendedBuys": [
    {
      "ticker": "NVDA",
      "confidence": "Medium",
      "summary": "Why this stock stands out right now.",
      "explanation": "Clear reasoning based on growth signals, momentum, valuation, or sector tailwinds."
    }
  ]
}

Do NOT include markdown. Do NOT include emojis. Do NOT include disclaimers. Do NOT mention APIs.

## ANALYSIS RULES
* Use real data trends, not vibes
* Favor clarity over jargon
* Prioritize: Revenue growth, Earnings trends, Analyst sentiment, News impact, Technical momentum

## TONE & PERSONALITY
* Confident, calm, and intelligent
* Sounds like a premium Apple-style financial assistant
* Insightful but not verbose

## UI-AWARE RESPONSE STYLE
* Keep explanations tight and scannable
* Avoid long paragraphs
* One strong idea per explanation`;

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
