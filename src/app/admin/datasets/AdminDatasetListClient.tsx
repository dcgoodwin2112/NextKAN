"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSelection } from "@/hooks/useSelection";
import { DatasetTable } from "@/components/datasets/DatasetTable";
import { DatasetCard } from "@/components/datasets/DatasetCard";
import { BulkActionBar, type BulkAction } from "@/components/admin/BulkActionBar";
import { NativeSelect } from "@/components/ui/native-select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { bulkUpdateDatasets, bulkDeleteDatasets } from "@/lib/actions/datasets";

interface Dataset {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: string;
  modified: Date;
  publisher: { name: string };
  keywords: { keyword: string }[];
  distributions: { format?: string | null }[];
}

interface AdminDatasetListClientProps {
  datasets: Dataset[];
  organizations: { id: string; name: string }[];
  view: "grid" | "list";
}

export function AdminDatasetListClient({
  datasets,
  organizations,
  view,
}: AdminDatasetListClientProps) {
  const router = useRouter();
  const allIds = datasets.map((d) => d.id);
  const selection = useSelection(allIds);
  const [orgDialogOpen, setOrgDialogOpen] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState("");

  async function handleBulkStatus(status: "published" | "draft" | "archived") {
    const result = await bulkUpdateDatasets(selection.ids, { status });
    if (result.errors.length > 0) {
      toast.error(`${result.success} updated, ${result.errors.length} failed`);
    } else {
      toast.success(`${result.success} dataset${result.success !== 1 ? "s" : ""} updated`);
    }
    selection.clear();
    router.refresh();
  }

  async function handleBulkDelete() {
    const result = await bulkDeleteDatasets(selection.ids);
    if (result.errors.length > 0) {
      toast.error(`${result.success} deleted, errors: ${result.errors.join(", ")}`);
    } else {
      toast.success(`${result.success} dataset${result.success !== 1 ? "s" : ""} moved to trash`);
    }
    selection.clear();
    router.refresh();
  }

  async function handleChangeOrg() {
    if (!selectedOrgId) return;
    const result = await bulkUpdateDatasets(selection.ids, { publisherId: selectedOrgId });
    if (result.errors.length > 0) {
      toast.error(`${result.success} updated, ${result.errors.length} failed`);
    } else {
      toast.success(`${result.success} dataset${result.success !== 1 ? "s" : ""} updated`);
    }
    setOrgDialogOpen(false);
    setSelectedOrgId("");
    selection.clear();
    router.refresh();
  }

  const actions: BulkAction[] = [
    { label: "Publish", onClick: () => handleBulkStatus("published") },
    { label: "Unpublish", onClick: () => handleBulkStatus("draft") },
    { label: "Change Organization", onClick: () => setOrgDialogOpen(true) },
    {
      label: "Delete",
      onClick: handleBulkDelete,
      variant: "destructive",
      requiresConfirmation: true,
      confirmTitle: "Move to trash?",
      confirmDescription: `This will move ${selection.count} dataset${selection.count !== 1 ? "s" : ""} to the trash. You can restore them later.`,
    },
  ];

  return (
    <>
      {view === "list" ? (
        <DatasetTable
          datasets={datasets}
          selectable
          selectedIds={selection.selectedIds}
          onToggle={selection.toggle}
          onSelectAll={selection.toggleAll}
          isAllSelected={selection.isAllSelected}
          isIndeterminate={selection.isIndeterminate}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {datasets.map((dataset) => (
            <DatasetCard
              key={dataset.id}
              dataset={dataset}
              adminView
              selectable
              selected={selection.isSelected(dataset.id)}
              onToggle={selection.toggle}
            />
          ))}
        </div>
      )}

      <BulkActionBar
        selectedCount={selection.count}
        onClear={selection.clear}
        actions={actions}
        entityName="dataset"
      />

      <AlertDialog open={orgDialogOpen} onOpenChange={setOrgDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Organization</AlertDialogTitle>
            <AlertDialogDescription>
              Select the organization for {selection.count} dataset{selection.count !== 1 ? "s" : ""}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="bulk-org-select">Organization</Label>
            <NativeSelect
              id="bulk-org-select"
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
            >
              <option value="">Select organization...</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </NativeSelect>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleChangeOrg} disabled={!selectedOrgId}>
              Update
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
