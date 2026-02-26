"use client";

import { useRouter } from "next/navigation";
import { ConfirmDeleteButton } from "@/components/admin/ConfirmDeleteButton";
import { deleteTemplate } from "@/lib/actions/templates";

interface TemplateDeleteButtonProps {
  templateId: string;
}

export function TemplateDeleteButton({ templateId }: TemplateDeleteButtonProps) {
  const router = useRouter();

  async function handleDelete() {
    await deleteTemplate(templateId);
    router.refresh();
  }

  return (
    <ConfirmDeleteButton
      entityName="this template"
      size="xs"
      onConfirm={handleDelete}
    />
  );
}
