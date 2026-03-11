import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/auth/roles";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { AdminSidebarProvider } from "@/lib/admin-sidebar-context";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const userRole = (session.user as any).role as string;

  // Viewers don't have admin:access — redirect to public site
  if (!hasPermission(userRole, "admin:access")) {
    redirect("/");
  }

  return (
    <AdminSidebarProvider>
      <div className="flex flex-col min-h-screen">
        <AdminHeader user={session.user} />
        <div className="flex flex-1 min-h-0">
          <AdminSidebar userRole={userRole} />
          <main id="main-content" className="flex-1 p-6 overflow-y-auto">{children}</main>
        </div>
      </div>
    </AdminSidebarProvider>
  );
}
