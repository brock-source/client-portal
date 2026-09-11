import { z } from "zod";

export const idSchema = z.string().cuid("Invalid ID format");
export const emailSchema = z.string().email("Invalid email address");
export const passwordSchema = z.string().min(8, "Password must be at least 8 characters");
export const tokenSchema = z.string().min(1, "Token is required");
export const healthRatingSchema = z.enum([
  "Preferred Plus",
  "Preferred",
  "Select",
  "Standard",
  "Preferred Tobacco",
  "Standard Tobacco",
]);

export const paginationSchema = z.object({
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce.number().int().min(1).max(100).default(10),
});
