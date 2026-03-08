import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission, type Permission } from "./roles";
import { tokenAuthContext } from "./token-context";

export class PermissionError extends Error {
  constructor(permission: Permission) {
    super(`Insufficient permissions: ${permission} required`);
    this.name = "PermissionError";
  }
}

export async function requirePermission(permission: Permission) {
  // Check token auth context first
  const tokenUser = tokenAuthContext.getStore();
  if (tokenUser) {
    if (!hasPermission(tokenUser.role, permission)) {
      throw new PermissionError(permission);
    }
    return { user: tokenUser } as any;
  }

  const session = await auth();
  if (!session?.user) {
    throw new PermissionError(permission);
  }

  const role = (session.user as any).role as string;
  if (!hasPermission(role, permission)) {
    throw new PermissionError(permission);
  }

  return session;
}

export async function requireDatasetPermission(
  permission: Permission,
  datasetId: string
) {
  const session = await requirePermission(permission);
  const role = (session.user as any).role as string;
  const userId = (session.user as any).id as string;
  const userOrgId = (session.user as any).organizationId as string | undefined;

  if (role === "admin") return session;

  const dataset = await prisma.dataset.findUnique({
    where: { id: datasetId },
    select: { createdById: true, publisherId: true },
  });

  if (!dataset) return session;

  if (role === "orgAdmin") {
    if (userOrgId && userOrgId === dataset.publisherId) return session;
    throw new PermissionError(permission);
  }

  // Editors can only edit datasets they created
  if (dataset.createdById === userId) return session;
  throw new PermissionError(permission);
}

export async function requireOrgPermission(permission: Permission, orgId: string) {
  // Check token auth context first
  const tokenUser = tokenAuthContext.getStore();
  if (tokenUser) {
    if (!hasPermission(tokenUser.role, permission)) {
      throw new PermissionError(permission);
    }
    if (tokenUser.role === "admin") return { user: tokenUser } as any;
    if (tokenUser.role === "orgAdmin" && tokenUser.organizationId !== orgId) {
      throw new PermissionError(permission);
    }
    return { user: tokenUser } as any;
  }

  const session = await requirePermission(permission);
  const role = (session.user as any).role as string;
  const userOrgId = (session.user as any).organizationId as string | undefined;

  // Admin can access everything
  if (role === "admin") return session;

  // orgAdmin can only manage their own org's resources
  if (role === "orgAdmin" && userOrgId !== orgId) {
    throw new PermissionError(permission);
  }

  return session;
}
