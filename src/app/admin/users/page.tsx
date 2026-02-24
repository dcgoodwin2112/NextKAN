import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/auth/roles";
import { UserList } from "./UserList";
import { listUsers } from "@/lib/actions/users";
import { listOrganizations } from "@/lib/actions/organizations";

export default async function UsersPage() {
  const session = await auth();
  const role = (session?.user as any)?.role as string;

  if (!hasPermission(role, "user:manage")) {
    redirect("/admin");
  }

  const [users, organizations] = await Promise.all([
    listUsers(),
    listOrganizations(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">User Management</h1>
      <UserList users={users} organizations={organizations} />
    </div>
  );
}
