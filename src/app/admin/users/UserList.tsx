"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useSelection } from "@/hooks/useSelection";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ConfirmDeleteButton } from "@/components/admin/ConfirmDeleteButton";
import { BulkActionBar, type BulkAction } from "@/components/admin/BulkActionBar";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { bulkUpdateUsers, bulkDeleteUsers, approveUser, rejectUser, bulkApproveUsers } from "@/lib/actions/users";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
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
  const allIds = users.map((u) => u.id);
  const selection = useSelection(allIds);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("editor");
  const [orgId, setOrgId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");

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

  async function handleBulkDelete() {
    const result = await bulkDeleteUsers(selection.ids);
    if (result.errors.length > 0) {
      toast.error(`${result.success} deleted. Errors: ${result.errors.join("; ")}`);
    } else {
      toast.success(`${result.success} user${result.success !== 1 ? "s" : ""} deleted`);
    }
    selection.clear();
    router.refresh();
  }

  async function handleBulkRoleChange() {
    if (!selectedRole) return;
    const result = await bulkUpdateUsers(selection.ids, { role: selectedRole });
    if (result.errors.length > 0) {
      toast.error(`${result.success} updated. Errors: ${result.errors.join("; ")}`);
    } else {
      toast.success(`${result.success} user${result.success !== 1 ? "s" : ""} updated`);
    }
    setRoleDialogOpen(false);
    setSelectedRole("");
    selection.clear();
    router.refresh();
  }

  async function handleApprove(userId: string) {
    try {
      await approveUser(userId);
      toast.success("User approved");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve user");
    }
  }

  async function handleReject(userId: string) {
    try {
      await rejectUser(userId);
      toast.success("User rejected and deleted");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reject user");
    }
  }

  async function handleBulkApprove() {
    const result = await bulkApproveUsers(selection.ids);
    if (result.errors.length > 0) {
      toast.error(`${result.success} approved. Errors: ${result.errors.join("; ")}`);
    } else {
      toast.success(`${result.success} user${result.success !== 1 ? "s" : ""} approved`);
    }
    selection.clear();
    router.refresh();
  }

  const hasPendingSelected = users.some(
    (u) => selection.isSelected(u.id) && u.status === "pending"
  );

  const bulkActions: BulkAction[] = [
    ...(hasPendingSelected
      ? [{ label: "Approve", onClick: handleBulkApprove } as BulkAction]
      : []),
    { label: "Change Role", onClick: () => setRoleDialogOpen(true) },
    {
      label: "Delete",
      icon: Trash2,
      onClick: handleBulkDelete,
      variant: "destructive",
      requiresConfirmation: true,
      confirmTitle: "Delete users?",
      confirmDescription: `This will permanently delete ${selection.count} user${selection.count !== 1 ? "s" : ""}. This cannot be undone.`,
    },
  ];

  return (
    <div>
      <div className="mb-4">
        {showCreateForm ? (
          <form onSubmit={handleCreate} className="space-y-3 max-w-md border rounded p-4">
            {error && (
              <div className="text-sm text-danger-text bg-danger-subtle p-2 rounded">{error}</div>
            )}
            <div className="space-y-2">
              <Label htmlFor="new-email">Email *</Label>
              <Input
                id="new-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Password *</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-name">Name</Label>
              <Input
                id="new-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-role">Role</Label>
              <NativeSelect
                id="new-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="admin">Admin</option>
                <option value="orgAdmin">Org Admin</option>
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-org">Organization</Label>
              <NativeSelect
                id="new-org"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
              >
                <option value="">None</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </NativeSelect>
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

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={selection.isIndeterminate ? "indeterminate" : selection.isAllSelected}
                onCheckedChange={() => selection.toggleAll()}
                aria-label="Select all users"
              />
            </TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Organization</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <Checkbox
                  checked={selection.isSelected(user.id)}
                  onCheckedChange={() => selection.toggle(user.id)}
                  aria-label={`Select ${user.email}`}
                />
              </TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.name || "-"}</TableCell>
              <TableCell>{user.role}</TableCell>
              <TableCell>
                <StatusBadge status={user.status} />
              </TableCell>
              <TableCell>{user.organization?.name || "-"}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  {user.status === "pending" && (
                    <>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleApprove(user.id)}
                      >
                        Approve
                      </Button>
                      <ConfirmDeleteButton
                        entityName={user.email}
                        onConfirm={() => handleReject(user.id)}
                        size="xs"
                        triggerVariant="ghost"
                        triggerLabel="Reject"
                      />
                    </>
                  )}
                  <Button variant="ghost" size="xs" asChild>
                    <Link href={`/admin/users/${user.id}/edit`}>Edit</Link>
                  </Button>
                  <Button variant="ghost" size="xs" asChild>
                    <Link href={`/admin/activity?userId=${user.id}`}>Activity</Link>
                  </Button>
                  <ConfirmDeleteButton
                    entityName={user.email}
                    onConfirm={() => handleDelete(user.id)}
                    size="xs"
                    triggerVariant="ghost"
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <BulkActionBar
        selectedCount={selection.count}
        onClear={selection.clear}
        actions={bulkActions}
        entityName="user"
      />

      <AlertDialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Role</AlertDialogTitle>
            <AlertDialogDescription>
              Select the role for {selection.count} user{selection.count !== 1 ? "s" : ""}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="bulk-role-select">Role</Label>
            <NativeSelect
              id="bulk-role-select"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              <option value="">Select role...</option>
              <option value="admin">Admin</option>
              <option value="orgAdmin">Org Admin</option>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </NativeSelect>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkRoleChange} disabled={!selectedRole}>
              Update
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
