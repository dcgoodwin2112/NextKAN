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
} from "@/components/ui/alert-dialog";

interface ConfirmDeleteButtonProps {
  entityName: string;
  onConfirm: () => void;
  size?: "default" | "sm" | "xs";
  softDelete?: boolean;
}

export function ConfirmDeleteButton({
  entityName,
  onConfirm,
  size = "default",
  softDelete = false,
}: ConfirmDeleteButtonProps) {
  const [open, setOpen] = useState(false);

  const description = softDelete
    ? `This will move ${entityName} to the trash. You can restore it later from the Trash page.`
    : `This will permanently delete ${entityName}. This action cannot be undone.`;

  const actionLabel = softDelete ? "Move to Trash" : "Delete";

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button
        variant="outline"
        size={size}
        className="border-danger text-danger hover:bg-danger-subtle"
        onClick={() => setOpen(true)}
      >
        Delete
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => onConfirm()}
          >
            {actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
