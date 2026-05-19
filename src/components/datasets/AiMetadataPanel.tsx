"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  annotateDistributionColumns,
  applyDatasetDraft,
  draftDatasetMetadata,
  type DraftMetadataResult,
} from "@/lib/actions/ai-metadata";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AiMetadataPanelProps {
  datasetId: string;
  distributionId: string;
  distributionLabel: string;
  /** True when distribution.profileStatus === "ready". */
  canDraft: boolean;
  /** True when the distribution has DataDictionaryField rows. */
  canAnnotate: boolean;
}

export function AiMetadataPanel({
  datasetId,
  distributionId,
  distributionLabel,
  canDraft,
  canAnnotate,
}: AiMetadataPanelProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<DraftMetadataResult | null>(null);
  const [drafting, startDrafting] = useTransition();
  const [annotating, startAnnotating] = useTransition();
  const [applying, startApplying] = useTransition();

  function handleDraft() {
    startDrafting(async () => {
      try {
        const result = await draftDatasetMetadata(distributionId);
        setDraft(result);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to generate draft",
        );
      }
    });
  }

  function handleAnnotate() {
    startAnnotating(async () => {
      try {
        const outcome = await annotateDistributionColumns(distributionId);
        const msg =
          outcome.skipped > 0
            ? `Annotated ${outcome.updated} column(s); ${outcome.skipped} skipped`
            : `Annotated ${outcome.updated} column(s)`;
        toast.success(msg);
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to annotate columns",
        );
      }
    });
  }

  function handleApply() {
    if (!draft) return;
    startApplying(async () => {
      try {
        await applyDatasetDraft(datasetId, draft);
        toast.success("Draft applied — review the form above");
        setDraft(null);
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to apply draft",
        );
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-text-muted mr-2">{distributionLabel}</span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleDraft}
        disabled={!canDraft || drafting}
      >
        {drafting ? "Generating…" : "Generate metadata draft"}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAnnotate}
        disabled={!canAnnotate || annotating}
      >
        {annotating ? "Annotating…" : "Annotate columns"}
      </Button>

      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AI-generated metadata draft</DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="space-y-4 text-sm">
              <div>
                <div className="font-medium text-text-secondary">Title</div>
                <p>{draft.title}</p>
              </div>
              <div>
                <div className="font-medium text-text-secondary">Description</div>
                <p className="whitespace-pre-wrap">{draft.description}</p>
              </div>
              <div>
                <div className="font-medium text-text-secondary">Keywords</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {draft.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="rounded-full border px-2 py-0.5 text-xs"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-xs text-text-muted">
                Applying overwrites the dataset title, description, and keywords.
                You can review and edit the form afterward.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button onClick={handleApply} disabled={applying}>
              {applying ? "Applying…" : "Apply draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
