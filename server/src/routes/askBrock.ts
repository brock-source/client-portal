import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../validation/validator";
import { AppError } from "../utils/appError";
import logger from "../utils/logger";
import { askBrock } from "../services/askBrock";
import * as schemas from "../validation/schemas";

export const askBrockRouter = Router();
askBrockRouter.use(requireAuth);

askBrockRouter.post("/ask", validateBody(schemas.askBrockSchema), async (req, res) => {
  const { question } = req.body;

  try {
    const result = await askBrock(question.trim());
    res.ok(result);
  } catch (err) {
    logger.error("[ask-brock] Failed to answer question", err as Error);
    const message = err instanceof Error ? err.message : "Ask Brock is unavailable right now.";
    throw new AppError(503, "ASK_BROCK_UNAVAILABLE", message);
  }
});
