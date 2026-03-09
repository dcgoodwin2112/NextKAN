import { PrismaClient } from "../../src/generated/prisma/client";

export async function seedActivity(prisma: PrismaClient) {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  const datasets = await prisma.dataset.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" },
    take: 10,
  });
  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: "asc" },
  });

  if (users.length === 0 || datasets.length === 0) {
    console.log("Seed: skipping activity — no users or datasets");
    return;
  }

  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);

  const entries: {
    action: string;
    entityType: string;
    entityId: string;
    entityName: string;
    userId: string;
    userName: string;
    details: string | null;
    createdAt: Date;
  }[] = [];

  // 8 create actions (6 datasets, 2 orgs) — spread over 30 days
  for (let i = 0; i < Math.min(6, datasets.length); i++) {
    const ds = datasets[i];
    const user = users[i % users.length];
    entries.push({
      action: "create",
      entityType: "dataset",
      entityId: ds.id,
      entityName: ds.title,
      userId: user.id,
      userName: user.name ?? user.email,
      details: null,
      createdAt: daysAgo(28 - i * 4),
    });
  }
  for (let i = 0; i < Math.min(2, orgs.length); i++) {
    const org = orgs[i];
    entries.push({
      action: "create",
      entityType: "organization",
      entityId: org.id,
      entityName: org.name,
      userId: users[0].id,
      userName: users[0].name ?? users[0].email,
      details: null,
      createdAt: daysAgo(30 - i),
    });
  }

  // 6 update actions on datasets
  for (let i = 0; i < Math.min(6, datasets.length); i++) {
    const ds = datasets[i];
    const user = users[i % users.length];
    entries.push({
      action: "update",
      entityType: "dataset",
      entityId: ds.id,
      entityName: ds.title,
      userId: user.id,
      userName: user.name ?? user.email,
      details: JSON.stringify({
        changes: { description: { old: "(previous)", new: "(updated)" } },
      }),
      createdAt: daysAgo(14 - i * 2),
    });
  }

  // 3 publish actions
  const publishedDs = datasets.filter((d) => d.status === "published");
  for (let i = 0; i < Math.min(3, publishedDs.length); i++) {
    const ds = publishedDs[i];
    const user = users[i % users.length];
    entries.push({
      action: "publish",
      entityType: "dataset",
      entityId: ds.id,
      entityName: ds.title,
      userId: user.id,
      userName: user.name ?? user.email,
      details: null,
      createdAt: daysAgo(7 - i * 2),
    });
  }

  // 3 delete actions (soft)
  for (let i = 0; i < Math.min(3, datasets.length); i++) {
    const ds = datasets[datasets.length - 1 - i];
    entries.push({
      action: "delete",
      entityType: "dataset",
      entityId: ds.id,
      entityName: ds.title,
      userId: users[0].id,
      userName: users[0].name ?? users[0].email,
      details: null,
      createdAt: daysAgo(i),
    });
  }

  for (const entry of entries) {
    await prisma.activityLog.create({ data: entry });
  }

  console.log(`Seed: ${entries.length} activity log entries created`);
}
