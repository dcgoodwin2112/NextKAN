"use client";

import { useRouter } from "next/navigation";
import { ConfirmDeleteButton } from "@/components/admin/ConfirmDeleteButton";
import { deleteLicense } from "@/lib/actions/licenses";

interface LicenseDeleteButtonProps {
  licenseId: string;
}

export function LicenseDeleteButton({ licenseId }: LicenseDeleteButtonProps) {
  const router = useRouter();

  async function handleDelete() {
    await deleteLicense(licenseId);
    router.refresh();
  }

  return (
    <ConfirmDeleteButton
      entityName="this license"
      size="xs"
      onConfirm={handleDelete}
    />
  );
}
