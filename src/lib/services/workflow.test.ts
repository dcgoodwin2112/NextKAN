import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { canTransition, getAvailableTransitions, transitionWorkflow, isWorkflowEnabled } from "./workflow";

const mockFindUnique = vi.fn();
const mockUpdate = vi.fn();
const mockCreate = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    dataset: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
    workflowTransition: {
      create: (...args: unknown[]) => mockCreate(...args),
    },
    $transaction: (fn: (tx: unknown) => Promise<unknown>) => mockTransaction(fn),
  },
}));

vi.mock("@/lib/services/activity", () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

const mockDataset = {
  id: "a1b2c3d4-e5f6-1234-a567-123456789abc",
  title: "Test Dataset",
  workflowStatus: "draft",
  status: "draft",
};

describe("canTransition", () => {
  it("allows draft -> pending_review for editor", () => {
    const result = canTransition("draft", "pending_review", "editor");
    expect(result.allowed).toBe(true);
  });

  it("allows pending_review -> approved for orgAdmin", () => {
    const result = canTransition("pending_review", "approved", "orgAdmin");
    expect(result.allowed).toBe(true);
  });

  it("allows pending_review -> rejected for admin", () => {
    const result = canTransition("pending_review", "rejected", "admin");
    expect(result.allowed).toBe(true);
  });

  it("allows approved -> published for orgAdmin", () => {
    const result = canTransition("approved", "published", "orgAdmin");
    expect(result.allowed).toBe(true);
  });

  it("allows pending_review -> draft (send back) for orgAdmin", () => {
    const result = canTransition("pending_review", "draft", "orgAdmin");
    expect(result.allowed).toBe(true);
  });

  it("blocks draft -> published (must go through review)", () => {
    const result = canTransition("draft", "published", "admin");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Cannot transition");
  });

  it("blocks draft -> approved", () => {
    const result = canTransition("draft", "approved", "admin");
    expect(result.allowed).toBe(false);
  });

  it("blocks viewer from any transition", () => {
    expect(canTransition("draft", "pending_review", "viewer").allowed).toBe(false);
    expect(canTransition("pending_review", "approved", "viewer").allowed).toBe(false);
    expect(canTransition("approved", "published", "viewer").allowed).toBe(false);
  });

  it("blocks editor from approving", () => {
    const result = canTransition("pending_review", "approved", "editor");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Role editor");
  });

  it("blocks editor from rejecting", () => {
    const result = canTransition("pending_review", "rejected", "editor");
    expect(result.allowed).toBe(false);
  });

  it("allows rejected -> draft for editor", () => {
    const result = canTransition("rejected", "draft", "editor");
    expect(result.allowed).toBe(true);
  });

  it("allows published -> archived for orgAdmin", () => {
    const result = canTransition("published", "archived", "orgAdmin");
    expect(result.allowed).toBe(true);
  });

  it("allows archived -> draft only for admin", () => {
    expect(canTransition("archived", "draft", "admin").allowed).toBe(true);
    expect(canTransition("archived", "draft", "orgAdmin").allowed).toBe(false);
    expect(canTransition("archived", "draft", "editor").allowed).toBe(false);
  });

  it("returns error for invalid current status", () => {
    const result = canTransition("invalid", "draft", "admin");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Invalid current status");
  });
});

describe("getAvailableTransitions", () => {
  it("returns pending_review for draft with editor role", () => {
    const transitions = getAvailableTransitions("draft", "editor");
    expect(transitions).toEqual(["pending_review"]);
  });

  it("returns approved/rejected/draft for pending_review with orgAdmin", () => {
    const transitions = getAvailableTransitions("pending_review", "orgAdmin");
    expect(transitions).toEqual(["approved", "rejected", "draft"]);
  });

  it("returns empty array for viewer", () => {
    expect(getAvailableTransitions("draft", "viewer")).toEqual([]);
  });

  it("returns empty array for invalid status", () => {
    expect(getAvailableTransitions("invalid", "admin")).toEqual([]);
  });
});

describe("transitionWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation(async (fn) => {
      return fn({
        dataset: { update: mockUpdate },
        workflowTransition: { create: mockCreate },
      });
    });
  });

  it("allows draft -> pending_review and creates transition record", async () => {
    mockFindUnique.mockResolvedValue({ ...mockDataset, workflowStatus: "draft" });
    mockUpdate.mockResolvedValue({ ...mockDataset, workflowStatus: "pending_review" });
    mockCreate.mockResolvedValue({});

    const result = await transitionWorkflow(
      mockDataset.id,
      "pending_review",
      "user-1",
      "editor",
      "Jane"
    );

    expect(result.workflowStatus).toBe("pending_review");
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          datasetId: mockDataset.id,
          fromStatus: "draft",
          toStatus: "pending_review",
          userId: "user-1",
        }),
      })
    );
  });

  it("updates submittedAt when transitioning to pending_review", async () => {
    mockFindUnique.mockResolvedValue({ ...mockDataset, workflowStatus: "draft" });
    mockUpdate.mockResolvedValue({ ...mockDataset, workflowStatus: "pending_review" });
    mockCreate.mockResolvedValue({});

    await transitionWorkflow(mockDataset.id, "pending_review", "user-1", "editor");

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          submittedAt: expect.any(Date),
        }),
      })
    );
  });

  it("updates reviewedAt and reviewerId when approving", async () => {
    mockFindUnique.mockResolvedValue({ ...mockDataset, workflowStatus: "pending_review" });
    mockUpdate.mockResolvedValue({ ...mockDataset, workflowStatus: "approved" });
    mockCreate.mockResolvedValue({});

    await transitionWorkflow(mockDataset.id, "approved", "admin-1", "admin");

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reviewedAt: expect.any(Date),
          reviewerId: "admin-1",
        }),
      })
    );
  });

  it("updates publishedAt and legacy status when publishing", async () => {
    mockFindUnique.mockResolvedValue({ ...mockDataset, workflowStatus: "approved" });
    mockUpdate.mockResolvedValue({ ...mockDataset, workflowStatus: "published", status: "published" });
    mockCreate.mockResolvedValue({});

    await transitionWorkflow(mockDataset.id, "published", "admin-1", "admin");

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          publishedAt: expect.any(Date),
          status: "published",
        }),
      })
    );
  });

  it("throws when dataset not found", async () => {
    mockFindUnique.mockResolvedValue(null);

    await expect(
      transitionWorkflow(mockDataset.id, "pending_review", "user-1", "editor")
    ).rejects.toThrow("Dataset not found");
  });

  it("throws when transition is not allowed", async () => {
    mockFindUnique.mockResolvedValue({ ...mockDataset, workflowStatus: "draft" });

    await expect(
      transitionWorkflow(mockDataset.id, "published", "user-1", "editor")
    ).rejects.toThrow("Cannot transition");
  });

  it("throws when user role is insufficient", async () => {
    mockFindUnique.mockResolvedValue({ ...mockDataset, workflowStatus: "pending_review" });

    await expect(
      transitionWorkflow(mockDataset.id, "approved", "user-1", "editor")
    ).rejects.toThrow("Role editor");
  });
});

describe("isWorkflowEnabled", () => {
  const originalEnv = process.env.ENABLE_WORKFLOW;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.ENABLE_WORKFLOW = originalEnv;
    } else {
      delete process.env.ENABLE_WORKFLOW;
    }
  });

  it("returns false when not set", () => {
    delete process.env.ENABLE_WORKFLOW;
    expect(isWorkflowEnabled()).toBe(false);
  });

  it("returns true when set to 'true'", () => {
    process.env.ENABLE_WORKFLOW = "true";
    expect(isWorkflowEnabled()).toBe(true);
  });

  it("returns false when set to 'false'", () => {
    process.env.ENABLE_WORKFLOW = "false";
    expect(isWorkflowEnabled()).toBe(false);
  });
});
