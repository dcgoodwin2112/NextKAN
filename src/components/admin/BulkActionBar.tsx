"use client";

import { useState } from "react";
import { X, type LucideIcon } from "lucide-react";
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

export interface BulkAction {
  label: string;
  onClick: () => void;
  variant?: "default" | "destructive";
  icon?: LucideIcon;
  requiresConfirmation?: boolean;
  confirmTitle?: string;
  confirmDescription?: string;
}

interface BulkActionBarProps {
  selectedCount: number;
  onClear: () => void;
  actions: BulkAction[];
  entityName?: string;
}

export function BulkActionBar({
  selectedCount,
  onClear,
  actions,
  entityName = "item",
}: BulkActionBarProps) {
  const [confirmAction, setConfirmAction] = useState<BulkAction | null>(null);

  if (selectedCount === 0) return null;

  const plural = selectedCount === 1 ? entityName : `${entityName}s`;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-surface p-3 shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <span className="text-sm font-medium">
            {selectedCount} {plural} selected
          </span>
          <div className="flex items-center gap-2">
            {actions.map((action) => (
              <Button
                key={action.label}
                variant={action.variant === "destructive" ? "destructive" : "outline"}
                size="sm"
                onClick={() => {
                  if (action.requiresConfirmation) {
                    setConfirmAction(action);
                  } else {
                    action.onClick();
                  }
                }}
              >
                {action.icon && <action.icon />}
                {action.label}
              </Button>
            ))}
            <Button variant="ghost" size="sm" onClick={onClear}>
              <X />
              Clear selection
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.confirmTitle || "Are you sure?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.confirmDescription ||
                `This action will affect ${selectedCount} ${plural}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={confirmAction?.variant === "destructive" ? "destructive" : "default"}
              onClick={() => {
                confirmAction?.onClick();
                setConfirmAction(null);
              }}
            >
              {confirmAction?.label || "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
