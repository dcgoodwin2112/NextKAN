"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
      toast.success("User created successfully");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(userId: string) {
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete user");
      }
      toast.success("User deleted successfully");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete user");
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
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create User"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button onClick={() => setShowCreateForm(true)}>
            Create User
          </Button>
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
                <td className="border px-3 py-2">{user.role}</td>
                <td className="border px-3 py-2">{user.organization?.name || "-"}</td>
                <td className="border px-3 py-2">
                  <div className="flex gap-2">
                    <Button variant="ghost" size="xs" asChild>
                      <Link href={`/admin/users/${user.id}/edit`}>Edit</Link>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="xs" className="text-destructive hover:text-destructive">
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete User</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {user.email}? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            variant="destructive"
                            onClick={() => handleDelete(user.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
