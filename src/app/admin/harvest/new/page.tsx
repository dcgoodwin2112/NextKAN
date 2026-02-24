"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

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
      <h1 className="text-2xl font-bold mb-6">New Harvest Source</h1>
      {error && (
        <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
            placeholder="City Open Data Portal"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            URL
          </label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
            placeholder="https://example.com/data.json"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
            >
              <option value="dcat-us">DCAT-US</option>
              <option value="ckan">CKAN</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Organization
            </label>
            <select
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Schedule (cron expression, optional)
          </label>
          <input
            type="text"
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
            placeholder="0 2 * * *"
          />
          {schedulePreview && (
            <p className="mt-1 text-xs text-gray-500">{schedulePreview}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? "Creating..." : "Create Source"}
        </button>
      </form>
    </div>
  );
}
