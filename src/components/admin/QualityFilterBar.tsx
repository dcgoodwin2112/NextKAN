"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { NativeSelect } from "@/components/ui/native-select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface QualityFilterBarProps {
  organizations: { id: string; name: string }[];
}

export function QualityFilterBar({ organizations }: QualityFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const score = searchParams.get("score") ?? "";
  const org = searchParams.get("org") ?? "";
  const sort = searchParams.get("sort") ?? "";
  const search = searchParams.get("search") ?? "";

  const hasActiveFilters = !!(score || org || sort || search);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `/admin/quality?${qs}` : "/admin/quality");
  }

  function clearFilters() {
    router.push("/admin/quality");
  }

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor="filter-score">Score Range</Label>
        <NativeSelect
          id="filter-score"
          value={score}
          onChange={(e) => updateParam("score", e.target.value)}
        >
          <option value="">All</option>
          <option value="poor">F (0-59)</option>
          <option value="fair">D (60-69)</option>
          <option value="good">B–C (70-89)</option>
          <option value="excellent">A (90-100)</option>
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
          <option value="">Score (lowest first)</option>
          <option value="score_desc">Score (highest first)</option>
          <option value="name_asc">Name A-Z</option>
          <option value="name_desc">Name Z-A</option>
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
