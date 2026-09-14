import logger from "../utils/logger";

/**
 * SMS Service for 2FA OTP delivery
 *
 * Currently logs OTP to console for development/demo purposes.
 * When ready to use real SMS, install Twilio and uncomment the Twilio logic.
 */

// Uncomment when Twilio is implemented and configured:
// import twilio from 'twilio';
// const twilioClient = twilio(
//   process.env.TWILIO_ACCOUNT_SID,
//   process.env.TWILIO_AUTH_TOKEN
// );

export async function sendOTP(phoneNumber: string, code: string): Promise<boolean> {
  try {
    // DEVELOPMENT MODE: Log to console
    // This allows you to see the code in terminal while testing
    const maskedPhone = maskPhoneNumber(phoneNumber);
    logger.info(`📱 OTP sent to ${maskedPhone}`);
    logger.warn(`🔐 OTP CODE: ${code} (expires in 15 minutes)`);
    console.log(`\n${'='.repeat(50)}`);
    console.log(`📱 TWO-FACTOR AUTHENTICATION CODE`);
    console.log(`${'='.repeat(50)}`);
    console.log(`Phone: ${maskedPhone}`);
    console.log(`Code: ${code}`);
    console.log(`Expires: 15 minutes`);
    console.log(`${'='.repeat(50)}\n`);

    // PRODUCTION MODE: Send via Twilio (uncomment when ready)
    // const message = await twilioClient.messages.create({
    //   body: `Your StoneCentury Financial verification code is: ${code}. Valid for 15 minutes.`,
    //   from: process.env.TWILIO_PHONE_NUMBER!,
    //   to: phoneNumber,
    // });
    // logger.info(`SMS sent to ${phoneNumber}, SID: ${message.sid}`);

    return true;
  } catch (error) {
    logger.error("SMS send failed:", error);
    return false;
  }
}

/**
 * Generate a random 6-digit OTP code
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Mask phone number for display (e.g., +1 (234) ***-5678)
 */
export function maskPhoneNumber(phoneNumber: string): string {
  // Format: +1 (234) ***-5678
  const match = phoneNumber.match(/^(\+1)(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `${match[1]} (${match[2]}) ***-${match[4]}`;
  }
  return phoneNumber;
}

/**
 * Validate phone number format (E.164: +1234567890)
 */
export function validatePhoneNumber(phoneNumber: string): boolean {
  // E.164 format: +1 followed by 10 digits
  return /^\+1\d{10}$/.test(phoneNumber);
}

/**
 * Format user input to E.164 format
 * Accepts: "1234567890", "(123) 456-7890", "123-456-7890", "+11234567890"
 * Returns: "+11234567890" or empty string if invalid
 */
export function formatPhoneNumberToE164(input: string): string {
  // Remove all non-digit characters except leading +
  let digits = input.replace(/\D/g, "");

  // If starts with 1 (country code), keep as is
  // If 10 digits, prepend 1
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  } else if (digits.length === 10) {
    return `+1${digits}`;
  }

  return "";
}
