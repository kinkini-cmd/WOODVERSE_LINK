import http from "node:http";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import path from "node:path";
import { fileURLToPath } from "node:url";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import { Server } from "socket.io";
import { databaseConfigured, initializeDatabase, getPool } from "./db.js";
import { registerRoutes } from "./routes/index.js";
import { devCredentials } from "./routes/auth.js";
import { registerSocketHandlers } from "./socket.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const port = Number(process.env.PORT || 4000);
const configuredOrigins = (process.env.WEB_ORIGIN || "http://localhost:5173,http://localhost:5174")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const app = express();
app.use(helmet());
app.use(cors({ origin: configuredOrigins, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.set("trust proxy", 1);

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: "Too many authentication attempts. Try again later." } });
app.use("/api/auth", authLimiter);

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use("/api", apiLimiter);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: configuredOrigins,
    methods: ["GET", "POST"],
  },
});

registerRoutes(app, io);
registerSocketHandlers(io);

// Global Express error handler — must be 4-argument to be recognized as error middleware
app.use((err, req, res, next) => {
  console.error("[error]", err);
  res.status(err.status || 500).json({ error: err.status ? err.message : "Internal server error" });
});

const frontendDistPath = path.join(__dirname, "..", "..", "..", "frontend", "dist");
if (process.env.NODE_ENV === "production") {
  app.use(express.static(frontendDistPath));
  app.get("*", (request, response) => {
    if (request.path.startsWith("/api")) {
      return response.status(404).json({ error: "Not found" });
    }
    response.sendFile(path.join(frontendDistPath, "index.html"));
  });
}

process.on("unhandledRejection", (reason) => console.error("[unhandledRejection]", reason));
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err);
  process.exit(1);
});

initializeDatabase()
  .then((result) => {
    const databaseStatus = result.initialized ? "ready" : "not_configured";
    server.listen(port, "0.0.0.0",() => {
      console.log(`WoodVerse Express API and Socket.IO server running on http://localhost:${port}`);
      console.log(`PostgreSQL database: ${databaseStatus}`);
      if (!result.initialized && process.env.NODE_ENV !== "production") {
        console.log("No database, so login falls back to seeded in-memory accounts:");
        for (const account of devCredentials) console.log(`  ${account.email} / ${account.password}`);
      }

      const shutdown = (signal) => {
        console.log("Received " + signal + ", shutting down...");
        const hardKill = setTimeout(() => {
          console.error("Graceful shutdown timed out, forcing exit");
          process.exit(1);
        }, 10000);
        server.close(() => {
          io.close(() => {
            const activePool = getPool();
            (activePool ? activePool.end() : Promise.resolve())
              .then(() => {
                clearTimeout(hardKill);
                console.log("Graceful shutdown complete");
                process.exit(0);
              })
              .catch(() => process.exit(1));
          });
        });
      };
      process.on("SIGTERM", () => shutdown("SIGTERM"));
      process.on("SIGINT", () => shutdown("SIGINT"));
    });
  })
  .catch((error) => {
    console.error(`PostgreSQL initialization failed: ${error.message}`);
    server.listen(port, "0.0.0.0", () => console.log(`WoodVerse Express API and Socket.IO server running on http://localhost:${port} without database`));
  });
