interface Distribution {
  id?: string;
  title?: string | null;
  description?: string | null;
  downloadURL?: string | null;
  accessURL?: string | null;
  mediaType?: string | null;
  format?: string | null;
}

interface DistributionListProps {
  distributions: Distribution[];
  onRemove?: (index: number) => void;
  editable?: boolean;
}

export function DistributionList({
  distributions,
  onRemove,
  editable = false,
}: DistributionListProps) {
  if (distributions.length === 0) {
    return <p className="text-sm text-text-muted">No distributions</p>;
  }

  return (
    <ul className="space-y-2" data-testid="distribution-list">
      {distributions.map((dist, index) => (
        <li
          key={dist.id || index}
          className="flex items-center justify-between rounded border border-border p-3"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">
                {dist.title || `Distribution ${index + 1}`}
              </span>
              {dist.format && (
                <span className="rounded bg-primary-subtle px-2 py-0.5 text-xs text-primary-subtle-text">
                  {dist.format}
                </span>
              )}
            </div>
            {dist.downloadURL && (
              <a
                href={dist.downloadURL}
                className="text-xs text-primary hover:underline truncate block"
                target="_blank"
                rel="noopener noreferrer"
              >
                {dist.downloadURL}
              </a>
            )}
          </div>
          {editable && onRemove && (
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="ml-2 text-danger hover:opacity-80 text-sm"
              aria-label={`Remove distribution ${index + 1}`}
            >
              Remove
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
