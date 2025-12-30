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

  // Mock Market Data
  app.get(api.market.get.path, async (req, res) => {
    const symbol = req.params.symbol.toUpperCase();
    
    // Generate some deterministic-ish mock data based on symbol char codes
    const seed = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const basePrice = (seed % 200) + 50; // Price between 50 and 250
    const change = (seed % 10) - 5; // Change between -5 and 5
    const changePercent = (change / basePrice) * 100;

    // Generate history
    const history = Array.from({ length: 30 }).map((_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      price: basePrice + Math.sin(i + seed) * 10,
    }));

    res.json({
      symbol,
      price: Number(basePrice.toFixed(2)),
      change: Number(change.toFixed(2)),
      changePercent: Number(changePercent.toFixed(2)),
      history,
    });
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
