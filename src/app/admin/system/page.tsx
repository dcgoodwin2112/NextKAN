import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/roles";
import { getSystemInfo } from "@/lib/services/system";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <TableRow>
      <TableCell className="font-medium text-text-muted w-1/2">{label}</TableCell>
      <TableCell>{value}</TableCell>
    </TableRow>
  );
}

export default async function SystemInfoPage() {
  const session = await auth();
  const role = (session?.user as any)?.role as string;

  if (!hasPermission(role, "user:manage")) {
    redirect("/admin");
  }

  const info = await getSystemInfo();

  return (
    <div>
      <AdminPageHeader title="System Info" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>System</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                <InfoRow label="Node.js" value={info.node} />
                <InfoRow label="Next.js" value={info.nextVersion} />
                <InfoRow label="Prisma" value={info.prismaVersion} />
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Database</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                <InfoRow
                  label="Type"
                  value={
                    <Badge variant="outline">
                      {info.databaseType === "postgresql" ? "PostgreSQL" : "SQLite"}
                    </Badge>
                  }
                />
                <InfoRow label="Datasets" value={info.counts.datasets.toLocaleString()} />
                <InfoRow label="Organizations" value={info.counts.organizations.toLocaleString()} />
                <InfoRow label="Users" value={info.counts.users.toLocaleString()} />
                <InfoRow label="Distributions" value={info.counts.distributions.toLocaleString()} />
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Features</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                <InfoRow
                  label="Workflow"
                  value={
                    <Badge variant={info.features.workflow ? "default" : "secondary"}>
                      {info.features.workflow ? "Enabled" : "Disabled"}
                    </Badge>
                  }
                />
                <InfoRow
                  label="Comments"
                  value={
                    <Badge variant={info.features.comments ? "default" : "secondary"}>
                      {info.features.comments ? "Enabled" : "Disabled"}
                    </Badge>
                  }
                />
                <InfoRow
                  label="Plugins"
                  value={
                    <Badge variant={info.features.plugins ? "default" : "secondary"}>
                      {info.features.plugins ? "Enabled" : "Disabled"}
                    </Badge>
                  }
                />
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Storage</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                <InfoRow
                  label="Provider"
                  value={
                    <Badge variant="outline">
                      {info.storageProvider}
                    </Badge>
                  }
                />
                <InfoRow
                  label="Last Harvest"
                  value={
                    info.lastHarvestTime
                      ? info.lastHarvestTime.toLocaleString()
                      : "Never"
                  }
                />
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
