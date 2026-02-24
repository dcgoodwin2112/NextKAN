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
  draft: { label: "Draft", color: "bg-gray-100 text-gray-700" },
  pending_review: { label: "Pending Review", color: "bg-yellow-100 text-yellow-700" },
  approved: { label: "Approved", color: "bg-green-100 text-green-700" },
  published: { label: "Published", color: "bg-blue-100 text-blue-700" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700" },
  archived: { label: "Archived", color: "bg-gray-200 text-gray-600" },
};

const TRANSITION_LABELS: Record<string, { label: string; style: string }> = {
  pending_review: { label: "Submit for Review", style: "bg-yellow-600 hover:bg-yellow-700 text-white" },
  approved: { label: "Approve", style: "bg-green-600 hover:bg-green-700 text-white" },
  rejected: { label: "Reject", style: "bg-red-600 hover:bg-red-700 text-white" },
  published: { label: "Publish", style: "bg-blue-600 hover:bg-blue-700 text-white" },
  draft: { label: "Return to Draft", style: "bg-gray-600 hover:bg-gray-700 text-white" },
  archived: { label: "Archive", style: "border border-gray-300 text-gray-700 hover:bg-gray-50" },
};

export function WorkflowPanel({
  currentStatus,
  availableTransitions,
  transitions,
  onTransition,
}: WorkflowPanelProps) {
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const statusInfo = STATUS_LABELS[currentStatus] || { label: currentStatus, color: "bg-gray-100" };

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
    <div className="rounded-lg border p-4 bg-white">
      <h3 className="text-sm font-semibold mb-3">Editorial Workflow</h3>

      <div className="mb-4">
        <span className="text-xs text-gray-500">Current Status</span>
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
              <label htmlFor="workflow-note" className="block text-xs text-gray-500 mb-1">
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
              const info = TRANSITION_LABELS[status] || { label: status, style: "bg-gray-200" };
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
        <div className="mt-4 border-t pt-3">
          <h4 className="text-xs font-medium text-gray-500 mb-2">Workflow History</h4>
          <div className="space-y-2">
            {transitions.map((t) => {
              const fromLabel = STATUS_LABELS[t.fromStatus]?.label || t.fromStatus;
              const toLabel = STATUS_LABELS[t.toStatus]?.label || t.toStatus;
              return (
                <div key={t.id} className="text-xs text-gray-600">
                  <span className="font-medium">{t.userName || "System"}</span>{" "}
                  changed status from {fromLabel} to {toLabel}
                  {t.note && <span className="block text-gray-500 ml-2">&ldquo;{t.note}&rdquo;</span>}
                  <span className="block text-gray-500">
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
