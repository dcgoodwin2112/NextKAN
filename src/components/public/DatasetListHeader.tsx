"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { NativeSelect } from "@/components/ui/native-select";

interface DatasetListHeaderProps {
  total: number;
  search?: string;
  hasFilters: boolean;
}

export function DatasetListHeader({
  total,
  search,
  hasFilters,
}: DatasetListHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get("sort") || "modified_desc";

  function handleSortChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", e.target.value);
    params.delete("page");
    router.push(`/datasets?${params.toString()}`);
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
      <p className="text-sm text-text-muted">
        {total} dataset{total !== 1 ? "s" : ""} found
        {search ? ` for "${search}"` : ""}
        {hasFilters ? " (filtered)" : ""}
      </p>
      <div className="flex items-center gap-2">
        <label htmlFor="sort-select" className="text-sm text-text-muted">
          Sort by:
        </label>
        <NativeSelect
          id="sort-select"
          value={currentSort}
          onChange={handleSortChange}
          className="w-40 text-sm"
        >
          <option value="modified_desc">Newest</option>
          <option value="modified_asc">Oldest</option>
          <option value="title_asc">A &rarr; Z</option>
          <option value="title_desc">Z &rarr; A</option>
        </NativeSelect>
      </div>
    </div>
  );
}
