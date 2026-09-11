import { sendInviteEmailService } from "./email";
import logger from "../utils/logger";

export async function sendInviteEmail(toEmail: string, token: string) {
  try {
    await sendInviteEmailService(toEmail, token);
  } catch (err) {
    logger.error("Failed to send invite email", err as Error, { toEmail });
  }
}
