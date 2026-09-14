import { Resend } from "resend";
import logger from "../utils/logger";

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "StoneCentury <onboarding@resend.dev>";

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

let resend: Resend | null = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
  logger.info("Resend initialized with API key");
} else {
  logger.warn("RESEND_API_KEY environment variable not set");
}

async function sendEmailWithRetry(
  to: string,
  subject: string,
  html: string,
  maxAttempts: number = 3
): Promise<void> {
  if (!resend) {
    logger.warn("Resend client not initialized - API key may not be configured", undefined, { to, subject });
    return;
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      logger.info(`Attempting to send email (attempt ${attempt}/${maxAttempts})`, undefined, { to, from: FROM_EMAIL, subject });

      const response = await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject,
        html,
      });

      logger.info(`Resend API response:`, undefined, { response: JSON.stringify(response) });

      if (response.error) {
        throw new Error(`Resend error: ${JSON.stringify(response.error)}`);
      }

      logger.info(`Email sent successfully to ${to}`, undefined, { subject, response });
      return;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.warn(`Email send attempt ${attempt}/${maxAttempts} failed: ${errorMsg}`, err as Error, { to, subject, from: FROM_EMAIL });

      if (attempt === maxAttempts) {
        logger.error(`Failed to send email after ${maxAttempts} attempts: ${errorMsg}`, err as Error, { to, subject, from: FROM_EMAIL });
        throw err;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
}

export async function sendInviteEmailService(email: string, inviteToken: string): Promise<void> {
  const inviteUrl = `${process.env.WEB_ORIGIN}/set-password?token=${inviteToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif; background-color: #f1f0ee; padding: 20px 0; }
        .wrapper { max-width: 600px; margin: 0 auto; }
        .container { background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #2e4763 0%, #223549 100%); padding: 50px 30px; text-align: center; }
        .logo { font-size: 28px; font-weight: 700; color: #ffffff; margin-bottom: 8px; letter-spacing: -0.5px; }
        .logo-subtitle { font-size: 11px; color: #b3c1d2; letter-spacing: 2px; text-transform: uppercase; font-weight: 600; }
        .content { padding: 50px 40px; }
        .greeting { font-size: 20px; font-weight: 700; color: #1a1a1a; margin-bottom: 24px; line-height: 1.3; }
        .body-text { font-size: 15px; line-height: 1.7; color: #333333; margin-bottom: 24px; }
        .body-text:last-of-type { margin-bottom: 36px; }
        .cta-container { text-align: center; margin: 48px 0; }
        .cta-button { display: inline-block; background-color: #2e4763; color: #ffffff !important; padding: 16px 48px; text-decoration: none !important; border-radius: 6px; font-weight: 700; font-size: 15px; letter-spacing: 0.5px; border: none; }
        .cta-button:hover { background-color: #1a2a3a; }
        .security-notice { background-color: #f7f5f2; border-left: 4px solid #a67c34; padding: 16px 20px; border-radius: 4px; margin: 32px 0; }
        .security-notice p { font-size: 13px; line-height: 1.6; color: #595653; margin: 0; }
        .security-notice strong { color: #2e4763; font-weight: 700; }
        .divider { border-top: 1px solid #e5e5e5; margin: 32px 0; }
        .footer { background-color: #f7f5f2; padding: 30px 40px; text-align: center; }
        .footer-text { font-size: 12px; color: #595653; line-height: 1.8; }
        .footer-text a { color: #2e4763; text-decoration: none; font-weight: 600; }
        .footer-text a:hover { text-decoration: underline; }
        .footer-brand { font-size: 13px; font-weight: 700; color: #2e4763; margin-bottom: 12px; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <div class="header">
            <div class="logo">StoneCentury</div>
            <div class="logo-subtitle">Financial Advisors</div>
          </div>

          <div class="content">
            <div class="greeting">Welcome to Your Private Client Portal</div>

            <p class="body-text">
              You've been invited to access the StoneCentury Private Client Portal — your secure gateway to your financial information, documents, and strategic advisories.
            </p>

            <p class="body-text">
              To get started, please activate your account by setting a secure password below:
            </p>

            <div class="cta-container">
              <a href="${escapeHtml(inviteUrl)}" class="cta-button">Activate Your Account</a>
            </div>

            <div class="security-notice">
              <p><strong>Security:</strong> This activation link expires in 7 days. If you didn't request this invitation, please disregard this email and contact our team immediately.</p>
            </div>
          </div>

          <div class="footer">
            <div class="footer-brand">StoneCentury Financial Advisors</div>
            <div class="footer-text">
              <p style="margin-bottom: 12px;">
                <a href="https://stonecentury.com">Visit Our Website</a> •
                <a href="mailto:support@stonecentury.com">Contact Support</a>
              </p>
              <p>© 2026 StoneCentury Financial Advisors. All rights reserved.</p>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmailWithRetry(email, "Welcome to StoneCentury Private Client Portal", html);
}

export async function sendAdminMessageEmailService(
  to: string,
  clientName: string,
  messageBody: string
): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif; margin: 0; padding: 0; background-color: #f1f0ee; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #2e4763 0%, #223549 100%); padding: 30px; }
        .logo { font-size: 14px; font-weight: 600; color: #ffffff; letter-spacing: 1px; }
        .content { padding: 40px 30px; }
        .greeting { font-size: 18px; font-weight: 600; color: #171717; margin-bottom: 20px; }
        .message-body { font-size: 15px; line-height: 1.6; color: #333333; margin: 20px 0; padding: 20px; background-color: #f7f5f2; border-left: 4px solid #a67c34; }
        .cta-link { display: inline-block; color: #2e4763; text-decoration: none; font-weight: 600; margin-top: 20px; }
        .cta-link:hover { text-decoration: underline; }
        .footer { border-top: 1px solid #dcdfe2; margin-top: 30px; padding-top: 20px; font-size: 12px; color: #595653; text-align: center; }
        .footer a { color: #2e4763; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">StoneCentury Financial</div>
        </div>

        <div class="content">
          <div class="greeting">Hello ${escapeHtml(clientName)},</div>

          <p>You have a new message from your StoneCentury advisor:</p>

          <div class="message-body">
            ${escapeHtml(messageBody).replace(/\n/g, "<br>")}
          </div>

          <a href="${process.env.WEB_ORIGIN}/dashboard" class="cta-link">→ View in Your Portal</a>

          <div class="footer">
            <p style="margin: 0;">© StoneCentury Financial Advisors</p>
            <p style="margin: 8px 0 0 0;">
              <a href="${process.env.WEB_ORIGIN}/dashboard">Access Your Portal</a>
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmailWithRetry(to, "New Message from Your StoneCentury Advisor", html);
}

export async function sendNotificationEmailService(
  to: string,
  clientName: string,
  notificationType: string,
  notificationData: Record<string, any>
): Promise<void> {
  let subject = "StoneCentury Update";
  let title = "StoneCentury Update";
  let message = "You have a new notification.";
  let icon = "📬";

  switch (notificationType) {
    case "action_item":
      subject = "New Action Item Assigned";
      title = "New Action Item";
      message = `<strong>${escapeHtml(notificationData.text)}</strong>`;
      icon = "✓";
      break;

    case "message":
      subject = "New Message from Your Advisor";
      title = "New Message";
      message = escapeHtml(notificationData.body);
      icon = "💬";
      break;

    case "document":
      subject = "Document Available";
      title = "New Document";
      message = `A new document has been uploaded: <strong>${escapeHtml(notificationData.category)}</strong>`;
      icon = "📄";
      break;

    default:
      subject = "StoneCentury Notification";
      title = "New Notification";
      message = "You have a new notification.";
      icon = "📬";
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif; margin: 0; padding: 0; background-color: #f1f0ee; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #2e4763 0%, #223549 100%); padding: 30px; }
        .logo { font-size: 14px; font-weight: 600; color: #ffffff; letter-spacing: 1px; }
        .content { padding: 40px 30px; }
        .icon { font-size: 48px; margin-bottom: 15px; }
        .title { font-size: 18px; font-weight: 600; color: #171717; margin-bottom: 15px; }
        .message { font-size: 15px; line-height: 1.6; color: #333333; margin: 20px 0; }
        .cta-button { display: inline-block; background-color: #2e4763; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; margin-top: 20px; }
        .cta-button:hover { background-color: #223549; }
        .footer { border-top: 1px solid #dcdfe2; margin-top: 30px; padding-top: 20px; font-size: 12px; color: #595653; text-align: center; }
        .footer a { color: #2e4763; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">StoneCentury Financial</div>
        </div>

        <div class="content">
          <div class="icon">${icon}</div>
          <div class="title">${title}</div>
          <p>Hello ${escapeHtml(clientName)},</p>

          <div class="message">
            ${message}
          </div>

          <a href="${process.env.WEB_ORIGIN}/dashboard" class="cta-button">View in Your Portal</a>

          <div class="footer">
            <p style="margin: 0;">© StoneCentury Financial Advisors</p>
            <p style="margin: 8px 0 0 0;">
              <a href="${process.env.WEB_ORIGIN}/dashboard">Access Your Portal</a>
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmailWithRetry(to, subject, html);
}
