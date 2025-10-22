import { json } from "body-parser";
import cors from "cors";
import express, { Application, NextFunction, Request, Response } from "express";
import helmet from "helmet";

import storeRoutes from "./routes/storeRoutes";
import { HttpError } from "./utils/HttpError";

// --- Configuration ---
const app: Application = express();

// --- 1. Security and Standard Middleware (Cap 1: Operational) ---

// Helmet: Secures Express apps by setting various HTTP headers
app.use(helmet());

// CORS: Allows cross-origin requests (adjust options for production environment)
app.use(
  cors({
    // credentials: true, // Allow cookies for authentication
    origin: "*", // Allow all origins for simplicity, but restrict this in production
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body-parser: Parses incoming request bodies (JSON payload)
// Limiting payload size is an operational best practice.
app.use(json({ limit: "10kb" }));

// Express built-in middleware to serve static files (e.g., documentation)
app.use(express.static("public"));

// --- 2. API Routing (Cap 3: Resource Identification) ---

// All API endpoints are mounted under the /v1 namespace for versioning
// This ensures that our Resource Paths (e.g., /stores) are predictable and stable.
app.use("/v1", storeRoutes);

// --- 3. Catch-all for Undefined Routes (404) ---

app.all("*", (req: Request, res: Response, next: NextFunction) => {
  // If no route matches, return a 404 Not Found error using our custom error class
  next(new HttpError(`Cannot find ${req.originalUrl} on this server!`, 404));
});

// --- 4. Global Error Handling Middleware (Cap 1: Predictable) ---

// This middleware ensures all errors return a predictable JSON structure
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  // Default status is 500 Internal Server Error
  const status = err instanceof HttpError ? err.statusCode : 500;
  const message = err.message || "An unexpected error occurred on the server.";

  // Log the full error stack in development for debugging
  if (process.env.NODE_ENV === "development") {
    console.error("API Error:", err);
  }

  res.status(status).json({
    status: "error",
    message: message,
  });
});

export default app;
