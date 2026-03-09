import { PrismaClient } from "../../src/generated/prisma/client";

export async function seedComments(prisma: PrismaClient) {
  // Get published datasets for comments
  const datasets = await prisma.dataset.findMany({
    where: { status: "published", deletedAt: null },
    take: 4,
    orderBy: { createdAt: "asc" },
  });

  if (datasets.length < 3) {
    console.log("Seed: skipping comments — not enough published datasets");
    return;
  }

  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);

  // 5 approved comments across datasets
  const comment1 = await prisma.comment.create({
    data: {
      datasetId: datasets[0].id,
      authorName: "Sarah Johnson",
      authorEmail: "sarah.j@example.com",
      content:
        "This dataset has been incredibly useful for our research on municipal spending patterns. The CSV format is easy to work with.",
      approved: true,
      createdAt: daysAgo(14),
    },
  });

  await prisma.comment.create({
    data: {
      datasetId: datasets[0].id,
      authorName: "Mike Torres",
      authorEmail: "mtorres@example.com",
      content:
        "Is there any plan to include line-item detail for individual departments? The aggregated data is great but more granularity would help.",
      approved: true,
      createdAt: daysAgo(10),
    },
  });

  // Threaded reply to comment1
  await prisma.comment.create({
    data: {
      datasetId: datasets[0].id,
      authorName: "Jane Mitchell",
      authorEmail: "budget@springfield.gov",
      content:
        "Thanks for the feedback! We're working on adding department-level detail in the next quarterly update.",
      approved: true,
      parentId: comment1.id,
      createdAt: daysAgo(9),
    },
  });

  await prisma.comment.create({
    data: {
      datasetId: datasets[1].id,
      authorName: "Dr. Lisa Park",
      authorEmail: "lpark@university.edu",
      content:
        "The geocoded accident data is very helpful for our urban planning research. Could you add intersection-level aggregation in a future release?",
      approved: true,
      createdAt: daysAgo(7),
    },
  });

  await prisma.comment.create({
    data: {
      datasetId: datasets[2].id,
      authorName: "Alex Nguyen",
      authorEmail: "anguyen@civic-tech.org",
      content:
        "We built a real-time air quality dashboard using this data feed. Sharing the link in case it's useful to others.",
      approved: true,
      createdAt: daysAgo(3),
    },
  });

  // 3 pending (unapproved) comments for moderation queue
  await prisma.comment.create({
    data: {
      datasetId: datasets[2].id,
      authorName: "Robert Kim",
      authorEmail: "rkim@example.com",
      content:
        "I noticed some missing readings for Station 3 in the March data. Is this a known issue?",
      approved: false,
      createdAt: daysAgo(2),
    },
  });

  await prisma.comment.create({
    data: {
      datasetId: datasets[3].id,
      authorName: "Emily Watson",
      authorEmail: "ewatson@example.com",
      content:
        "Would it be possible to get this data in Parquet format for better performance with large-scale analysis?",
      approved: false,
      createdAt: daysAgo(1),
    },
  });

  await prisma.comment.create({
    data: {
      datasetId: datasets[0].id,
      authorName: "James Miller",
      authorEmail: "jmiller@example.com",
      content:
        "The 2024 budget figures seem to be missing from the latest CSV update. Can someone confirm?",
      approved: false,
      createdAt: daysAgo(0),
    },
  });

  console.log("Seed: 8 comments created (5 approved, 3 pending)");
}
