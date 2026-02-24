"use server";

import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/auth/check-permission";
import bcrypt from "bcryptjs";
import { z } from "zod";

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
  role: z.enum(["admin", "orgAdmin", "editor", "viewer"]).default("editor"),
  organizationId: z.string().uuid().optional(),
});

const updateUserSchema = z.object({
  name: z.string().optional(),
  role: z.enum(["admin", "orgAdmin", "editor", "viewer"]).optional(),
  organizationId: z.string().uuid().nullable().optional(),
});

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

export async function createUser(input: z.infer<typeof createUserSchema>) {
  await requirePermission("user:manage");
  const data = createUserSchema.parse(input);
  const hashedPassword = await bcrypt.hash(data.password, 12);

  return prisma.user.create({
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
}

export async function updateUserRole(id: string, input: z.infer<typeof updateUserSchema>) {
  await requirePermission("user:manage");
  const data = updateUserSchema.parse(input);
  const updateData: Record<string, unknown> = {};

  if (data.name !== undefined) updateData.name = data.name || null;
  if (data.role !== undefined) updateData.role = data.role;
  if (data.organizationId !== undefined) updateData.organizationId = data.organizationId;

  return prisma.user.update({
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
}

export async function deleteUser(id: string) {
  await requirePermission("user:manage");

  // Prevent deleting yourself
  const session = await requirePermission("user:manage");
  if ((session.user as any).id === id) {
    throw new Error("Cannot delete your own account");
  }

  await prisma.user.delete({ where: { id } });
}
