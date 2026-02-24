"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/datasets", label: "Datasets" },
  { href: "/admin/series", label: "Series" },
  { href: "/admin/organizations", label: "Organizations" },
  { href: "/admin/harvest", label: "Harvest", requiredRole: "admin" },
  { href: "/admin/import", label: "Import" },
  { href: "/admin/quality", label: "Quality" },
  { href: "/admin/comments", label: "Comments", requiredRole: "admin" },
  { href: "/admin/analytics", label: "Analytics", requiredRole: "admin" },
  { href: "/admin/pages", label: "Pages", requiredRole: "admin" },
  { href: "/admin/users", label: "Users", requiredRole: "admin" },
];

interface AdminSidebarProps {
  userRole?: string;
}

export function AdminSidebar({ userRole }: AdminSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const visibleItems = navItems.filter(
    (item) => !item.requiredRole || item.requiredRole === userRole
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        type="button"
        className="md:hidden fixed top-4 left-4 z-50 rounded bg-surface-alt p-2"
        onClick={() => setCollapsed(!collapsed)}
        aria-label="Toggle admin sidebar"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <aside
        className={`${
          collapsed ? "hidden" : "block"
        } md:block w-64 border-r border-border bg-surface p-4 shrink-0`}
      >
        <Link href="/" className="block text-lg font-bold mb-6">
          NextKAN
        </Link>
        <nav className="space-y-1">
          {visibleItems.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded px-3 py-2 text-sm ${
                  isActive
                    ? "bg-primary-subtle text-primary-subtle-text font-medium"
                    : "text-text-secondary hover:bg-surface-alt"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
