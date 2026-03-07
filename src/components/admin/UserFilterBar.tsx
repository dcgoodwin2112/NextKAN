"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { NativeSelect } from "@/components/ui/native-select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface UserFilterBarProps {
  organizations: { id: string; name: string }[];
}

export function UserFilterBar({ organizations }: UserFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const role = searchParams.get("role") ?? "";
  const org = searchParams.get("org") ?? "";
  const sort = searchParams.get("sort") ?? "";
  const search = searchParams.get("search") ?? "";

  const hasActiveFilters = !!(role || org || sort || search);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `/admin/users?${qs}` : "/admin/users");
  }

  function clearFilters() {
    router.push("/admin/users");
  }

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor="filter-role">Role</Label>
        <NativeSelect
          id="filter-role"
          value={role}
          onChange={(e) => updateParam("role", e.target.value)}
        >
          <option value="">All</option>
          <option value="admin">Admin</option>
          <option value="orgAdmin">Org Admin</option>
          <option value="editor">Editor</option>
          <option value="viewer">Viewer</option>
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
          <option value="">Created (newest)</option>
          <option value="created_asc">Created (oldest)</option>
          <option value="name_asc">Name A-Z</option>
          <option value="name_desc">Name Z-A</option>
          <option value="email_asc">Email A-Z</option>
          <option value="email_desc">Email Z-A</option>
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
