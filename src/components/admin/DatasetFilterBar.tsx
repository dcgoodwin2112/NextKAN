"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { NativeSelect } from "@/components/ui/native-select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface DatasetFilterBarProps {
  organizations: { id: string; name: string }[];
}

export function DatasetFilterBar({ organizations }: DatasetFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const status = searchParams.get("status") ?? "";
  const org = searchParams.get("org") ?? "";
  const sort = searchParams.get("sort") ?? "";
  const search = searchParams.get("search") ?? "";

  const hasActiveFilters = !!(status || org || sort || search);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `/admin/datasets?${qs}` : "/admin/datasets");
  }

  function clearFilters() {
    router.push("/admin/datasets");
  }

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor="filter-status">Status</Label>
        <NativeSelect
          id="filter-status"
          value={status}
          onChange={(e) => updateParam("status", e.target.value)}
        >
          <option value="">All</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </NativeSelect>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="filter-org">Organization</Label>
        <NativeSelect
          id="filter-org"
          value={org}
          onChange={(e) => updateParam("org", e.target.value)}
        >
          <option value="">All</option>
          {organizations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="filter-sort">Sort</Label>
        <NativeSelect
          id="filter-sort"
          value={sort}
          onChange={(e) => updateParam("sort", e.target.value)}
        >
          <option value="">Modified (newest)</option>
          <option value="modified_asc">Modified (oldest)</option>
          <option value="title_asc">Title A-Z</option>
          <option value="title_desc">Title Z-A</option>
          <option value="created_desc">Created (newest)</option>
          <option value="created_asc">Created (oldest)</option>
        </NativeSelect>
      </div>

      {hasActiveFilters && (
        <Button variant="outline" onClick={clearFilters}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
