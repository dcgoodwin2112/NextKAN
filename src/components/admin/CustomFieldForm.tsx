"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { CUSTOM_FIELD_TYPES } from "@/lib/schemas/custom-field";

interface Organization {
  id: string;
  name: string;
}

interface CustomFieldDefinitionData {
  id: string;
  name: string;
  label: string;
  type: string;
  required: boolean;
  options: string | null;
  sortOrder: number;
  organizationId: string | null;
}

interface CustomFieldFormProps {
  initialData?: CustomFieldDefinitionData;
  organizations: Organization[];
  onSubmit: (data: {
    name: string;
    label: string;
    type: string;
    required: boolean;
    options?: string[];
    sortOrder: number;
    organizationId?: string;
  }) => Promise<void>;
}

export function CustomFieldForm({ initialData, organizations, onSubmit }: CustomFieldFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialData?.name || "");
  const [label, setLabel] = useState(initialData?.label || "");
  const [type, setType] = useState(initialData?.type || "text");
  const [required, setRequired] = useState(initialData?.required || false);
  const [sortOrder, setSortOrder] = useState(initialData?.sortOrder ?? 0);
  const [organizationId, setOrganizationId] = useState(initialData?.organizationId || "");
  const [options, setOptions] = useState<string[]>(
    initialData?.options ? JSON.parse(initialData.options) : []
  );
  const [optionInput, setOptionInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const showOptions = type === "select" || type === "multiselect";

  function addOption() {
    const val = optionInput.trim();
    if (val && !options.includes(val)) {
      setOptions([...options, val]);
    }
    setOptionInput("");
  }

  function removeOption(opt: string) {
    setOptions(options.filter((o) => o !== opt));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!label.trim()) {
      setError("Label is required");
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        name,
        label,
        type,
        required,
        options: showOptions && options.length > 0 ? options : undefined,
        sortOrder,
        organizationId: organizationId || undefined,
      });
      // If server action uses redirect(), we won't reach here.
      // If it doesn't redirect, do it client-side.
      router.push("/admin/custom-fields");
      router.refresh();
    } catch (err) {
      // Next.js redirect throws NEXT_REDIRECT — let it propagate
      if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
      {error && (
        <div className="rounded bg-danger-subtle p-3 text-sm text-danger-text" role="alert">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="cf-name">Name *</Label>
        <Input
          id="cf-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. department_code"
          disabled={!!initialData}
        />
        <p className="text-xs text-text-muted">
          Lowercase letters, numbers, underscores. Cannot be changed after creation.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cf-label">Label *</Label>
        <Input
          id="cf-label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Department Code"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cf-type">Type</Label>
        <NativeSelect
          id="cf-type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          disabled={!!initialData}
        >
          {CUSTOM_FIELD_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="cf-required"
          type="checkbox"
          checked={required}
          onChange={(e) => setRequired(e.target.checked)}
        />
        <label htmlFor="cf-required" className="text-sm font-medium">
          Required
        </label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cf-sort">Sort Order</Label>
        <Input
          id="cf-sort"
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(Number(e.target.value))}
        />
      </div>

      {showOptions && (
        <div className="space-y-2">
          <Label>Options</Label>
          <div className="flex gap-2">
            <Input
              value={optionInput}
              onChange={(e) => setOptionInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addOption();
                }
              }}
              placeholder="Type option and press Enter"
            />
            <Button type="button" variant="outline" onClick={addOption}>
              Add
            </Button>
          </div>
          {options.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {options.map((opt) => (
                <span
                  key={opt}
                  className="inline-flex items-center gap-1 rounded bg-surface-alt px-2 py-0.5 text-sm"
                >
                  {opt}
                  <button
                    type="button"
                    onClick={() => removeOption(opt)}
                    className="text-text-muted hover:text-danger"
                    aria-label={`Remove option ${opt}`}
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="cf-org">Organization Scope</Label>
        <NativeSelect
          id="cf-org"
          value={organizationId}
          onChange={(e) => setOrganizationId(e.target.value)}
        >
          <option value="">Global (all datasets)</option>
          {organizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : initialData ? "Update" : "Create"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/admin/custom-fields")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
