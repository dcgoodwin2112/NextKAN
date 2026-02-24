"use client";

import { signOut } from "next-auth/react";

interface AdminHeaderProps {
  user: { name?: string | null; email?: string | null };
}

export function AdminHeader({ user }: AdminHeaderProps) {
  return (
    <header className="border-b bg-white px-6 py-3 flex items-center justify-between">
      <h2 className="text-sm text-gray-500">Admin Panel</h2>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">
          {user.name || user.email}
        </span>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="text-sm text-red-600 hover:underline"
        >
          Sign Out
        </button>
      </div>
    </header>
  );
}
