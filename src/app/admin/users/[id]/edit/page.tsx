import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/roles";
import { getUser } from "@/lib/actions/users";
import { listOrganizations } from "@/lib/actions/organizations";
import { UserEditForm } from "@/components/admin/UserEditForm";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditUserPage({ params }: Props) {
  const session = await auth();
  const role = (session?.user as any)?.role as string;

  if (!hasPermission(role, "user:manage")) {
    redirect("/admin");
  }

  const { id } = await params;
  const [user, organizations] = await Promise.all([
    getUser(id),
    listOrganizations(),
  ]);

  if (!user) notFound();

  const currentUserId = (session?.user as any)?.id as string;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Edit User</h1>
      <UserEditForm
        user={user}
        organizations={organizations}
        isCurrentUser={currentUserId === user.id}
      />
    </div>
  );
}
