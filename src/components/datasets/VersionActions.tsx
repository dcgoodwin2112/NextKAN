"use client";

import { useState } from "react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface VersionActionsProps {
  versionLabel: string;
  onRevert: () => Promise<void>;
  onCompare: () => Promise<void>;
}

export function VersionActions({
  versionLabel,
  onRevert,
  onCompare,
}: VersionActionsProps) {
  const [comparing, setComparing] = useState(false);
  const [reverting, setReverting] = useState(false);

  async function handleCompare() {
    setComparing(true);
    try {
      await onCompare();
    } finally {
      setComparing(false);
    }
  }

  async function handleRevert() {
    setReverting(true);
    try {
      await onRevert();
    } finally {
      setReverting(false);
    }
  }

  return (
    <div className="flex gap-3">
      <Button variant="outline" onClick={handleCompare} disabled={comparing}>
        {comparing ? "Comparing..." : "Compare with Current"}
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline">Revert to this version</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert to v{versionLabel}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore the dataset&apos;s metadata (title, description,
              keywords, themes, and other fields) to the state captured in v
              {versionLabel}. Distributions, datastore tables, and data
              dictionaries will not be changed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevert} disabled={reverting}>
              {reverting ? "Reverting..." : "Revert"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
