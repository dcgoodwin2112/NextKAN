interface MetadataItem {
  label: string;
  value: React.ReactNode;
}

interface DatasetMetadataProps {
  dataset: {
    accessLevel?: string;
    contactName?: string | null;
    contactEmail?: string | null;
    license?: string | null;
    accrualPeriodicity?: string | null;
    temporal?: string | null;
    spatial?: string | null;
    issued?: string | Date | null;
    modified: Date;
  };
  customFields?: {
    label: string;
    value: string;
    type: string;
  }[];
}

export function DatasetMetadata({ dataset, customFields = [] }: DatasetMetadataProps) {
  const items: MetadataItem[] = [];

  if (dataset.accessLevel) {
    items.push({ label: "Access Level", value: dataset.accessLevel });
  }
  if (dataset.contactName) {
    items.push({
      label: "Contact",
      value: dataset.contactEmail
        ? `${dataset.contactName} (${dataset.contactEmail})`
        : dataset.contactName,
    });
  }
  if (dataset.license) {
    items.push({ label: "License", value: dataset.license });
  }
  if (dataset.accrualPeriodicity) {
    items.push({ label: "Update Frequency", value: dataset.accrualPeriodicity });
  }
  if (dataset.temporal) {
    items.push({ label: "Temporal Coverage", value: dataset.temporal });
  }
  if (dataset.spatial) {
    items.push({ label: "Spatial Coverage", value: dataset.spatial });
  }
  if (dataset.issued) {
    items.push({
      label: "Release Date",
      value: new Date(dataset.issued).toLocaleDateString(),
    });
  }
  items.push({
    label: "Last Modified",
    value: new Date(dataset.modified).toLocaleDateString(),
  });

  for (const cf of customFields) {
    let displayValue: React.ReactNode = cf.value;
    if (cf.type === "boolean") {
      displayValue = cf.value === "true" ? "Yes" : "No";
    } else if (cf.type === "multiselect") {
      try {
        displayValue = JSON.parse(cf.value).join(", ");
      } catch {
        displayValue = cf.value;
      }
    } else if (cf.type === "url") {
      displayValue = (
        <a
          href={cf.value}
          className="text-primary hover:underline break-all"
          target="_blank"
          rel="noopener noreferrer"
        >
          {cf.value}
        </a>
      );
    }
    items.push({ label: cf.label, value: displayValue });
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider mb-3 text-text-muted">
        Metadata
      </h2>
      <dl className="space-y-3 text-sm">
        {items.map((item) => (
          <div key={item.label}>
            <dt className="text-text-muted text-xs font-medium">{item.label}</dt>
            <dd className="mt-0.5">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
