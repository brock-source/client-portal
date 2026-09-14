import { Resend } from "resend";
import logger from "../utils/logger";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordSetupEmail(email: string, inviteToken: string, clientName: string): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    logger.warn("RESEND_API_KEY not configured, skipping email send");
    return true;
  }

  try {
    const setPasswordUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/set-password?token=${inviteToken}`;

    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "noreply@stonecentury.com",
      to: email,
      subject: "Welcome to StoneCentury Private Client Portal",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 600;">Welcome to StoneCentury</h1>
          </div>

          <div style="background: #fff; border: 1px solid #e5e5e5; border-top: none; padding: 40px; border-radius: 0 0 8px 8px;">
            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;">
              Hi ${escapeHtml(clientName)},
            </p>

            <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #666;">
              You've been invited to the StoneCentury Private Client Portal. Click the button below to set up your password and access your portfolio.
            </p>

            <div style="text-align: center; margin: 40px 0;">
              <a href="${escapeHtml(setPasswordUrl)}" style="display: inline-block; background: #1a1a1a; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                Set Up Your Password
              </a>
            </div>

            <p style="margin: 0 0 20px 0; font-size: 14px; color: #999;">
              This link expires in 7 days. If you didn't request this, please ignore this email.
            </p>

            <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">

            <p style="margin: 0; font-size: 12px; color: #999; text-align: center;">
              StoneCentury Financial Advisors<br>
              <a href="https://stonecentury.com" style="color: #999; text-decoration: none;">stonecentury.com</a>
            </p>
          </div>
        </div>
      `,
    });

    if (result.error) {
      logger.error(`Failed to send password setup email to ${email}:`, result.error);
      return false;
    }

    logger.info(`Password setup email sent to ${email}`);
    return true;
  } catch (error) {
    logger.error(`Error sending password setup email to ${email}:`, error);
    return false;
  }
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
