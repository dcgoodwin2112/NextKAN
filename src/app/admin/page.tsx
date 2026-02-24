import { prisma } from "@/lib/db";

export default async function AdminDashboard() {
  const [datasetCount, orgCount] = await Promise.all([
    prisma.dataset.count(),
    prisma.organization.count(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border p-6">
          <p className="text-sm text-gray-500">Datasets</p>
          <p className="text-3xl font-bold">{datasetCount}</p>
        </div>
        <div className="rounded-lg border p-6">
          <p className="text-sm text-gray-500">Organizations</p>
          <p className="text-3xl font-bold">{orgCount}</p>
        </div>
      </div>
    </div>
  );
}
