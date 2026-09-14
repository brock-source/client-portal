import { Resend } from "resend";
import logger from "../utils/logger";

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

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

      logger.info(`Email sent successfully to ${to}`, undefined, { subject, messageId: response.id });
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
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif; margin: 0; padding: 0; background-color: #f1f0ee; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #2e4763 0%, #223549 100%); padding: 40px 30px; text-align: center; }
        .logo { font-size: 24px; font-weight: 600; color: #ffffff; margin-bottom: 10px; }
        .logo-subtitle { font-size: 12px; color: #b3c1d2; letter-spacing: 1px; }
        .content { padding: 40px 30px; }
        .greeting { font-size: 18px; font-weight: 600; color: #171717; margin-bottom: 20px; }
        .body-text { font-size: 15px; line-height: 1.6; color: #333333; margin-bottom: 30px; }
        .cta-button { display: inline-block; background-color: #2e4763; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; }
        .cta-button:hover { background-color: #223549; }
        .footer-divider { border-top: 1px solid #dcdfe2; margin: 30px 0; }
        .footer-text { font-size: 12px; color: #595653; text-align: center; }
        .footer-text a { color: #2e4763; text-decoration: none; }
        .expiry-notice { font-size: 13px; color: #878c92; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">StoneCentury</div>
          <div class="logo-subtitle">FINANCIAL ADVISORS</div>
        </div>

        <div class="content">
          <div class="greeting">Welcome to Your Private Client Portal</div>

          <p class="body-text">
            You've been invited to access the StoneCentury Private Client Portal—your secure gateway to your financial information, documents, and advisories.
          </p>

          <p class="body-text">
            Click the button below to set your password and activate your account:
          </p>

          <div style="text-align: center; margin: 40px 0;">
            <a href="${escapeHtml(inviteUrl)}" class="cta-button">Activate Your Account</a>
          </div>

          <p class="expiry-notice">
            <strong>Security Note:</strong> This activation link expires in 7 days. If you didn't request this invitation, please contact us immediately.
          </p>

          <div class="footer-divider"></div>

          <div class="footer-text">
            <p style="margin: 0;">StoneCentury Financial Advisors</p>
            <p style="margin: 8px 0 0 0;">
              <a href="https://stonecentury.com">Visit Our Website</a>
            </p>
            <p style="margin: 12px 0 0 0; color: #878c92;">
              Questions? Contact our support team for assistance.
            </p>
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
