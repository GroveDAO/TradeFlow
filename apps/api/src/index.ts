import express from "express";
import "express-async-errors";
import { HederaService } from "./services/HederaService";
import { BonzoService } from "./services/BonzoService";
import { OracleService } from "./services/OracleService";
import { AIKeeperAgent } from "./services/AIKeeperAgent";
import invoiceRoutes from "./routes/invoices";
import lenderRoutes from "./routes/lenders";
import debtorRoutes from "./routes/debtors";
import keeperRoutes from "./routes/keeper";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", process.env.NEXT_PUBLIC_URL || "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  if (_req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Services
const hedera = new HederaService();
const bonzo = new BonzoService();
const oracle = new OracleService();
const keeper = new AIKeeperAgent(hedera, bonzo, oracle);

// Make keeper available to routes
app.set("keeper", keeper);

// Routes
app.use("/api/invoices", invoiceRoutes);
app.use("/api/lenders", lenderRoutes);
app.use("/api/debtors", debtorRoutes);
app.use("/api/keeper", keeperRoutes);

// Global error handler
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
);

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`TradeFlow API running on port ${PORT}`);
    // Start keeper loop in production
    if (process.env.NODE_ENV === "production") {
      keeper.startKeeperLoop(60_000);
    }
  });
}

export default app;
