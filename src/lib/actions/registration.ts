"use server";

import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import {
  registerUserSchema,
  type RegisterUserInput,
} from "@/lib/schemas/user";
import {
  getUserRegistrationMode,
  getUserDefaultRole,
  getSetting,
} from "@/lib/services/settings";
import {
  createEmailVerification,
  verifyEmail,
  resendVerification,
} from "@/lib/services/email-verification";
import { getEmailService } from "@/lib/services/email";
import { registrationVerifyEmail } from "@/lib/email-templates/registration-verify";
import { registrationPendingEmail } from "@/lib/email-templates/registration-pending";
import { logActivity } from "@/lib/services/activity";
import { silentCatch } from "@/lib/utils/log";

export async function registerUser(
  input: RegisterUserInput
): Promise<{ success: true }> {
  const mode = getUserRegistrationMode();
  if (mode === "disabled") {
    throw new Error("Registration is disabled");
  }

  const data = registerUserSchema.parse(input);

  // Check email uniqueness
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });
  if (existing) {
    throw new Error("A user with this email already exists");
  }

  const hashedPassword = await bcrypt.hash(data.password, 12);
  const defaultRole = getUserDefaultRole();

  const user = await prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      name: data.name,
      role: defaultRole,
      status: "pending",
      emailVerified: false,
    },
    select: { id: true, email: true, name: true },
  });

  // Create verification token and send email
  const token = await createEmailVerification(user.id);
  const siteUrl = getSetting("SITE_URL", "http://localhost:3000");
  const verifyUrl = `${siteUrl}/verify-email?token=${token}`;
  const emailContent = registrationVerifyEmail({ verifyUrl });
  silentCatch(getEmailService()
    .send({ to: user.email, ...emailContent }), "email");

  // If approval mode, notify admin users
  if (mode === "approval") {
    const admins = await prisma.user.findMany({
      where: { role: "admin", status: "active" },
      select: { email: true },
    });
    if (admins.length > 0) {
      const adminUrl = `${siteUrl}/admin/users?status=pending`;
      const pendingEmail = registrationPendingEmail({
        userName: user.name || user.email,
        userEmail: user.email,
        adminUrl,
      });
      silentCatch(getEmailService()
        .send({
          to: admins.map((a) => a.email),
          ...pendingEmail,
        }), "email");
    }
  }

  silentCatch(logActivity({
    action: "register",
    entityType: "user",
    entityId: user.id,
    entityName: user.email,
  }), "activity");

  return { success: true };
}

export async function verifyEmailAction(
  token: string
): Promise<{ success: boolean; mode: string }> {
  const result = await verifyEmail(token);

  if (result.success && result.userId) {
    silentCatch(logActivity({
      action: "verify_email",
      entityType: "user",
      entityId: result.userId,
      entityName: "",
    }), "activity");
  }

  return { success: result.success, mode: result.mode };
}

export async function resendVerificationAction(
  email: string
): Promise<{ success: true }> {
  const result = await resendVerification(email);

  if (result) {
    const siteUrl = getSetting("SITE_URL", "http://localhost:3000");
    const verifyUrl = `${siteUrl}/verify-email?token=${result.token}`;
    const emailContent = registrationVerifyEmail({ verifyUrl });
    silentCatch(getEmailService()
      .send({ to: email, ...emailContent }), "email");
  }

  // Always return success to prevent email enumeration
  return { success: true };
}
