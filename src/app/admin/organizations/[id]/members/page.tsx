import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { requireOrgPermission, PermissionError } from "@/lib/auth/check-permission";
import { getOrganization, listOrgMembers, listAvailableUsers } from "@/lib/actions/organizations";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { MembersClient } from "./MembersClient";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function OrgMembersPage({ params }: Props) {
  const { id } = await params;

  try {
    await requireOrgPermission("org:update", id);
  } catch (e) {
    if (e instanceof PermissionError) redirect("/admin");
    throw e;
  }

  const org = await getOrganization(id);
  if (!org) notFound();

  const [members, availableUsers] = await Promise.all([
    listOrgMembers(id),
    listAvailableUsers(),
  ]);

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Organizations", href: "/admin/organizations" },
          { label: org.name, href: `/admin/organizations/${id}` },
          { label: "Members" },
        ]}
      />
      <AdminPageHeader title={`Members — ${org.name}`}>
        <Button variant="outline" asChild>
          <Link href={`/admin/organizations/${id}`}>Back to Dashboard</Link>
        </Button>
      </AdminPageHeader>

      <MembersClient
        orgId={id}
        members={members}
        availableUsers={availableUsers}
      />
    </div>
  );
}
