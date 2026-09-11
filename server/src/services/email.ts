import { Resend } from "resend";
import logger from "../utils/logger";

const FROM_EMAIL = "onboarding@stonecenturyfinancial.com";

let resend: Resend | null = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

async function sendEmailWithRetry(
  to: string,
  subject: string,
  html: string,
  maxAttempts: number = 3
): Promise<void> {
  if (!resend) {
    logger.warn("Resend API key not configured. Email not sent.", undefined, { to, subject });
    return;
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject,
        html,
      });
      logger.info(`Email sent successfully to ${to}`, { subject });
      return;
    } catch (err) {
      logger.warn(`Email send attempt ${attempt}/${maxAttempts} failed`, err as Error, { to, subject });

      if (attempt === maxAttempts) {
        logger.error(`Failed to send email after ${maxAttempts} attempts`, err as Error, { to, subject });
        throw err;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
}

export async function sendInviteEmailService(email: string, inviteToken: string): Promise<void> {
  const inviteUrl = `${process.env.WEB_ORIGIN}/set-password?token=${inviteToken}`;

  const html = `
    <h2>Welcome to Stone Century Financial</h2>
    <p>You've been invited to join our client portal. Click the link below to set your password and get started:</p>
    <p><a href="${inviteUrl}">Accept Invitation</a></p>
    <p>This link expires in 7 days.</p>
  `;

  await sendEmailWithRetry(email, "Welcome to Stone Century Financial", html);
}

export async function sendAdminMessageEmailService(
  to: string,
  clientName: string,
  messageBody: string
): Promise<void> {
  const html = `
    <h2>New Message from Stone Century Financial</h2>
    <p>Hello ${clientName},</p>
    <p>${messageBody.replace(/\n/g, "<br>")}</p>
    <p><a href="${process.env.WEB_ORIGIN}/dashboard">View in Portal</a></p>
  `;

  await sendEmailWithRetry(to, "New Message from Stone Century Financial", html);
}

export async function sendNotificationEmailService(
  to: string,
  clientName: string,
  notificationType: string,
  notificationData: Record<string, any>
): Promise<void> {
  let subject = "Stone Century Financial Update";
  let html = "<h2>Stone Century Financial Update</h2>";

  switch (notificationType) {
    case "action_item":
      subject = "New Action Item";
      html += `<p>Hello ${clientName},</p><p>A new action item has been assigned: ${notificationData.text}</p>`;
      break;

    case "message":
      subject = "New Message from Stone Century Financial";
      html += `<p>Hello ${clientName},</p><p>${notificationData.body}</p>`;
      break;

    case "document":
      subject = "Document Uploaded";
      html += `<p>Hello ${clientName},</p><p>A new document has been uploaded: ${notificationData.category}</p>`;
      break;

    default:
      html += `<p>Hello ${clientName},</p><p>You have a new notification.</p>`;
  }

  html += `<p><a href="${process.env.WEB_ORIGIN}/dashboard">View in Portal</a></p>`;

  await sendEmailWithRetry(to, subject, html);
}
