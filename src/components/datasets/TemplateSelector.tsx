"use client";

import { NativeSelect } from "@/components/ui/native-select";
import { Label } from "@/components/ui/label";
import type { TemplateFields } from "@/lib/schemas/template";

interface TemplateOption {
  id: string;
  name: string;
  description: string | null;
  fields: TemplateFields;
  organization: { name: string } | null;
}

interface TemplateSelectorProps {
  templates: TemplateOption[];
  onSelect: (fields: TemplateFields | null) => void;
}

export function TemplateSelector({ templates, onSelect }: TemplateSelectorProps) {
  if (templates.length === 0) return null;

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    if (!id) {
      onSelect(null);
      return;
    }
    const tpl = templates.find((t) => t.id === id);
    if (tpl) {
      onSelect(tpl.fields);
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="template-selector">Apply Template</Label>
      <NativeSelect id="template-selector" onChange={handleChange} defaultValue="">
        <option value="">No template</option>
        {templates.map((tpl) => (
          <option key={tpl.id} value={tpl.id}>
            {tpl.name}
            {tpl.organization ? ` (${tpl.organization.name})` : " (Global)"}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}
