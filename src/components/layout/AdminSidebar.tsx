"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Database,
  FileText,
  SlidersHorizontal,
  Layers,
  Scale,
  Palette,
  Building2,
  BookOpen,
  BarChart3,
  Download,
  Upload,
  CheckCircle2,
  Link as LinkIcon,
  Users,
  MessageSquare,
  TrendingUp,
  History,
  Trash2,
  Monitor,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Separator } from "@/components/ui/separator";
import { useAdminSidebar } from "@/lib/admin-sidebar-context";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  requiredRole?: string;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/datasets", label: "Datasets", icon: Database },
      { href: "/admin/templates", label: "Templates", icon: FileText },
      { href: "/admin/custom-fields", label: "Custom Fields", icon: SlidersHorizontal, requiredRole: "admin" },
      { href: "/admin/series", label: "Series", icon: Layers },
      { href: "/admin/licenses", label: "Licenses", icon: Scale },
      { href: "/admin/themes", label: "Themes", icon: Palette },
      { href: "/admin/organizations", label: "Organizations", icon: Building2 },
      { href: "/admin/pages", label: "Pages", icon: BookOpen, requiredRole: "admin" },
      { href: "/admin/charts", label: "Charts", icon: BarChart3 },
    ],
  },
  {
    label: "Data Management",
    items: [
      { href: "/admin/harvest", label: "Harvest", icon: Download, requiredRole: "admin" },
      { href: "/admin/import", label: "Import", icon: Upload },
      { href: "/admin/quality", label: "Quality", icon: CheckCircle2 },
      { href: "/admin/link-check", label: "Link Checker", icon: LinkIcon, requiredRole: "admin" },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/admin/users", label: "Users", icon: Users, requiredRole: "admin" },
      { href: "/admin/comments", label: "Comments", icon: MessageSquare, requiredRole: "admin" },
      { href: "/admin/analytics", label: "Analytics", icon: TrendingUp, requiredRole: "admin" },
      { href: "/admin/activity", label: "Activity", icon: History, requiredRole: "admin" },
      { href: "/admin/trash", label: "Trash", icon: Trash2, requiredRole: "admin" },
      { href: "/admin/system", label: "System", icon: Monitor, requiredRole: "admin" },
      { href: "/admin/settings", label: "Settings", icon: Settings, requiredRole: "admin" },
    ],
  },
];

interface AdminSidebarProps {
  userRole?: string;
}

export function AdminSidebar({ userRole }: AdminSidebarProps) {
  const pathname = usePathname();
  const { open, close, closeMobile } = useAdminSidebar();

  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.requiredRole || item.requiredRole === userRole
      ),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={close}
          aria-hidden="true"
          data-testid="sidebar-backdrop"
        />
      )}

      <nav
        aria-label="Admin"
        inert={!open ? true : undefined}
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 border-r border-sidebar-border bg-sidebar p-4 shrink-0 overflow-y-auto",
          "transform transition-transform duration-200 ease-in-out md:transition-none",
          open ? "translate-x-0 md:relative" : "-translate-x-full md:hidden"
        )}
      >
        <div>
          {visibleGroups.map((group) => (
            <div key={group.label ?? "top"}>
              {group.label && (
                <>
                  <Separator className="my-3" />
                  <p className="px-3 mb-1 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                    {group.label}
                  </p>
                </>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive =
                    item.href === "/admin"
                      ? pathname === "/admin"
                      : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMobile}
                      className={cn(
                        "flex items-center gap-2 rounded px-3 py-2 text-sm",
                        isActive
                          ? "bg-sidebar-primary/10 text-sidebar-primary font-medium"
                          : "text-sidebar-foreground hover:bg-sidebar-accent"
                      )}
                    >
                      <item.icon className="size-4 shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>
    </>
  );
}
