interface VersionHistoryProps {
  versions: {
    id: string;
    version: string;
    changelog: string | null;
    createdAt: Date | string;
  }[];
}

export function VersionHistory({ versions }: VersionHistoryProps) {
  if (versions.length === 0) {
    return <p className="text-sm text-text-muted">No versions recorded yet.</p>;
  }

  return (
    <ul className="divide-y divide-border border border-border rounded-lg">
      {versions.map((v) => (
        <li key={v.id} className="px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">v{v.version}</span>
            <span className="text-xs text-text-muted">
              {new Date(v.createdAt).toLocaleDateString()}
            </span>
          </div>
          {v.changelog && (
            <p className="text-sm text-text-tertiary mt-1">{v.changelog}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
