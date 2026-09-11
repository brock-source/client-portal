import { sendAdminMessageEmailService } from "./email";
import logger from "../utils/logger";

export async function sendAdminMessageEmail(toEmail: string, clientName: string, messageBody: string) {
  try {
    await sendAdminMessageEmailService(toEmail, clientName, messageBody);
  } catch (err) {
    logger.error("Failed to send admin message email", err as Error, { toEmail, clientName });
  }
}
