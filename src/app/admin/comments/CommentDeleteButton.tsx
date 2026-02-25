"use client";

import { ConfirmDeleteButton } from "@/components/admin/ConfirmDeleteButton";

interface CommentDeleteButtonProps {
  commentId: string;
  onDelete: (id: string) => void;
}

export function CommentDeleteButton({ commentId, onDelete }: CommentDeleteButtonProps) {
  return (
    <ConfirmDeleteButton
      entityName="this comment"
      size="xs"
      onConfirm={() => onDelete(commentId)}
    />
  );
}
