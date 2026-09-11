import { Router } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../db/prisma";
import { AppError } from "../utils/appError";
import { validateBody } from "../validation/validator";
import { setPasswordSchema, loginSchema } from "../validation/schemas";

export const authRouter = Router();

authRouter.post("/set-password", validateBody(setPasswordSchema), async (req, res) => {
  const { token, password } = req.body;

  const invite = await prisma.inviteToken.findUnique({ where: { token } });
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    throw new AppError(400, "INVALID_INVITE", "This invite link is invalid or has expired.");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.$transaction([
    prisma.user.update({ where: { id: invite.userId }, data: { passwordHash } }),
    prisma.inviteToken.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } }),
  ]);

  res.ok({ ok: true });
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

  req.session.userId = user.id;
  req.session.role = user.role;
  res.ok({ id: user.id, email: user.email, role: user.role });
});

authRouter.post("/logout", (req, res) => {
  req.session.destroy(() => res.ok({ ok: true }));
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
