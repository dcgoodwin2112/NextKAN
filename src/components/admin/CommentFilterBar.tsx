"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { NativeSelect } from "@/components/ui/native-select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function CommentFilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const status = searchParams.get("status") ?? "";
  const sort = searchParams.get("sort") ?? "";
  const search = searchParams.get("search") ?? "";

  const hasActiveFilters = !!(status || sort || search);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `/admin/comments?${qs}` : "/admin/comments");
  }

  function clearFilters() {
    router.push("/admin/comments");
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
          <option value="">Pending</option>
          <option value="approved">Approved</option>
          <option value="all">All</option>
        </NativeSelect>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="filter-sort">Sort</Label>
        <NativeSelect
          id="filter-sort"
          value={sort}
          onChange={(e) => updateParam("sort", e.target.value)}
        >
          <option value="">Newest first</option>
          <option value="created_asc">Oldest first</option>
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
