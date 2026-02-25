"use client";

import { signOut } from "next-auth/react";
import { User, LogOut, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

interface AdminHeaderProps {
  user: { name?: string | null; email?: string | null };
}

export function AdminHeader({ user }: AdminHeaderProps) {
  return (
    <header className="border-b border-border bg-background px-6 py-3 flex items-center justify-between">
      <h2 className="text-sm text-text-muted">Admin Panel</h2>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <User className="size-4" />
              <span className="text-sm">{user.name || user.email}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <div className="text-sm font-medium">{user.name}</div>
              {user.email && (
                <div className="text-xs text-muted-foreground">{user.email}</div>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/">
                <ArrowLeft className="size-4" />
                Back to Site
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              <LogOut className="size-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
