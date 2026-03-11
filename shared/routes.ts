import { z } from 'zod';
import { insertStockSchema, stocks, type SmartPredictionResponse, type XRayReport, type SimulationResult } from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  stocks: {
    list: {
      method: 'GET' as const,
      path: '/api/stocks',
      responses: {
        200: z.array(z.custom<typeof stocks.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/stocks',
      input: insertStockSchema,
      responses: {
        201: z.custom<typeof stocks.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/stocks/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  market: {
    get: {
      method: 'GET' as const,
      path: '/api/market/:symbol',
      responses: {
        200: z.object({
          symbol: z.string(),
          price: z.number(),
          change: z.number(),
          changePercent: z.number(),
          history: z.array(z.object({
            date: z.string(),
            price: z.number(),
          })),
        }),
        404: errorSchemas.notFound,
      },
    },
  },
  predictions: {
    get: {
      method: 'GET' as const,
      path: '/api/predictions',
      responses: {
        200: z.custom<SmartPredictionResponse>(),
        500: errorSchemas.internal,
      },
    },
  },
  simulate: {
    post: {
      method: 'POST' as const,
      path: '/api/portfolio/simulate',
      input: z.object({
        scenario_type: z.enum(["market_crash", "sector_crash", "stock_crash", "rate_shock"]),
        severity: z.number().optional(),
        sector: z.string().optional(),
        ticker: z.string().optional(),
      }),
      responses: {
        200: z.custom<SimulationResult>(),
        400: errorSchemas.validation,
        500: errorSchemas.internal,
      },
    },
  },
  xray: {
    get: {
      method: 'GET' as const,
      path: '/api/portfolio/xray',
      responses: {
        200: z.custom<XRayReport>(),
        500: errorSchemas.internal,
      },
    },
  },
  orion: {
    chat: {
      method: 'POST' as const,
      path: '/api/orion/chat',
      input: z.object({
        message: z.string(),
        history: z.array(z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string(),
        })).optional(),
      }),
      responses: {
        200: z.object({
          response: z.string(),
        }),
        500: errorSchemas.internal,
      },
    },
  },
};

// ============================================
// HELPER
// ============================================
export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

// ============================================
// TYPE HELPERS
// ============================================
export type StockInput = z.infer<typeof api.stocks.create.input>;
export type StockResponse = z.infer<typeof api.stocks.create.responses[201]>;
export type StocksListResponse = z.infer<typeof api.stocks.list.responses[200]>;
export type MarketDataResponse = z.infer<typeof api.market.get.responses[200]>;
export type PredictionResponse = SmartPredictionResponse;

export { insertStockSchema } from './schema';
