"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addMember, removeMember } from "@/lib/actions/organizations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/native-select";
import { EmptyState } from "@/components/admin/EmptyState";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface Member {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

interface Props {
  orgId: string;
  members: Member[];
  availableUsers: Member[];
}

export function MembersClient({ orgId, members, availableUsers }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedUserId, setSelectedUserId] = useState("");

  function handleAdd() {
    if (!selectedUserId) return;
    startTransition(async () => {
      try {
        await addMember(orgId, selectedUserId);
        setSelectedUserId("");
        toast.success("Member added");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to add member");
      }
    });
  }

  function handleRemove(userId: string) {
    startTransition(async () => {
      try {
        await removeMember(orgId, userId);
        toast.success("Member removed");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to remove member");
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* Current Members */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-lg font-semibold">Current Members</h2>
          <Badge variant="secondary">{members.length}</Badge>
        </div>
        {members.length === 0 ? (
          <EmptyState
            title="No members"
            description="No users are assigned to this organization."
          />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      {member.name || "—"}
                    </TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{member.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={isPending}
                          >
                            Remove
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove member</AlertDialogTitle>
                            <AlertDialogDescription>
                              Remove {member.name || member.email} from this
                              organization? They will no longer be associated
                              with this org.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemove(member.id)}
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Add Member */}
      <Card>
        <CardHeader>
          <CardTitle>Add Member</CardTitle>
        </CardHeader>
        <CardContent>
          {availableUsers.length === 0 ? (
            <p className="text-sm text-text-muted">
              No unassigned users available.
            </p>
          ) : (
            <div className="flex items-end gap-3">
              <div className="flex-1 max-w-sm">
                <label
                  htmlFor="user-select"
                  className="block text-sm font-medium mb-1"
                >
                  Select user
                </label>
                <NativeSelect
                  id="user-select"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                >
                  <option value="">Choose a user...</option>
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name || user.email} ({user.email})
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <Button
                onClick={handleAdd}
                disabled={!selectedUserId || isPending}
              >
                Add Member
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
