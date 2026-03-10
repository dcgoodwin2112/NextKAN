"use client";

import { ConfirmDeleteButton } from "@/components/admin/ConfirmDeleteButton";

interface CustomFieldDeleteButtonProps {
  id: string;
  label: string;
  valueCount?: number;
  onDelete: (id: string) => Promise<void>;
}

export function CustomFieldDeleteButton({ id, label, valueCount = 0, onDelete }: CustomFieldDeleteButtonProps) {
  const extraWarning = valueCount > 0
    ? `This will also delete ${valueCount} stored value${valueCount === 1 ? "" : "s"} across datasets.`
    : undefined;

  return (
    <ConfirmDeleteButton
      entityName={`the custom field "${label}"`}
      onConfirm={() => onDelete(id)}
      size="sm"
      extraWarning={extraWarning}
    />
  );
}
