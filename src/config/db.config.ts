/**
 * Configuration for the SQLite database connection.
 */
export const DB_CONFIG = {
  // Use a file path relative to the project root.
  // In production, this might come from an environment variable (process.env.DB_PATH).
  DATABASE_FILE: "store_system.sqlite",
  // Enable foreign keys by default for relational integrity
  ENABLE_FOREIGN_KEYS: true,
};
