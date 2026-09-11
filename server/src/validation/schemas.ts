import { z } from "zod";
import {
  idSchema,
  emailSchema,
  passwordSchema,
  tokenSchema,
  healthRatingSchema,
} from "./common";

// Auth routes
export const setPasswordSchema = z.object({
  token: tokenSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

// Admin routes
export const createClientSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: emailSchema,
  phone: z.string().optional(),
});

export const setHealthRatingSchema = z.object({
  rating: healthRatingSchema,
});

export const addActionItemSchema = z.object({
  text: z.string().min(1, "Action item text is required"),
});

export const sendMessageSchema = z.object({
  body: z.string().min(1, "Message body is required"),
});

export const completePhase4Schema = z.object({});

export const deleteClientSchema = z.object({
  confirmName: z.string().min(1, "Confirmation name is required"),
});

// Client routes
export const uploadDocumentSchema = z.object({
  file: z.any(),
});

export const markDocumentMissingSchema = z.object({});

export const completeChecklistItemSchema = z.object({});

export const uncompleteChecklistItemSchema = z.object({});

export const scheduleMeetingSchema = z.object({
  phase: z.coerce.number().int().min(1).max(4),
});

export const markWelcomeSeenSchema = z.object({});

export const clientSendMessageSchema = z.object({
  body: z.string().min(1, "Message body is required"),
});

export const readNotificationSchema = z.object({});

export const readAllNotificationsSchema = z.object({});

export const updatePreferencesSchema = z.object({
  deliveryMethods: z.array(z.enum(["in_app", "email", "sms"])).optional(),
  actionItemsEnabled: z.boolean().optional(),
  messagesEnabled: z.boolean().optional(),
  documentsEnabled: z.boolean().optional(),
  notificationFrequency: z
    .enum(["real_time", "daily_digest", "weekly_digest"])
    .optional(),
  digestTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:mm format").optional(),
  notificationEmail: emailSchema.optional(),
  notificationPhone: z.string().optional(),
  timezone: z.string().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
});

// Policy routes
export const createPolicySchema = z.object({
  policyNumber: z.string().min(1, "Policy number is required"),
  policyType: z.enum(["LIFE", "DISABILITY", "LONG_TERM_CARE", "UMBRELLA", "HEALTH", "OTHER"]),
  status: z.enum(["ACTIVE", "INACTIVE", "EXPIRED", "LAPSED", "CANCELLED", "PENDING"]).optional(),
  coverageAmount: z.coerce.number().positive("Coverage amount must be positive"),
  premium: z.coerce.number().positive("Premium must be positive").optional(),
  premiumFrequency: z.string().optional(),
  beneficiary: z.string().optional(),
  insurer: z.string().optional(),
  issueDate: z.string().datetime("Invalid date format"),
  expirationDate: z.string().datetime("Invalid date format").optional(),
});

export const updatePolicySchema = createPolicySchema.partial();

// Ask Brock routes
export const askBrockSchema = z.object({
  question: z.string().min(1, "Question is required"),
});
