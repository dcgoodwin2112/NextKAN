import crypto from "crypto";
import { prisma } from "@/lib/db";
import { getUserRegistrationMode } from "@/lib/services/settings";

export function generateVerificationToken(): { plaintext: string; hash: string } {
  const plaintext = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(plaintext).digest("hex");
  return { plaintext, hash };
}

export function hashVerificationToken(plaintext: string): string {
  return crypto.createHash("sha256").update(plaintext).digest("hex");
}

export async function createEmailVerification(
  userId: string
): Promise<string> {
  const { plaintext, hash } = generateVerificationToken();

  // Delete existing verifications for this user
  await prisma.emailVerification.deleteMany({ where: { userId } });

  // Store with 24h expiry
  await prisma.emailVerification.create({
    data: {
      userId,
      tokenHash: hash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  return plaintext;
}

export async function verifyEmail(
  token: string
): Promise<{ success: boolean; mode: string; userId?: string }> {
  const hash = hashVerificationToken(token);

  const record = await prisma.emailVerification.findUnique({
    where: { tokenHash: hash },
    include: { user: { select: { id: true, status: true } } },
  });

  if (!record) {
    return { success: false, mode: "invalid" };
  }

  if (record.expiresAt < new Date()) {
    await prisma.emailVerification.delete({ where: { id: record.id } });
    return { success: false, mode: "expired" };
  }

  const mode = getUserRegistrationMode();

  // Update user: set emailVerified = true, and activate if open mode
  const newStatus =
    mode === "open" ? "active" : record.user.status;

  await prisma.user.update({
    where: { id: record.userId },
    data: {
      emailVerified: true,
      status: newStatus,
    },
  });

  // Clean up verification record
  await prisma.emailVerification.delete({ where: { id: record.id } });

  return { success: true, mode, userId: record.userId };
}

export async function resendVerification(
  email: string
): Promise<{ userId: string; token: string } | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, emailVerified: true },
  });

  if (!user || user.emailVerified) return null;

  const token = await createEmailVerification(user.id);
  return { userId: user.id, token };
}
