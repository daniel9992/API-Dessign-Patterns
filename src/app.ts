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

app.use((req: Request, res: Response, next: NextFunction) => {
  // If no route matches, return a 404 Not Found error using our custom error class
  next(new HttpError(`Cannot find ${req.originalUrl} on this server!`, 404));
});

// --- 4. Global Error Handling Middleware (Cap 1: Predictable) ---

// Development-specific error handler: sends detailed information
const sendErrorDev = (err: any, res: Response) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

// Production-specific error handler: sends minimal, safe information
const sendErrorProd = (err: any, res: Response) => {
  // For operational, trusted errors, we send a clear message to the client.
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }

  // For programming or unknown errors, we log the details but send a generic message.
  // This prevents leaking sensitive implementation details.
  console.error("UNEXPECTED ERROR 💥:", err);
  res.status(500).json({
    status: "error",
    message: "Something went very wrong on the server.",
  });
};

// This is the main error handling middleware.
// It delegates the response to the appropriate handler based on the environment.
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  // Set default values for status and statusCode if they don't exist
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, res);
  } else {
    // In production, we only want to handle specific error cases explicitly.
    // We create a copy to avoid mutating the original error object.
    let error = { ...err, message: err.message };
    sendErrorProd(error, res);
  }
});

export default app;
