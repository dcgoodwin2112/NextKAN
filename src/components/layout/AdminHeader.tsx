"use client";

import { signOut } from "next-auth/react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

interface AdminHeaderProps {
  user: { name?: string | null; email?: string | null };
}

export function AdminHeader({ user }: AdminHeaderProps) {
  return (
    <header className="border-b border-border bg-background px-6 py-3 flex items-center justify-between">
      <h2 className="text-sm text-text-muted">Admin Panel</h2>
      <div className="flex items-center gap-4">
        <ThemeToggle />
        <span className="text-sm text-text-tertiary">
          {user.name || user.email}
        </span>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="text-sm text-danger hover:underline"
        >
          Sign Out
        </button>
      </div>
    </header>
  );
}
