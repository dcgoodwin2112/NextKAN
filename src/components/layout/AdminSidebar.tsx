"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";

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
  { href: "/admin/activity", label: "Activity", requiredRole: "admin" },
  { href: "/admin/pages", label: "Pages", requiredRole: "admin" },
  { href: "/admin/users", label: "Users", requiredRole: "admin" },
  { href: "/admin/settings", label: "Settings", requiredRole: "admin" },
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
      <Button
        variant="outline"
        size="icon"
        className="md:hidden fixed top-4 left-4 z-50"
        onClick={() => setCollapsed(!collapsed)}
        aria-label="Toggle admin sidebar"
      >
        {collapsed ? <X className="size-5" /> : <Menu className="size-5" />}
      </Button>

      <aside
        className={cn(
          "w-64 border-r border-sidebar-border bg-sidebar p-4 shrink-0",
          collapsed ? "hidden" : "block",
          "md:block"
        )}
      >
        <Link href="/" className="block text-lg font-bold text-sidebar-foreground mb-6">
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
                className={cn(
                  "block rounded px-3 py-2 text-sm",
                  isActive
                    ? "bg-sidebar-primary/10 text-sidebar-primary font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                )}
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
