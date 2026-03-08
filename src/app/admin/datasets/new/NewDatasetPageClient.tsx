"use client";

import { useState } from "react";
import { DatasetForm } from "@/components/datasets/DatasetForm";
import { TemplateSelector } from "@/components/datasets/TemplateSelector";
import type { DatasetCreateInput } from "@/lib/schemas/dataset";
import type { TemplateFields } from "@/lib/schemas/template";

interface Distribution {
  title?: string | null;
  downloadURL?: string | null;
  accessURL?: string | null;
  mediaType?: string | null;
  format?: string | null;
}

interface Organization {
  id: string;
  name: string;
}

interface ThemeOption {
  id: string;
  name: string;
}

interface TemplateOption {
  id: string;
  name: string;
  description: string | null;
  fields: TemplateFields;
  organization: { name: string } | null;
}

interface SeriesOption {
  id: string;
  title: string;
}

interface CustomFieldDef {
  id: string;
  name: string;
  label: string;
  type: string;
  required: boolean;
  options: string[] | null;
  sortOrder: number;
}

interface LicenseOption {
  id: string;
  name: string;
  url: string | null;
}

interface NewDatasetPageClientProps {
  organizations: Organization[];
  themes: ThemeOption[];
  templates: TemplateOption[];
  licenses?: LicenseOption[];
  customFieldDefinitions?: CustomFieldDef[];
  series?: SeriesOption[];
  onSubmit: (data: DatasetCreateInput & { distributions?: Distribution[]; customFields?: Record<string, string> }) => Promise<void>;
}

export function NewDatasetPageClient({
  organizations,
  themes,
  templates,
  licenses,
  customFieldDefinitions,
  series,
  onSubmit,
}: NewDatasetPageClientProps) {
  const [templateFields, setTemplateFields] = useState<Partial<TemplateFields> | null>(null);
  const [formKey, setFormKey] = useState(0);

  function handleTemplateSelect(fields: TemplateFields | null) {
    setTemplateFields(fields);
    setFormKey((k) => k + 1);
  }

  return (
    <div className="space-y-6">
      {templates.length > 0 && (
        <div className="max-w-3xl">
          <TemplateSelector templates={templates} onSelect={handleTemplateSelect} />
        </div>
      )}
      <DatasetForm
        key={formKey}
        defaultValues={templateFields || undefined}
        organizations={organizations}
        themes={themes}
        licenses={licenses}
        customFieldDefinitions={customFieldDefinitions}
        series={series}
        onSubmit={onSubmit}
      />
    </div>
  );
}
