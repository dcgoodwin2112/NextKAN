export const ROLES = ["admin", "orgAdmin", "editor", "viewer"] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  "dataset:create",
  "dataset:update",
  "dataset:delete",
  "dataset:publish",
  "dataset:view",
  "org:create",
  "org:update",
  "org:delete",
  "org:view",
  "user:manage",
  "admin:access",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  admin: PERMISSIONS,
  orgAdmin: [
    "dataset:create",
    "dataset:update",
    "dataset:delete",
    "dataset:publish",
    "dataset:view",
    "org:update",
    "org:view",
    "admin:access",
  ],
  editor: [
    "dataset:create",
    "dataset:update",
    "dataset:view",
    "admin:access",
  ],
  viewer: [
    "dataset:view",
    "org:view",
  ],
};

export function hasPermission(role: string, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role as Role];
  if (!perms) return false;
  return perms.includes(permission);
}

export function getRolePermissions(role: string): readonly Permission[] {
  return ROLE_PERMISSIONS[role as Role] || [];
}
