"use client";

import { useRouter } from "next/navigation";
import { ConfirmDeleteButton } from "@/components/admin/ConfirmDeleteButton";
import { deleteChart } from "@/lib/actions/charts";

interface ChartDeleteButtonProps {
  chartId: string;
}

export function ChartDeleteButton({ chartId }: ChartDeleteButtonProps) {
  const router = useRouter();

  async function handleDelete() {
    await deleteChart(chartId);
    router.refresh();
  }

  return (
    <ConfirmDeleteButton
      entityName="this chart"
      size="xs"
      onConfirm={handleDelete}
    />
  );
}
