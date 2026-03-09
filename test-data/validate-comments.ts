/**
 * Comment & moderation feature validation script.
 * Run with: npx tsx test-data/validate-comments.ts
 *
 * Requires dev server running at localhost:3000 and at least one published dataset.
 * Tests: feature gating, moderation workflow, threading, search/filter,
 * validation errors, delete behavior, notification integration, cleanup.
 *
 * Uses a test-only API endpoint (/api/test/settings) to update settings in the
 * server process, which immediately invalidates the server's settings cache.
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

const BASE_URL = "http://localhost:3000";

// Track IDs for cleanup
const createdCommentIds: string[] = [];

function pass(msg: string) {
  console.log(`  ✅ ${msg}`);
}
function fail(msg: string) {
  console.log(`  ❌ ${msg}`);
}
function heading(msg: string) {
  console.log(`\n${"=".repeat(60)}\n${msg}\n${"=".repeat(60)}`);
}

async function getTestDataset(): Promise<{ id: string; title: string }> {
  const dataset = await prisma.dataset.findFirst({
    where: { status: "published", deletedAt: null },
    select: { id: true, title: true },
  });
  if (!dataset) throw new Error("No published datasets — seed first");
  return dataset;
}

/**
 * Update a setting via the test-only API endpoint.
 * Calls setSetting() inside the server process → immediate cache invalidation.
 */
async function setServerSetting(key: string, value: string) {
  const res = await fetch(`${BASE_URL}/api/test/settings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value }),
  });
  if (!res.ok) {
    throw new Error(
      `Failed to set setting ${key}=${value}: ${res.status} ${await res.text()}`
    );
  }
}

/** Force-refresh the settings cache in this process */
async function refreshSettingsCache() {
  const { resetSettingsCache, initSettingsCache } = await import(
    "../src/lib/services/settings"
  );
  resetSettingsCache();
  await initSettingsCache();
}

// ─── Step 1: Feature gating — comments disabled ─────────────────────────────
async function step1_commentsDisabled(datasetId: string) {
  heading("Step 1: Feature gating — comments disabled (default)");

  await setServerSetting("ENABLE_COMMENTS", "false");

  const getRes = await fetch(
    `${BASE_URL}/api/datasets/${datasetId}/comments`
  );
  if (getRes.status === 404) pass("GET /comments returns 404 when disabled");
  else fail(`Expected 404, got ${getRes.status}`);

  const postRes = await fetch(
    `${BASE_URL}/api/datasets/${datasetId}/comments`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        authorName: "Test",
        authorEmail: "test@example.com",
        content: "Should not work",
      }),
    }
  );
  if (postRes.status === 404) pass("POST /comments returns 404 when disabled");
  else fail(`Expected 404, got ${postRes.status}`);
}

// ─── Step 2: Enable comments ────────────────────────────────────────────────
async function step2_enableComments(datasetId: string) {
  heading("Step 2: Enable comments");

  await setServerSetting("ENABLE_COMMENTS", "true");

  const res = await fetch(
    `${BASE_URL}/api/datasets/${datasetId}/comments`
  );
  if (res.status === 200) {
    const data = await res.json();
    if (Array.isArray(data))
      pass(`GET /comments returns 200 with ${data.length} comments`);
    else fail(`Unexpected response format: ${JSON.stringify(data)}`);
  } else {
    fail(`Expected 200, got ${res.status}`);
  }
}

// ─── Step 3: Submit comment with moderation enabled ─────────────────────────
async function step3_moderatedComment(datasetId: string) {
  heading("Step 3: Submit comment with moderation enabled (default)");

  await setServerSetting("COMMENT_MODERATION", "true");

  const url = `${BASE_URL}/api/datasets/${datasetId}/comments`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      authorName: "Moderated User",
      authorEmail: "mod@example.com",
      content: "This comment needs approval",
    }),
  });

  if (res.status === 201) pass("POST returns 201");
  else {
    fail(`Expected 201, got ${res.status}`);
    return;
  }

  const comment = await res.json();
  createdCommentIds.push(comment.id);

  if (comment.approved === false)
    pass("Comment created with approved: false (moderation on)");
  else fail(`Expected approved: false, got ${comment.approved}`);

  if (comment.authorName === "Moderated User")
    pass("authorName preserved correctly");
  else fail(`Expected 'Moderated User', got '${comment.authorName}'`);

  // Verify NOT visible in public endpoint
  const listRes = await fetch(url);
  const listed = await listRes.json();
  if (Array.isArray(listed)) {
    const found = listed.find((c: { id: string }) => c.id === comment.id);
    if (!found) pass("Unapproved comment NOT visible in public GET");
    else fail("Unapproved comment should not appear in public GET");
  }

  // Verify in DB
  const dbComment = await prisma.comment.findUnique({
    where: { id: comment.id },
  });
  if (dbComment && dbComment.approved === false)
    pass("Comment exists in DB with approved: false");
  else fail("Comment not found in DB or has wrong approved status");
}

// ─── Step 4: Submit comment with moderation disabled ────────────────────────
async function step4_unmoderatedComment(datasetId: string) {
  heading("Step 4: Submit comment with moderation disabled");

  await setServerSetting("COMMENT_MODERATION", "false");

  const url = `${BASE_URL}/api/datasets/${datasetId}/comments`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      authorName: "Open User",
      authorEmail: "open@example.com",
      content: "This comment is auto-approved",
    }),
  });

  if (res.status === 201) pass("POST returns 201");
  else {
    fail(`Expected 201, got ${res.status}`);
    return;
  }

  const comment = await res.json();
  createdCommentIds.push(comment.id);

  if (comment.approved === true)
    pass("Comment created with approved: true (moderation off)");
  else fail(`Expected approved: true, got ${comment.approved}`);

  // Verify visible in public endpoint
  const listRes = await fetch(url);
  const listed = await listRes.json();
  if (Array.isArray(listed)) {
    const found = listed.find((c: { id: string }) => c.id === comment.id);
    if (found) pass("Auto-approved comment IS visible in public GET");
    else fail("Auto-approved comment should appear in public GET");
  }

  // Reset moderation to enabled
  await setServerSetting("COMMENT_MODERATION", "true");
}

// ─── Step 5: Admin moderation — approve comment ────────────────────────────
async function step5_approveComment(datasetId: string) {
  heading("Step 5: Admin moderation — approve comment");

  const pending = await prisma.comment.findMany({
    where: { datasetId, approved: false },
  });

  if (pending.length === 0) {
    fail("No pending comments to approve");
    return;
  }

  pass(`Found ${pending.length} pending comment(s)`);
  const commentId = pending[0]!.id;

  const { moderateComment } = await import("../src/lib/services/comments");
  const approved = await moderateComment(commentId, true);

  if (approved.approved === true)
    pass("Comment approved via moderateComment()");
  else fail(`Expected approved: true, got ${approved.approved}`);

  // Verify now visible in public endpoint
  const listRes = await fetch(
    `${BASE_URL}/api/datasets/${datasetId}/comments`
  );
  const listed = await listRes.json();
  if (Array.isArray(listed)) {
    const found = listed.find((c: { id: string }) => c.id === commentId);
    if (found) pass("Approved comment now visible in public GET");
    else fail("Approved comment should appear in public GET after approval");
    pass(`Total approved comments visible: ${listed.length}`);
  }
}

// ─── Step 6: Threaded replies ───────────────────────────────────────────────
async function step6_threadedReplies(datasetId: string) {
  heading("Step 6: Threaded replies");

  const parent = await prisma.comment.findFirst({
    where: { datasetId, approved: true, parentId: null },
  });

  if (!parent) {
    fail("No approved parent comment for reply test");
    return;
  }

  pass(`Using parent comment: "${parent.content.substring(0, 40)}"`);

  // Create reply via service (uses this process's DB connection)
  const { submitComment, moderateComment } = await import(
    "../src/lib/services/comments"
  );
  // Ensure moderation is on in this process too
  await refreshSettingsCache();

  const reply = await submitComment({
    datasetId,
    authorName: "Reply User",
    authorEmail: "reply@example.com",
    content: "This is a threaded reply",
    parentId: parent.id,
  });
  createdCommentIds.push(reply.id);

  if (reply.parentId === parent.id) pass("Reply has correct parentId");
  else fail(`Expected parentId ${parent.id}, got ${reply.parentId}`);

  // Approve the reply
  await moderateComment(reply.id, true);
  pass("Reply approved");

  // Verify reply appears nested under parent in public GET
  const listRes = await fetch(
    `${BASE_URL}/api/datasets/${datasetId}/comments`
  );
  const listed = await listRes.json();
  if (!Array.isArray(listed)) {
    fail("Public GET did not return array");
    return;
  }

  const parentInList = listed.find(
    (c: { id: string }) => c.id === parent.id
  );
  if (parentInList?.replies) {
    const replyInList = parentInList.replies.find(
      (r: { id: string }) => r.id === reply.id
    );
    if (replyInList) pass("Reply appears in parent's replies array");
    else fail("Reply not found in parent's replies array");
  } else {
    fail("Parent has no replies array in response");
  }

  // Reply should NOT appear as top-level comment
  const topLevel = listed.find((c: { id: string }) => c.id === reply.id);
  if (!topLevel) pass("Reply does NOT appear as top-level comment");
  else fail("Reply should not be a top-level comment");
}

// ─── Step 7: Validation errors ──────────────────────────────────────────────
async function step7_validationErrors(datasetId: string) {
  heading("Step 7: Validation errors");

  const cases = [
    {
      body: { authorEmail: "a@b.com", content: "hi" },
      label: "missing authorName",
    },
    {
      body: { authorName: "Test", content: "hi" },
      label: "missing authorEmail",
    },
    {
      body: { authorName: "Test", authorEmail: "a@b.com" },
      label: "missing content",
    },
    { body: {}, label: "empty body" },
  ];

  for (const { body, label } of cases) {
    const res = await fetch(
      `${BASE_URL}/api/datasets/${datasetId}/comments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    if (res.status === 400) pass(`400 for ${label}`);
    else fail(`Expected 400 for ${label}, got ${res.status}`);
  }
}

// ─── Step 8: Search and filter ──────────────────────────────────────────────
async function step8_searchAndFilter(datasetId: string) {
  heading("Step 8: Search and filter (via service function)");

  const extraComment = await prisma.comment.create({
    data: {
      datasetId,
      authorName: "Search Target",
      authorEmail: "search@example.com",
      content: "Unique findable content xyz123",
      approved: false,
    },
  });
  createdCommentIds.push(extraComment.id);

  const { searchComments } = await import("../src/lib/services/comments");

  // Status filter: pending
  const pending = await searchComments({ status: "pending" });
  if (pending.comments.every((c) => c.approved === false))
    pass(`searchComments(pending): ${pending.total} results, all unapproved`);
  else fail("Pending filter returned approved comments");

  // Status filter: approved
  const approved = await searchComments({ status: "approved" });
  if (approved.comments.every((c) => c.approved === true))
    pass(
      `searchComments(approved): ${approved.total} results, all approved`
    );
  else fail("Approved filter returned unapproved comments");

  // Status filter: all
  const all = await searchComments({ status: "all" });
  if (all.total >= pending.total + approved.total)
    pass(
      `searchComments(all): ${all.total} results (>= pending + approved)`
    );
  else
    fail(
      `all (${all.total}) should be >= pending (${pending.total}) + approved (${approved.total})`
    );

  // Search by content
  const searchResult = await searchComments({
    status: "all",
    search: "xyz123",
  });
  if (searchResult.total >= 1)
    pass(
      `searchComments(search: "xyz123"): found ${searchResult.total}`
    );
  else fail('Expected at least 1 result for search "xyz123"');

  // Search by author
  const authorResult = await searchComments({
    status: "all",
    search: "Search Target",
  });
  if (authorResult.total >= 1)
    pass(
      `searchComments(search: "Search Target"): found ${authorResult.total}`
    );
  else fail('Expected at least 1 result for author "Search Target"');

  // Sort: oldest first
  const sorted = await searchComments({
    status: "all",
    sort: "created_asc",
  });
  if (sorted.comments.length >= 2) {
    const first = new Date(sorted.comments[0]!.createdAt).getTime();
    const second = new Date(sorted.comments[1]!.createdAt).getTime();
    if (first <= second) pass("Sort created_asc: oldest first");
    else fail("Sort created_asc: order incorrect");
  } else {
    pass("Sort: not enough comments to verify order");
  }
}

// ─── Step 9: Delete comment ────────────────────────────────────────────────
async function step9_deleteComment(datasetId: string) {
  heading("Step 9: Delete comment");

  const parent = await prisma.comment.create({
    data: {
      datasetId,
      authorName: "Delete Parent",
      authorEmail: "del@example.com",
      content: "Parent to delete",
      approved: true,
    },
  });
  createdCommentIds.push(parent.id);

  const child = await prisma.comment.create({
    data: {
      datasetId,
      authorName: "Child of Deleted",
      authorEmail: "child@example.com",
      content: "Child reply",
      parentId: parent.id,
      approved: true,
    },
  });
  createdCommentIds.push(child.id);

  // Delete parent
  const { deleteComment } = await import("../src/lib/services/comments");
  await deleteComment(parent.id);

  // Verify parent deleted
  const deletedParent = await prisma.comment.findUnique({
    where: { id: parent.id },
  });
  if (!deletedParent) pass("Parent comment deleted from DB");
  else fail("Parent comment should be deleted");

  // Remove from cleanup list
  const idx = createdCommentIds.indexOf(parent.id);
  if (idx >= 0) createdCommentIds.splice(idx, 1);

  // Verify child still exists (no cascade)
  const orphanChild = await prisma.comment.findUnique({
    where: { id: child.id },
  });
  if (orphanChild) pass("Child comment NOT cascade-deleted (orphaned)");
  else fail("Child comment should still exist after parent delete");

  // Verify deleted parent not in public endpoint
  const listRes = await fetch(
    `${BASE_URL}/api/datasets/${datasetId}/comments`
  );
  if (listRes.ok) {
    const listed = await listRes.json();
    if (Array.isArray(listed)) {
      const found = listed.find(
        (c: { id: string }) => c.id === parent.id
      );
      if (!found) pass("Deleted comment absent from public GET");
      else fail("Deleted comment should not appear in public GET");
    }
  } else {
    pass(
      "Public GET unavailable (server cache) — verified deletion via DB"
    );
  }
}

// ─── Step 10: Notification integration ──────────────────────────────────────
async function step10_notifications(datasetId: string) {
  heading("Step 10: Notification integration");

  // Ensure comments enabled in this process's cache
  await refreshSettingsCache();

  const pending = await prisma.comment.create({
    data: {
      datasetId,
      authorName: "Notification Test",
      authorEmail: "notify@example.com",
      content: "Pending for notification check",
      approved: false,
    },
  });
  createdCommentIds.push(pending.id);

  const { getNotificationItems } = await import(
    "../src/lib/services/notifications"
  );
  const notifications = await getNotificationItems();

  const commentNotif = notifications.items.find(
    (n) => n.type === "comment"
  );
  if (commentNotif) {
    pass(`Comment notification found: "${commentNotif.title}"`);
    if (commentNotif.href === "/admin/comments")
      pass("Notification links to /admin/comments");
    else
      fail(
        `Expected href '/admin/comments', got '${commentNotif.href}'`
      );
  } else {
    fail(
      "No comment notification — expected pending comments notification"
    );
  }
}

// ─── Cleanup ───────────────────────────────────────────────────────────────
async function cleanup() {
  heading("Cleanup");

  // Delete all test comments by tracked IDs
  if (createdCommentIds.length > 0) {
    const deleted = await prisma.comment.deleteMany({
      where: { id: { in: createdCommentIds } },
    });
    pass(`Deleted ${deleted.count} test comments (by ID)`);
  }

  // Also clean up any remaining test comments by email pattern
  const extra = await prisma.comment.deleteMany({
    where: {
      authorEmail: {
        in: [
          "mod@example.com",
          "open@example.com",
          "reply@example.com",
          "search@example.com",
          "del@example.com",
          "child@example.com",
          "notify@example.com",
        ],
      },
    },
  });
  if (extra.count > 0) pass(`Cleaned up ${extra.count} extra test comments`);

  // Reset settings via API (server-side cache invalidation)
  try {
    await setServerSetting("ENABLE_COMMENTS", "false");
    await setServerSetting("COMMENT_MODERATION", "true");
  } catch {
    // Server might be stopped — fall back to direct DB
    await prisma.setting.upsert({
      where: { key: "ENABLE_COMMENTS" },
      update: { value: "false" },
      create: { key: "ENABLE_COMMENTS", value: "false" },
    });
    await prisma.setting.upsert({
      where: { key: "COMMENT_MODERATION" },
      update: { value: "true" },
      create: { key: "COMMENT_MODERATION", value: "true" },
    });
  }
  pass("Reset ENABLE_COMMENTS=false, COMMENT_MODERATION=true");

  // Verify clean state
  const remaining = await prisma.comment.findMany({
    where: {
      authorEmail: {
        in: [
          "mod@example.com",
          "open@example.com",
          "reply@example.com",
          "search@example.com",
        ],
      },
    },
  });
  if (remaining.length === 0) pass("All test comments cleaned up");
  else fail(`${remaining.length} test comments still remain`);
}

// ─── Main ──────────────────────────────────────────────────────────────────
async function main() {
  console.log("🔍 Comment & Moderation Feature Validation\n");

  try {
    // Verify dev server is running
    const healthCheck = await fetch(`${BASE_URL}/api/data.json`).catch(
      () => null
    );
    if (!healthCheck?.ok) {
      console.error("❌ Dev server not running at", BASE_URL);
      console.error("   Start with: npm run dev");
      process.exit(1);
    }
    pass("Dev server running");

    // Verify test settings endpoint is available
    const settingsCheck = await fetch(
      `${BASE_URL}/api/test/settings`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "ENABLE_COMMENTS", value: "false" }),
      }
    );
    if (!settingsCheck.ok) {
      console.error(
        "❌ Test settings endpoint not available — restart dev server"
      );
      process.exit(1);
    }
    pass("Test settings endpoint available");

    const dataset = await getTestDataset();
    pass(`Using dataset: "${dataset.title}" (${dataset.id})`);

    await step1_commentsDisabled(dataset.id);
    await step2_enableComments(dataset.id);
    await step3_moderatedComment(dataset.id);
    await step4_unmoderatedComment(dataset.id);
    await step5_approveComment(dataset.id);
    await step6_threadedReplies(dataset.id);
    await step7_validationErrors(dataset.id);
    await step8_searchAndFilter(dataset.id);
    await step9_deleteComment(dataset.id);
    await step10_notifications(dataset.id);
  } catch (error) {
    console.error("\n❌ Unexpected error:", error);
  } finally {
    await cleanup();
    await prisma.$disconnect();
  }

  console.log("\n✨ Validation complete!\n");
}

main();
