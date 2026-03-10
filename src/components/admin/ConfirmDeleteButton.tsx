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
  extraWarning?: string;
  triggerVariant?: "outline" | "ghost";
  triggerLabel?: string;
}

export function ConfirmDeleteButton({
  entityName,
  onConfirm,
  size = "default",
  softDelete = false,
  extraWarning,
  triggerVariant = "outline",
  triggerLabel = "Delete",
}: ConfirmDeleteButtonProps) {
  const [open, setOpen] = useState(false);

  const baseDescription = softDelete
    ? `This will move ${entityName} to the trash. You can restore it later from the Trash page.`
    : `This will permanently delete ${entityName}. This action cannot be undone.`;

  const description = extraWarning
    ? `${baseDescription} ${extraWarning}`
    : baseDescription;

  const actionLabel = softDelete ? "Move to Trash" : triggerLabel;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button
        variant={triggerVariant}
        size={size}
        className={triggerVariant === "ghost"
          ? "text-destructive hover:text-destructive"
          : "border-danger text-danger hover:bg-danger-subtle"}
        onClick={() => setOpen(true)}
      >
        {triggerLabel}
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
