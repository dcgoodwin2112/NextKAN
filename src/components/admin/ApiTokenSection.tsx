"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Copy, Plus, Trash2, Key } from "lucide-react";

interface Token {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface ApiTokenSectionProps {
  userId: string;
}

export function ApiTokenSection({ userId }: ApiTokenSectionProps) {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTokenName, setNewTokenName] = useState("");
  const [newTokenExpiry, setNewTokenExpiry] = useState("");
  const [plaintext, setPlaintext] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const fetchTokens = useCallback(async () => {
    try {
      const res = await fetch(`/api/users/${userId}/tokens`);
      if (res.ok) {
        setTokens(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  async function handleCreate() {
    setCreating(true);
    try {
      const body: Record<string, string> = { name: newTokenName };
      if (newTokenExpiry) body.expiresAt = newTokenExpiry;

      const res = await fetch(`/api/users/${userId}/tokens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to create token");
        return;
      }

      const data = await res.json();
      setPlaintext(data.plaintext);
      toast.success("Token created");
      fetchTokens();
    } catch {
      toast.error("Failed to create token");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(tokenId: string) {
    try {
      const res = await fetch(`/api/users/${userId}/tokens/${tokenId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Token revoked");
        fetchTokens();
      } else {
        toast.error("Failed to revoke token");
      }
    } catch {
      toast.error("Failed to revoke token");
    }
  }

  function handleCopy() {
    if (plaintext) {
      navigator.clipboard.writeText(plaintext);
      toast.success("Copied to clipboard");
    }
  }

  function handleDialogClose() {
    setCreateOpen(false);
    setPlaintext(null);
    setNewTokenName("");
    setNewTokenExpiry("");
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Key className="size-5" />
          API Tokens
        </CardTitle>
        <Dialog open={createOpen} onOpenChange={(open) => {
          if (!open) handleDialogClose();
          else setCreateOpen(true);
        }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="size-4 mr-1" />
              Create Token
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {plaintext ? "Token Created" : "Create API Token"}
              </DialogTitle>
            </DialogHeader>
            {plaintext ? (
              <div className="space-y-4">
                <p className="text-sm text-text-muted">
                  Copy this token now. You won&apos;t be able to see it again.
                </p>
                <div className="flex gap-2">
                  <Input value={plaintext} readOnly className="font-mono text-xs" />
                  <Button variant="outline" size="sm" onClick={handleCopy}>
                    <Copy className="size-4" />
                  </Button>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Done</Button>
                  </DialogClose>
                </DialogFooter>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="token-name">Name</Label>
                  <Input
                    id="token-name"
                    value={newTokenName}
                    onChange={(e) => setNewTokenName(e.target.value)}
                    placeholder="e.g. CI Pipeline"
                  />
                </div>
                <div>
                  <Label htmlFor="token-expiry">Expiry (optional)</Label>
                  <Input
                    id="token-expiry"
                    type="date"
                    value={newTokenExpiry}
                    onChange={(e) => setNewTokenExpiry(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button
                    onClick={handleCreate}
                    disabled={!newTokenName.trim() || creating}
                  >
                    {creating ? "Creating..." : "Create"}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-text-muted">Loading tokens...</p>
        ) : tokens.length === 0 ? (
          <p className="text-sm text-text-muted">No API tokens yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Prefix</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokens.map((token) => (
                <TableRow key={token.id}>
                  <TableCell>{token.name}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {token.prefix}...
                  </TableCell>
                  <TableCell>{formatDate(token.createdAt)}</TableCell>
                  <TableCell>{formatDate(token.lastUsedAt)}</TableCell>
                  <TableCell>{formatDate(token.expiresAt)}</TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="size-4 text-danger" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Revoke Token</AlertDialogTitle>
                          <AlertDialogDescription>
                            Revoke &quot;{token.name}&quot;? Any applications using this
                            token will lose access immediately.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRevoke(token.id)}
                          >
                            Revoke
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
