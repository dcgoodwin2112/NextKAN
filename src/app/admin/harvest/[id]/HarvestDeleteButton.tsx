"use client";

import { ConfirmDeleteButton } from "@/components/admin/ConfirmDeleteButton";

interface HarvestDeleteButtonProps {
  onDelete: () => void;
}

export function HarvestDeleteButton({ onDelete }: HarvestDeleteButtonProps) {
  return (
    <ConfirmDeleteButton
      entityName="this harvest source"
      size="sm"
      onConfirm={onDelete}
    />
  );
}
