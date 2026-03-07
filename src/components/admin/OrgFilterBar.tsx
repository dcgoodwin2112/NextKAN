"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { NativeSelect } from "@/components/ui/native-select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function OrgFilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const sort = searchParams.get("sort") ?? "";
  const search = searchParams.get("search") ?? "";

  const hasActiveFilters = !!(sort || search);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `/admin/organizations?${qs}` : "/admin/organizations");
  }

  function clearFilters() {
    router.push("/admin/organizations");
  }

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor="filter-sort">Sort</Label>
        <NativeSelect
          id="filter-sort"
          value={sort}
          onChange={(e) => updateParam("sort", e.target.value)}
        >
          <option value="">Name A-Z</option>
          <option value="name_desc">Name Z-A</option>
          <option value="created_desc">Created (newest)</option>
          <option value="created_asc">Created (oldest)</option>
          <option value="datasets_desc">Most datasets</option>
          <option value="datasets_asc">Fewest datasets</option>
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
