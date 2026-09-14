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

const allowedOrigins = [
  WEB_ORIGIN,
  "http://localhost:5173",
  "https://brock-source.github.io",
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins for now in production
    }
  },
  credentials: true
}));
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

const publicDir = path.join(__dirname, "..", "public");
const indexPath = path.join(publicDir, "index.html");

logger.info(`Serving static files from: ${publicDir}`);
app.use(express.static(publicDir));

app.use((req, res, next) => {
  if (req.method === "GET" && !req.path.startsWith("/api")) {
    res.sendFile(indexPath);
  } else {
    next();
  }
});

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Server listening on http://localhost:${PORT}`);
});
