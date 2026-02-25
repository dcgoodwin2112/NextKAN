"use client";

import { ConfirmDeleteButton } from "@/components/admin/ConfirmDeleteButton";

interface DatasetDeleteButtonProps {
  onDelete: () => void;
}

export function DatasetDeleteButton({ onDelete }: DatasetDeleteButtonProps) {
  return (
    <ConfirmDeleteButton entityName="this dataset" onConfirm={onDelete} />
  );
}
