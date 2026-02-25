"use server";

import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/check-permission";
import { logActivity } from "@/lib/services/activity";
import bcrypt from "bcryptjs";
import {
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
  type CreateUserInput,
  type UpdateUserInput,
  type ResetPasswordInput,
} from "@/lib/schemas/user";

export async function listUsers() {
  await requirePermission("user:manage");
  return prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      organizationId: true,
      organization: { select: { name: true } },
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getUser(id: string) {
  await requirePermission("user:manage");
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      organizationId: true,
      organization: { select: { id: true, name: true } },
      createdAt: true,
    },
  });
}

export async function createUser(input: CreateUserInput) {
  await requirePermission("user:manage");
  const data = createUserSchema.parse(input);
  const hashedPassword = await bcrypt.hash(data.password, 12);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      name: data.name || null,
      role: data.role,
      organizationId: data.organizationId || null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      organizationId: true,
    },
  });

  const session = await requirePermission("user:manage");
  logActivity({
    action: "create",
    entityType: "user",
    entityId: user.id,
    entityName: user.email,
    userId: (session.user as any)?.id,
    userName: session.user?.name,
  }).catch(() => {});

  return user;
}

export async function updateUser(id: string, input: UpdateUserInput) {
  const session = await requirePermission("user:manage");
  const data = updateUserSchema.parse(input);
  const sessionUserId = (session.user as any)?.id as string;

  // Prevent changing own role
  if (data.role !== undefined && sessionUserId === id) {
    throw new Error("Cannot change your own role");
  }

  // Prevent demoting the last admin
  if (data.role !== undefined && data.role !== "admin") {
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { role: true },
    });
    if (targetUser?.role === "admin") {
      const adminCount = await prisma.user.count({
        where: { role: "admin" },
      });
      if (adminCount <= 1) {
        throw new Error("Cannot demote the last admin user");
      }
    }
  }

  // Email uniqueness check
  if (data.email !== undefined) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing && existing.id !== id) {
      throw new Error("A user with this email already exists");
    }
  }

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name || null;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.role !== undefined) updateData.role = data.role;
  if (data.organizationId !== undefined) updateData.organizationId = data.organizationId;

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      organizationId: true,
    },
  });

  logActivity({
    action: "update",
    entityType: "user",
    entityId: user.id,
    entityName: user.email,
    userId: sessionUserId,
    userName: session.user?.name,
  }).catch(() => {});

  return user;
}

export async function resetPassword(id: string, input: ResetPasswordInput) {
  await requirePermission("user:manage");
  const data = resetPasswordSchema.parse(input);
  const hashedPassword = await bcrypt.hash(data.password, 12);

  await prisma.user.update({
    where: { id },
    data: { password: hashedPassword },
  });

  const session = await requirePermission("user:manage");
  logActivity({
    action: "update",
    entityType: "user",
    entityId: id,
    entityName: "password reset",
    userId: (session.user as any)?.id,
    userName: session.user?.name,
    details: { field: "password" },
  }).catch(() => {});
}

export async function deleteUser(id: string) {
  const session = await requirePermission("user:manage");
  const sessionUserId = (session.user as any)?.id as string;

  // Prevent deleting yourself
  if (sessionUserId === id) {
    throw new Error("Cannot delete your own account");
  }

  // Prevent deleting the last admin
  const targetUser = await prisma.user.findUnique({
    where: { id },
    select: { role: true, email: true },
  });

  if (targetUser?.role === "admin") {
    const adminCount = await prisma.user.count({
      where: { role: "admin" },
    });
    if (adminCount <= 1) {
      throw new Error("Cannot delete the last admin user");
    }
  }

  await prisma.user.delete({ where: { id } });

  logActivity({
    action: "delete",
    entityType: "user",
    entityId: id,
    entityName: targetUser?.email || id,
    userId: sessionUserId,
    userName: session.user?.name,
  }).catch(() => {});
}

/** @deprecated Use updateUser() instead */
export const updateUserRole = updateUser;
