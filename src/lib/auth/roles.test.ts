import { describe, it, expect } from "vitest";
import { hasPermission, getRolePermissions, PERMISSIONS } from "./roles";

describe("hasPermission", () => {
  it("admin has all permissions", () => {
    for (const perm of PERMISSIONS) {
      expect(hasPermission("admin", perm)).toBe(true);
    }
  });

  it("orgAdmin can manage datasets and update orgs", () => {
    expect(hasPermission("orgAdmin", "dataset:create")).toBe(true);
    expect(hasPermission("orgAdmin", "dataset:delete")).toBe(true);
    expect(hasPermission("orgAdmin", "org:update")).toBe(true);
    expect(hasPermission("orgAdmin", "admin:access")).toBe(true);
  });

  it("orgAdmin cannot manage users or create/delete orgs", () => {
    expect(hasPermission("orgAdmin", "user:manage")).toBe(false);
    expect(hasPermission("orgAdmin", "org:create")).toBe(false);
    expect(hasPermission("orgAdmin", "org:delete")).toBe(false);
  });

  it("editor can create and update datasets", () => {
    expect(hasPermission("editor", "dataset:create")).toBe(true);
    expect(hasPermission("editor", "dataset:update")).toBe(true);
    expect(hasPermission("editor", "dataset:view")).toBe(true);
    expect(hasPermission("editor", "admin:access")).toBe(true);
  });

  it("editor cannot delete or publish datasets", () => {
    expect(hasPermission("editor", "dataset:delete")).toBe(false);
    expect(hasPermission("editor", "dataset:publish")).toBe(false);
  });

  it("editor cannot manage orgs", () => {
    expect(hasPermission("editor", "org:create")).toBe(false);
    expect(hasPermission("editor", "org:update")).toBe(false);
    expect(hasPermission("editor", "org:delete")).toBe(false);
  });

  it("viewer can only view datasets and orgs", () => {
    expect(hasPermission("viewer", "dataset:view")).toBe(true);
    expect(hasPermission("viewer", "org:view")).toBe(true);
    expect(hasPermission("viewer", "dataset:create")).toBe(false);
    expect(hasPermission("viewer", "admin:access")).toBe(false);
  });

  it("unknown role has no permissions", () => {
    expect(hasPermission("unknown", "dataset:view")).toBe(false);
  });
});

describe("getRolePermissions", () => {
  it("returns permissions array for valid role", () => {
    const perms = getRolePermissions("editor");
    expect(perms).toContain("dataset:create");
    expect(perms).not.toContain("dataset:delete");
  });

  it("returns empty array for unknown role", () => {
    expect(getRolePermissions("nonexistent")).toEqual([]);
  });
});
