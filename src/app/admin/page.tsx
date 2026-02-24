import { prisma } from "@/lib/db";
import { ActivityFeed } from "@/components/admin/ActivityFeed";

export default async function AdminDashboard() {
  const [datasetCount, orgCount, recentActivity] = await Promise.all([
    prisma.dataset.count(),
    prisma.organization.count(),
    prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border p-6">
          <p className="text-sm text-text-muted">Datasets</p>
          <p className="text-3xl font-bold">{datasetCount}</p>
        </div>
        <div className="rounded-lg border p-6">
          <p className="text-sm text-text-muted">Organizations</p>
          <p className="text-3xl font-bold">{orgCount}</p>
        </div>
      </div>
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <div className="rounded-lg border p-6">
          <ActivityFeed activities={recentActivity as any} />
        </div>
      </div>
    </div>
  );
}
