import { db } from "./db";
import {
  stocks,
  type InsertStock,
  type Stock,
} from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getStocks(): Promise<Stock[]>;
  createStock(stock: InsertStock): Promise<Stock>;
  deleteStock(id: number): Promise<void>;
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
}

export const storage = new DatabaseStorage();
