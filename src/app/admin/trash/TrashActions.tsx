"use client";

import { useRouter } from "next/navigation";
import { restoreDataset, purgeDataset } from "@/lib/actions/datasets";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { toast } from "sonner";

interface TrashActionsProps {
  datasetId: string;
  datasetTitle: string;
}

export function TrashActions({ datasetId, datasetTitle }: TrashActionsProps) {
  const router = useRouter();
  const [purgeOpen, setPurgeOpen] = useState(false);

  async function handleRestore() {
    try {
      await restoreDataset(datasetId);
      toast.success(`"${datasetTitle}" restored`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to restore");
    }
  }

  async function handlePurge() {
    try {
      await purgeDataset(datasetId);
      toast.success(`"${datasetTitle}" permanently deleted`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete");
    }
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={handleRestore}>
        Restore
      </Button>
      <AlertDialog open={purgeOpen} onOpenChange={setPurgeOpen}>
        <Button
          variant="outline"
          size="sm"
          className="border-danger text-danger hover:bg-danger-subtle"
          onClick={() => setPurgeOpen(true)}
        >
          Purge
        </Button>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{datasetTitle}&quot; and all
              related data (distributions, versions, comments). This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handlePurge}>
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
