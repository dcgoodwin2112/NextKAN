"use client";

import { ConfirmDeleteButton } from "@/components/admin/ConfirmDeleteButton";

interface OrgDeleteButtonProps {
  onDelete: () => void;
}

export function OrgDeleteButton({ onDelete }: OrgDeleteButtonProps) {
  return (
    <ConfirmDeleteButton entityName="this organization" onConfirm={onDelete} />
  );
}
