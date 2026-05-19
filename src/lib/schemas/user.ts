import { z } from "zod";

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
  role: z.enum(["admin", "orgAdmin", "editor", "viewer"]).default("editor"),
  organizationId: z.string().uuid().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  role: z.enum(["admin", "orgAdmin", "editor", "viewer"]).optional(),
  organizationId: z.string().uuid().nullable().optional(),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8),
});

export const registerUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(200).trim(),
});

export type RegisterUserInput = z.input<typeof registerUserSchema>;
export type CreateUserInput = z.input<typeof createUserSchema>;
export type UpdateUserInput = z.input<typeof updateUserSchema>;
export type ResetPasswordInput = z.input<typeof resetPasswordSchema>;
