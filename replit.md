# JackRabbit - Stock Portfolio Tracker

## Overview

JackRabbit is a modern SaaS web application for tracking stock portfolios with AI-driven stock predictions. The application provides a clean, card-based financial dashboard for managing investments, viewing real-time market data, and receiving AI-powered buy/hold/sell recommendations.

The core functionality includes:
- Portfolio management (add, view, delete stocks)
- Real-time market data fetching via Finnhub API
- AI-powered investment predictions using OpenAI
- Multi-currency display support
- Visual portfolio analytics with charts

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, bundled via Vite
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and caching
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Charts**: Recharts for financial visualizations (sparklines, pie charts)
- **Animations**: Framer Motion for smooth UI transitions
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM modules)
- **API Design**: RESTful endpoints defined in `shared/routes.ts` with Zod validation
- **Development**: tsx for running TypeScript directly, Vite dev server with HMR

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Schema Location**: `shared/schema.ts` - single source of truth for database tables
- **Migrations**: Drizzle Kit with `db:push` command for schema updates
- **Numeric Handling**: Uses PostgreSQL `numeric` type for financial precision, converted to/from JavaScript numbers at API boundaries

### API Structure
The API contract is defined in `shared/routes.ts` with typed paths and Zod schemas:
- `GET /api/stocks` - List all portfolio stocks
- `POST /api/stocks` - Add a new stock
- `DELETE /api/stocks/:id` - Remove a stock
- `GET /api/market/:symbol` - Fetch real-time market data (Finnhub)
- `GET /api/predictions` - Get AI investment recommendations
- `GET /api/portfolio/xray` - Portfolio X-Ray risk intelligence report (15-min cache)
- `POST /api/orion/chat` - ORION AI chat endpoint

### AI Integration
- **Provider**: OpenAI via Replit AI Integrations
- **Purpose**: Generate buy/hold/sell recommendations based on portfolio and market data
- **Configuration**: Uses environment variables `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL`

## External Dependencies

### Required Environment Variables
- `DATABASE_URL` - PostgreSQL connection string (provisioned by Replit)
- `AI_INTEGRATIONS_OPENAI_API_KEY` - OpenAI API key (via Replit integration)
- `AI_INTEGRATIONS_OPENAI_BASE_URL` - OpenAI base URL (via Replit integration)
- `FINNHUB_API_KEY` - Finnhub API key for real-time stock data

### Third-Party APIs
- **Finnhub**: Real-time stock prices, market data, company profiles
- **OpenAI**: GPT models for investment analysis and predictions

### Key NPM Packages
- `drizzle-orm` / `drizzle-kit` - Database ORM and migrations
- `@tanstack/react-query` - Async state management
- `openai` - OpenAI SDK
- `zod` - Runtime type validation
- `recharts` - Financial charts
- `framer-motion` - Animations
- `shadcn/ui` components via Radix primitives

### Build & Development
- Development: `npm run dev` - Runs Express + Vite dev server
- Production Build: `npm run build` - Bundles client (Vite) and server (esbuild)
- Type Checking: `npm run check` - TypeScript validation
- Database: `npm run db:push` - Apply schema changes