import { db } from "./db";
import {
  stocks,
  investorProfiles,
  type InsertStock,
  type Stock,
  type InvestorProfile,
  type InvestorProfileParsed,
} from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getStocks(): Promise<Stock[]>;
  createStock(stock: InsertStock): Promise<Stock>;
  deleteStock(id: number): Promise<void>;
  getInvestorProfile(userId?: string): Promise<InvestorProfileParsed | null>;
  upsertInvestorProfile(profile: Omit<InvestorProfileParsed, "id" | "lastUpdated">, userId?: string): Promise<InvestorProfileParsed>;
}

function parseProfile(p: InvestorProfile): InvestorProfileParsed {
  return {
    ...p,
    preferredSectors: JSON.parse(p.preferredSectors || "[]"),
  };
}

export class DatabaseStorage implements IStorage {
  async getStocks(): Promise<Stock[]> {
    return await db.select().from(stocks);
  }

  async createStock(insertStock: InsertStock): Promise<Stock> {
    const [stock] = await db.insert(stocks)
      .values({
        ...insertStock,
        quantity: insertStock.quantity.toString(),
        purchasePrice: insertStock.purchasePrice.toString(),
      })
      .returning();
    return stock;
  }

  async deleteStock(id: number): Promise<void> {
    await db.delete(stocks).where(eq(stocks.id, id));
  }

  async getInvestorProfile(userId = "default"): Promise<InvestorProfileParsed | null> {
    const [profile] = await db.select().from(investorProfiles).where(eq(investorProfiles.userId, userId));
    return profile ? parseProfile(profile) : null;
  }

  async upsertInvestorProfile(
    data: Omit<InvestorProfileParsed, "id" | "lastUpdated">,
    userId = "default"
  ): Promise<InvestorProfileParsed> {
    const existing = await this.getInvestorProfile(userId);
    const row = {
      userId,
      riskTolerance: data.riskTolerance,
      preferredSectors: JSON.stringify(data.preferredSectors),
      growthVsDividendBias: data.growthVsDividendBias,
      volatilityPreference: data.volatilityPreference,
      investmentStyle: data.investmentStyle,
      dominantTheme: data.dominantTheme,
      lastUpdated: new Date(),
    };

    if (existing) {
      const [updated] = await db.update(investorProfiles)
        .set(row)
        .where(eq(investorProfiles.userId, userId))
        .returning();
      return parseProfile(updated);
    } else {
      const [created] = await db.insert(investorProfiles).values(row).returning();
      return parseProfile(created);
    }
  }
}

export const storage = new DatabaseStorage();
