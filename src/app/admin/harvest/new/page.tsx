"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";

interface Organization {
  id: string;
  name: string;
}

export default function NewHarvestSourcePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState("dcat-us");
  const [schedule, setSchedule] = useState("");
  const [organizationId, setOrganizationId] = useState("");

  useEffect(() => {
    async function loadOrgs() {
      try {
        const res = await fetch("/api/organizations");
        if (res.ok) {
          const orgs = await res.json();
          setOrganizations(orgs);
          if (orgs.length > 0) setOrganizationId(orgs[0].id);
        }
      } catch {
        // ignore
      }
    }
    loadOrgs();
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const { createHarvestSource } = await import(
          "@/lib/actions/harvest"
        );
        await createHarvestSource({
          name,
          url,
          type: type as "dcat-us" | "ckan",
          schedule: schedule || undefined,
          organizationId,
          enabled: true,
        });
        router.push("/admin/harvest");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create source");
      }
    });
  }

  let schedulePreview = "";
  if (schedule) {
    try {
      const cronstrue = require("cronstrue");
      schedulePreview = cronstrue.toString(schedule);
    } catch {
      schedulePreview = "Invalid cron expression";
    }
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Harvest", href: "/admin/harvest" },
          { label: "New Source" },
        ]}
      />
      <AdminPageHeader title="New Harvest Source" />
      {error && (
        <div className="mb-4 rounded bg-danger-subtle p-3 text-sm text-danger-text">
          {error}
        </div>
      )}
      <p className="text-sm text-text-muted mb-6">
        Configure a remote catalog to harvest datasets from. The harvester will create new datasets, update existing ones, and archive datasets that are no longer in the source catalog.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="City Open Data Portal"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="url">URL</Label>
          <Input
            id="url"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/data.json"
          />
          <p className="text-xs text-text-muted">Catalog endpoint to harvest from (e.g., https://example.com/data.json for DCAT-US, or CKAN API base URL).</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <NativeSelect
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="dcat-us">DCAT-US</option>
              <option value="ckan">CKAN</option>
            </NativeSelect>
            <p className="text-xs text-text-muted">DCAT-US: fetches a data.json catalog. CKAN: uses the CKAN Action API.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="organizationId">Organization</Label>
            <NativeSelect
              id="organizationId"
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </NativeSelect>
            <p className="text-xs text-text-muted">All harvested datasets will be assigned to this organization.</p>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="schedule">Schedule (cron expression, optional)</Label>
          <Input
            id="schedule"
            type="text"
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
            placeholder="0 2 * * *"
          />
          <p className="text-xs text-text-muted">
            {schedulePreview || "Standard 5-field cron expression (minute hour day month weekday). Leave blank for manual-only harvesting."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Creating..." : "Create Source"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/harvest")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
