import "dotenv/config";
import "express-async-errors";
import express from "express";
import cors from "cors";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { Pool } from "pg";
import path from "path";
import fs from "fs";
import { authRouter } from "./routes/auth";
import { adminRouter } from "./routes/admin";
import { clientRouter } from "./routes/client";
import { askBrockRouter } from "./routes/askBrock";
import { errorHandler } from "./middleware/errorHandler";
import { requestLogger } from "./middleware/requestLogger";
import { responseFormatter } from "./utils/response";
import logger from "./utils/logger";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:5173";

const pgPool = new Pool({ connectionString: process.env.DATABASE_URL });
const PgSession = connectPgSimple(session);

app.use(cors({ origin: WEB_ORIGIN, credentials: true }));
app.use(express.json());
app.use(requestLogger);
app.use(responseFormatter);
app.use(
  session({
    store: new PgSession({ pool: pgPool, createTableIfMissing: true }),
    secret: process.env.SESSION_SECRET ?? "dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/client", clientRouter);
app.use("/api/ask-brock", askBrockRouter);

const webRoot = process.cwd().includes("server")
  ? path.join(process.cwd(), "..", "web", "dist")
  : path.join(process.cwd(), "web", "dist");

logger.info(`CWD: ${process.cwd()}`);
logger.info(`Web root: ${webRoot}`);
logger.info(`Web root exists: ${fs.existsSync(webRoot)}`);

const indexPath = path.join(webRoot, "index.html");
logger.info(`Index.html path: ${indexPath}`);
logger.info(`Index.html exists: ${fs.existsSync(indexPath)}`);

if (fs.existsSync(webRoot)) {
  app.use(express.static(webRoot, { extensions: ["html"] }));
  logger.info("Static middleware enabled");
}

app.get("*", (req, res) => {
  logger.info(`Fallback route hit for: ${req.path}`);
  try {
    if (fs.existsSync(indexPath)) {
      logger.info(`Serving index.html from ${indexPath}`);
      const content = fs.readFileSync(indexPath, "utf-8");
      res.setHeader("Content-Type", "text/html");
      res.send(content);
    } else {
      logger.warn(`Index.html not found at ${indexPath}`);
      res.status(404).send("Index.html not found");
    }
  } catch (err) {
    logger.error(`Error serving index.html: ${err}`);
    res.status(500).send(`Error: ${err}`);
  }
});

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Server listening on http://localhost:${PORT}`);
});
