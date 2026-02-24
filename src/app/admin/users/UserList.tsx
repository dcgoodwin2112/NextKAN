"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  organizationId: string | null;
  organization?: { name: string } | null;
  createdAt: Date;
}

interface Org {
  id: string;
  name: string;
}

interface UserListProps {
  users: User[];
  organizations: Org[];
}

export function UserList({ users, organizations }: UserListProps) {
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("editor");
  const [orgId, setOrgId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name: name || undefined,
          role,
          organizationId: orgId || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create user");
      }

      setShowCreateForm(false);
      setEmail("");
      setPassword("");
      setName("");
      setRole("editor");
      setOrgId("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) throw new Error("Failed to update role");
      router.refresh();
    } catch {
      alert("Failed to update user role");
    }
  }

  async function handleDelete(userId: string) {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete user");
      }
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete user");
    }
  }

  return (
    <div>
      <div className="mb-4">
        {showCreateForm ? (
          <form onSubmit={handleCreate} className="space-y-3 max-w-md border rounded p-4">
            {error && (
              <div className="text-sm text-danger-text bg-danger-subtle p-2 rounded">{error}</div>
            )}
            <div>
              <label htmlFor="new-email" className="block text-sm font-medium mb-1">Email *</label>
              <input
                id="new-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded border px-3 py-2"
                required
              />
            </div>
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium mb-1">Password *</label>
              <input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded border px-3 py-2"
                minLength={8}
                required
              />
            </div>
            <div>
              <label htmlFor="new-name" className="block text-sm font-medium mb-1">Name</label>
              <input
                id="new-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded border px-3 py-2"
              />
            </div>
            <div>
              <label htmlFor="new-role" className="block text-sm font-medium mb-1">Role</label>
              <select
                id="new-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded border px-3 py-2"
              >
                <option value="admin">Admin</option>
                <option value="orgAdmin">Org Admin</option>
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <div>
              <label htmlFor="new-org" className="block text-sm font-medium mb-1">Organization</label>
              <select
                id="new-org"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                className="w-full rounded border px-3 py-2"
              >
                <option value="">None</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={loading} className="rounded bg-primary px-4 py-2 text-white text-sm hover:bg-primary-hover disabled:opacity-50">
                {loading ? "Creating..." : "Create User"}
              </button>
              <button type="button" onClick={() => setShowCreateForm(false)} className="rounded border px-4 py-2 text-sm hover:bg-surface">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowCreateForm(true)}
            className="rounded bg-primary px-4 py-2 text-white text-sm hover:bg-primary-hover"
          >
            Create User
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border">
          <thead>
            <tr className="bg-surface">
              <th className="border px-3 py-2 text-left">Email</th>
              <th className="border px-3 py-2 text-left">Name</th>
              <th className="border px-3 py-2 text-left">Role</th>
              <th className="border px-3 py-2 text-left">Organization</th>
              <th className="border px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td className="border px-3 py-2">{user.email}</td>
                <td className="border px-3 py-2">{user.name || "-"}</td>
                <td className="border px-3 py-2">
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    className="rounded border px-2 py-1 text-xs"
                  >
                    <option value="admin">Admin</option>
                    <option value="orgAdmin">Org Admin</option>
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </td>
                <td className="border px-3 py-2">{user.organization?.name || "-"}</td>
                <td className="border px-3 py-2">
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="text-danger hover:opacity-80 text-xs"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
