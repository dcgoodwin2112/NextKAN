"use client";

import { ConfirmDeleteButton } from "@/components/admin/ConfirmDeleteButton";

interface SeriesDeleteButtonProps {
  onDelete: () => void;
}

export function SeriesDeleteButton({ onDelete }: SeriesDeleteButtonProps) {
  return (
    <ConfirmDeleteButton entityName="this series" onConfirm={onDelete} />
  );
}
