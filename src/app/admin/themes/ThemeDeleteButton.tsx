"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteTheme } from "@/lib/actions/themes";
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

interface ThemeDeleteButtonProps {
  themeId: string;
  datasetCount?: number;
}

export function ThemeDeleteButton({ themeId, datasetCount = 0 }: ThemeDeleteButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleDelete() {
    await deleteTheme(themeId);
    router.refresh();
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button
        variant="outline"
        size="xs"
        className="border-danger text-danger hover:bg-danger-subtle"
        onClick={() => setOpen(true)}
      >
        Delete
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete this theme.
            {datasetCount > 0 && (
              <> It is currently used by <strong>{datasetCount}</strong> dataset{datasetCount === 1 ? "" : "s"} — they will be unlinked from this theme.</>
            )}
            {" "}This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleDelete}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
