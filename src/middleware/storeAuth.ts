// src/middleware/storeAuth.ts

import { NextFunction, Request, Response } from "express";
import dbService from "../services/DBService"; // Assume already initialized
import { HttpError } from "../utils/HttpError";

/**
 * Checks if the storeId in the URL parameters exists in the database.
 * If not, it throws a 404 Not Found error.
 */
export const storeExistsMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { storeId } = req.params;

  if (!storeId) {
    return next(new HttpError("Missing store identifier in path.", 400));
  }

  try {
    // Query the database to check for store existence
    const [store] = await dbService.query(
      "SELECT storeId FROM Stores WHERE storeId = ?",
      [storeId]
    );

    if (!store) {
      // Predictable error for non-existent resource
      return next(new HttpError(`Store with ID ${storeId} not found.`, 404));
    }

    // Resource is valid, continue to the controller logic
    next();
  } catch (error) {
    // Handle database or unexpected errors
    next(new HttpError("Database lookup failed for store validation.", 500));
  }
};
