"use client";

import { useState } from "react";
import type { WorkflowStatus } from "@/lib/services/workflow";

interface WorkflowTransitionRecord {
  id: string;
  fromStatus: string;
  toStatus: string;
  userName: string | null;
  note: string | null;
  createdAt: string;
}

interface WorkflowPanelProps {
  datasetId: string;
  currentStatus: string;
  availableTransitions: string[];
  transitions: WorkflowTransitionRecord[];
  onTransition: (toStatus: string, note?: string) => Promise<void>;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-surface-alt text-text-secondary" },
  pending_review: { label: "Pending Review", color: "bg-warning-subtle text-warning-text" },
  approved: { label: "Approved", color: "bg-success-subtle text-success-text" },
  published: { label: "Published", color: "bg-primary-subtle text-primary-subtle-text" },
  rejected: { label: "Rejected", color: "bg-danger-subtle text-danger-text" },
  archived: { label: "Archived", color: "bg-surface-inset text-text-tertiary" },
};

const TRANSITION_LABELS: Record<string, { label: string; style: string }> = {
  pending_review: { label: "Submit for Review", style: "bg-warning hover:opacity-90 text-white" },
  approved: { label: "Approve", style: "bg-success hover:opacity-90 text-white" },
  rejected: { label: "Reject", style: "bg-danger hover:opacity-90 text-white" },
  published: { label: "Publish", style: "bg-primary hover:bg-primary-hover text-white" },
  draft: { label: "Return to Draft", style: "bg-secondary hover:opacity-90 text-white" },
  archived: { label: "Archive", style: "border border-border text-text-secondary hover:bg-surface" },
};

export function WorkflowPanel({
  currentStatus,
  availableTransitions,
  transitions,
  onTransition,
}: WorkflowPanelProps) {
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const statusInfo = STATUS_LABELS[currentStatus] || { label: currentStatus, color: "bg-surface-alt" };

  const handleTransition = async (toStatus: string) => {
    setIsSubmitting(true);
    try {
      await onTransition(toStatus, note || undefined);
      setNote("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-lg border border-border p-4 bg-background">
      <h3 className="text-sm font-semibold mb-3">Editorial Workflow</h3>

      <div className="mb-4">
        <span className="text-xs text-text-muted">Current Status</span>
        <div className="mt-1">
          <span className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
        </div>
      </div>

      {availableTransitions.length > 0 && (
        <>
          {(currentStatus === "pending_review" || availableTransitions.includes("rejected")) && (
            <div className="mb-3">
              <label htmlFor="workflow-note" className="block text-xs text-text-muted mb-1">
                Note (optional)
              </label>
              <textarea
                id="workflow-note"
                className="w-full rounded border px-3 py-2 text-sm"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note about this transition..."
              />
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {availableTransitions.map((status) => {
              const info = TRANSITION_LABELS[status] || { label: status, style: "bg-surface-alt" };
              return (
                <button
                  key={status}
                  type="button"
                  disabled={isSubmitting}
                  className={`rounded px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${info.style}`}
                  onClick={() => handleTransition(status)}
                >
                  {info.label}
                </button>
              );
            })}
          </div>
        </>
      )}

      {transitions.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <h4 className="text-xs font-medium text-text-muted mb-2">Workflow History</h4>
          <div className="space-y-2">
            {transitions.map((t) => {
              const fromLabel = STATUS_LABELS[t.fromStatus]?.label || t.fromStatus;
              const toLabel = STATUS_LABELS[t.toStatus]?.label || t.toStatus;
              return (
                <div key={t.id} className="text-xs text-text-tertiary">
                  <span className="font-medium">{t.userName || "System"}</span>{" "}
                  changed status from {fromLabel} to {toLabel}
                  {t.note && <span className="block text-text-muted ml-2">&ldquo;{t.note}&rdquo;</span>}
                  <span className="block text-text-muted">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
