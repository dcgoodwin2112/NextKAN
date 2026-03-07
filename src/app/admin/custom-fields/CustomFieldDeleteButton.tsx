"use client";

import { ConfirmDeleteButton } from "@/components/admin/ConfirmDeleteButton";

interface CustomFieldDeleteButtonProps {
  id: string;
  label: string;
  onDelete: (id: string) => Promise<void>;
}

export function CustomFieldDeleteButton({ id, label, onDelete }: CustomFieldDeleteButtonProps) {
  return (
    <ConfirmDeleteButton
      entityName={`custom field "${label}"`}
      onConfirm={() => onDelete(id)}
      size="sm"
    />
  );
}
