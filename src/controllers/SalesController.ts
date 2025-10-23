// src/controllers/SalesController.ts

import { NextFunction, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid"; // Helper for unique IDs
import { Sale, SaleLineItem } from "../models/Transaction"; // Assuming Transaction models file
import dbService from "../services/DBService";
import { InventoryService } from "../services/InventoryService";
import { HttpError } from "../utils/HttpError";

import { SalesService } from "../services/SalesService";

// POST /v1/stores/:storeId/sales
export const createSale = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { storeId } = req.params;
  const { employeeUserId, totalAmountCents, lineItems } = req.body;

  try {
    const newSale = await SalesService.createSale(
      storeId,
      employeeUserId,
      totalAmountCents,
      lineItems
    );
    res.status(201).json(newSale);
  } catch (error) {
    next(error);
  }
};

export const deleteSale = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { saleId } = req.params;

  try {
    await SalesService.deleteSale(saleId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const getAllSales = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { storeId } = req.params;

  try {
    const sales = await SalesService.getAllSales(storeId);
    res.status(200).json(sales);
  } catch (error) {
    next(error);
  }
};

export const getSaleById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { saleId } = req.params;

  try {
    const sale = await SalesService.getSaleById(saleId);
    res.status(200).json(sale);
  } catch (error) {
    next(error);
  }
};
