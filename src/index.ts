// src/index.ts (Conceptual Application Entry Point)

import app from "./app";
import dbService from "./services/DBService";

async function startServer() {
  try {
    // 1. Initialize Database Connection and Schema
    await dbService.connectAndInit();

    // 2. Start Express Server
    const PORT = process.env.PORT || 3000;

    console.log(`Server running on port ${PORT}`);
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
