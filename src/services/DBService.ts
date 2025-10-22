import * as sqlite from "sqlite";
import sqlite3 from "sqlite3";
import { DB_CONFIG } from "../config/db.config";

/**
 * DBService Class: Manages connection, initialization, and CRUD operations.
 * Uses the Singleton pattern to ensure only one database connection is open.
 */
export class DBService {
  private static instance: DBService;
  private db!: sqlite.Database;

  private constructor() {}

  public static getInstance(): DBService {
    if (!DBService.instance) {
      DBService.instance = new DBService();
    }
    return DBService.instance;
  }

  /**
   * Initializes the database connection and creates all necessary tables.
   */
  public async connectAndInit(): Promise<void> {
    // 1. Establish Connection
    this.db = await sqlite.open({
      filename: DB_CONFIG.DATABASE_FILE,
      driver: sqlite3.Database,
    });
    console.log(
      `Successfully connected to SQLite database: ${DB_CONFIG.DATABASE_FILE}`
    );

    // 2. Enable Foreign Keys (Crucial for Resource Relationships)
    if (DB_CONFIG.ENABLE_FOREIGN_KEYS) {
      await this.db.run("PRAGMA foreign_keys = ON;");
    }

    // 3. Initialize Schema
    await this.initSchema();
  }

  /**
   * Executes a database query (SELECT) and returns all results.
   */
  public async query<T>(sql: string, params: any[] = []): Promise<T[]> {
    return await this.db.all<T[]>(sql, ...params);
  }

  /**
   * Executes a non-query command (INSERT, UPDATE, DELETE).
   */

  public async run(sql: string, params: any[] = []) {
    return await this.db.run(sql, ...params);
  }

  /**
   * Creates the application schema (tables) with Foreign Key constraints.
   */
  private async initSchema(): Promise<void> {
    const schema = `
        -- Global Resources
        CREATE TABLE IF NOT EXISTS Users (
            userId TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE
        );

        CREATE TABLE IF NOT EXISTS Products (
            productId TEXT PRIMARY KEY,
            sku TEXT UNIQUE,
            name TEXT NOT NULL,
            baseUnits INTEGER NOT NULL -- Used for 75% low-stock check
        );

        -- Parent Resource
        CREATE TABLE IF NOT EXISTS Stores (
            storeId TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            locationCity TEXT,
            -- Cross Reference to User (Manager)
            managerUserId TEXT, 
            FOREIGN KEY (managerUserId) REFERENCES Users(userId)
        );

        -- Singleton Sub-resource (Inventory)
        CREATE TABLE IF NOT EXISTS Inventory (
            inventoryId INTEGER PRIMARY KEY AUTOINCREMENT,
            storeId TEXT NOT NULL,
            productId TEXT NOT NULL,
            currentStock INTEGER NOT NULL DEFAULT 0,
            lastUpdated DATETIME NOT NULL,
            UNIQUE (storeId, productId),
            FOREIGN KEY (storeId) REFERENCES Stores(storeId) ON DELETE CASCADE,
            FOREIGN KEY (productId) REFERENCES Products(productId)
        );

        -- Nested Transactional Resource: Sales
        CREATE TABLE IF NOT EXISTS Sales (
            saleId TEXT PRIMARY KEY,
            storeId TEXT NOT NULL,
            saleDate DATETIME NOT NULL,
            totalAmountCents INTEGER NOT NULL,
            -- Cross Reference to Employee
            employeeUserId TEXT, 
            FOREIGN KEY (storeId) REFERENCES Stores(storeId) ON DELETE CASCADE,
            FOREIGN KEY (employeeUserId) REFERENCES Users(userId)
        );
        
        -- Nested Transactional Resource: Purchases (from Suppliers)
        CREATE TABLE IF NOT EXISTS Purchases (
            purchaseId TEXT PRIMARY KEY,
            storeId TEXT NOT NULL,
            purchaseDate DATETIME NOT NULL,
            supplierName TEXT,
            totalCostCents INTEGER,
            isReceived INTEGER NOT NULL DEFAULT 0, -- 0=false, 1=true
            employeeUserId TEXT,
            FOREIGN KEY (storeId) REFERENCES Stores(storeId) ON DELETE CASCADE,
            FOREIGN KEY (employeeUserId) REFERENCES Users(userId)
        );
        
        -- Sales Line Items (Association Resource Data)
        CREATE TABLE IF NOT EXISTS SaleLineItems (
            lineItemId INTEGER PRIMARY KEY AUTOINCREMENT,
            saleId TEXT NOT NULL,
            productId TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            unitPriceCents INTEGER NOT NULL,
            FOREIGN KEY (saleId) REFERENCES Sales(saleId) ON DELETE CASCADE,
            FOREIGN KEY (productId) REFERENCES Products(productId)
        );
    `;

    // Execute the schema creation
    await this.db.exec(schema);
    console.log("Database schema initialized successfully.");
  }
}

// Initializing the connection when the application starts
const dbService = DBService.getInstance();
export default dbService;
