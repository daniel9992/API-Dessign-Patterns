import { v4 as uuidv4 } from "uuid";
import { Sale, SaleLineItem } from "../models/Transaction";
import dbService from "./DBService";
import { InventoryService } from "./InventoryService";
import { HttpError } from "../utils/HttpError";

export class SalesService {
  public static async createSale(
    storeId: string,
    employeeUserId: string,
    totalAmountCents: number,
    lineItems: SaleLineItem[]
  ): Promise<Sale> {
    const saleId = uuidv4();
    const saleDate = new Date().toISOString();

    if (!employeeUserId || !lineItems || lineItems.length === 0) {
      throw new HttpError("Missing employee ID or sale line items.", 400);
    }

    await InventoryService.checkStock(storeId, lineItems);

    await dbService.run(
      `INSERT INTO Sales (saleId, storeId, employeeUserId, saleDate, totalAmountCents)
             VALUES (?, ?, ?, ?, ?)`,
      [saleId, storeId, employeeUserId, saleDate, totalAmountCents]
    );

    await InventoryService.recordSaleLineItems(saleId, lineItems);

    await InventoryService.reduceStockForSale(
      storeId,
      lineItems,
      employeeUserId
    );

    const newSale: Sale = {
      saleId,
      storeId,
      employeeUserId,
      totalAmountCents,
      saleDate: new Date(saleDate),
      lineItems,
    };
    return newSale;
  }

  public static async getSaleById(saleId: string): Promise<Sale> {
    const [sale] = await dbService.query<Sale>(
      `SELECT saleId, storeId, employeeUserId, saleDate, totalAmountCents FROM Sales WHERE saleId = ?`,
      [saleId]
    );
    if (!sale) {
      throw new HttpError(`Sale with ID ${saleId} not found.`, 404);
    }
    const lineItems = await dbService.query<SaleLineItem>(
      `SELECT productId, quantity, unitPriceCents FROM SaleLineItems WHERE saleId = ?`,
      [saleId]
    );
    sale.lineItems = lineItems;
    return sale;
  }

  public static async getAllSales(storeId: string): Promise<Sale[]> {
    const sales = await dbService.query<Sale>(
      `SELECT saleId, storeId, employeeUserId, saleDate, totalAmountCents FROM Sales WHERE storeId = ?`,
      [storeId]
    );
    return sales;
  }

  public static async deleteSale(saleId: string): Promise<void> {
    const sale = await this.getSaleById(saleId);
    if (!sale) {
      throw new HttpError(`Sale with ID ${saleId} not found.`, 404);
    }

    await InventoryService.increaseStockForPurchase(
      sale.storeId,
      sale.lineItems.map((item) => ({
        ...item,
        quantityOrdered: item.quantity,
        purchaseId: "",
        costPriceCents: item.unitPriceCents,
      })),
      sale.employeeUserId
    );

    await dbService.run(`DELETE FROM SaleLineItems WHERE saleId = ?`, [saleId]);
    await dbService.run(`DELETE FROM Sales WHERE saleId = ?`, [saleId]);
  }
}
