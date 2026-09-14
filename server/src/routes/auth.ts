import { Router } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../db/prisma";
import { AppError } from "../utils/appError";
import { validateBody } from "../validation/validator";
import { setPasswordSchema, loginSchema, verifyOtpSchema } from "../validation/schemas";
import { sendOTP, generateOTP, validatePhoneNumber } from "../services/smsService";
import { hashCode, verifyCode } from "../utils/cryptoUtils";
import logger from "../utils/logger";

export const authRouter = Router();

authRouter.post("/set-password", validateBody(setPasswordSchema), async (req, res) => {
  const { token, password, phoneNumber } = req.body;

  const invite = await prisma.inviteToken.findUnique({ where: { token } });
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    throw new AppError(400, "INVALID_INVITE", "This invite link is invalid or has expired.");
  }

  // Validate phone number if provided
  if (phoneNumber && !validatePhoneNumber(phoneNumber)) {
    throw new AppError(400, "INVALID_PHONE", "Phone number must be in valid format (e.g., +11234567890)");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: invite.userId },
      data: {
        passwordHash,
        phoneNumber: phoneNumber || null,
        twoFactorEnabled: !!phoneNumber, // Enable 2FA only if phone provided
      },
    }),
    prisma.inviteToken.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } }),
  ]);

  // Send welcome message
  if (phoneNumber) {
    await sendOTP(phoneNumber, "WELCOME");
    logger.info(`Account setup complete for ${invite.userId} with 2FA enabled`);
  }

  res.ok({ ok: true, twoFactorEnabled: !!phoneNumber });
});

authRouter.post("/login", validateBody(loginSchema), async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
  }

  // Check if user has 2FA enabled
  if (!user.twoFactorEnabled || !user.phoneNumber) {
    // Legacy flow: No 2FA, create session immediately
    req.session.userId = user.id;
    req.session.role = user.role;
    return res.ok({
      id: user.id,
      email: user.email,
      role: user.role,
      twoFactorRequired: false,
    });
  }

  // 2FA flow: Generate and send OTP
  const code = generateOTP();
  const hashedCode = await hashCode(code);

  // Store OTP in database (expires 15 min from now)
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await prisma.verificationCode.create({
    data: {
      userId: user.id,
      code: hashedCode,
      expiresAt,
    },
  });

  // Send OTP via SMS
  const smsSent = await sendOTP(user.phoneNumber, code);

  if (!smsSent) {
    throw new AppError(500, "SMS_FAILED", "Failed to send verification code. Please try again.");
  }

  logger.info(`OTP sent to user ${user.id}`);

  res.ok({
    userId: user.id,
    email: user.email,
    twoFactorRequired: true,
    message: `Verification code sent to ${user.phoneNumber}`,
  });
});

authRouter.post("/logout", (req, res) => {
  req.session.destroy(() => res.ok({ ok: true }));
});

authRouter.post("/verify-otp", validateBody(verifyOtpSchema), async (req, res) => {
  const { userId, code } = req.body;

  // Validate user exists
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError(401, "INVALID_USER", "User not found");
  }

  // Get the latest unused verification code
  const verification = await prisma.verificationCode.findFirst({
    where: {
      userId,
      used: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!verification) {
    throw new AppError(400, "OTP_EXPIRED", "Verification code has expired. Please try logging in again.");
  }

  // Check attempt count
  if (verification.attempts >= 3) {
    throw new AppError(429, "TOO_MANY_ATTEMPTS", "Too many failed attempts. Please try logging in again in 15 minutes.");
  }

  // Verify the code
  const isValid = await verifyCode(code, verification.code);

  if (!isValid) {
    // Increment attempts
    const remaining = 3 - (verification.attempts + 1);
    await prisma.verificationCode.update({
      where: { id: verification.id },
      data: { attempts: verification.attempts + 1 },
    });

    throw new AppError(400, "INVALID_OTP", `Invalid verification code. ${remaining} attempts remaining.`);
  }

  // Mark code as used
  await prisma.verificationCode.update({
    where: { id: verification.id },
    data: { used: true },
  });

  // Create session
  req.session.userId = user.id;
  req.session.role = user.role;

  logger.info(`User ${user.id} successfully authenticated with 2FA`);

  res.ok({
    id: user.id,
    email: user.email,
    role: user.role,
    authenticated: true,
  });
});

authRouter.get("/me", async (req, res) => {
  if (!req.session.userId) {
    throw new AppError(401, "NOT_AUTHENTICATED", "Not authenticated");
  }
  const user = await prisma.user.findUnique({
    where: { id: req.session.userId },
    include: { client: true },
  });
  if (!user) throw new AppError(401, "NOT_AUTHENTICATED", "Not authenticated");
  res.ok({
    id: user.id,
    email: user.email,
    role: user.role,
    client: user.client,
  });
});
