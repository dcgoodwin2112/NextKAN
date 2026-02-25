import Link from "next/link";

interface VersionHistoryProps {
  datasetId: string;
  versions: {
    id: string;
    version: string;
    changelog: string | null;
    createdAt: Date | string;
  }[];
  isAdmin?: boolean;
}

export function VersionHistory({
  datasetId,
  versions,
  isAdmin = false,
}: VersionHistoryProps) {
  if (versions.length === 0) {
    return (
      <p className="text-sm text-text-muted">No versions recorded yet.</p>
    );
  }

  return (
    <ul className="divide-y divide-border border border-border rounded-lg">
      {versions.map((v) => {
        const content = (
          <>
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">v{v.version}</span>
              <span className="text-xs text-text-muted">
                {new Date(v.createdAt).toLocaleDateString()}
              </span>
            </div>
            {v.changelog && (
              <p className="text-sm text-text-tertiary mt-1">{v.changelog}</p>
            )}
          </>
        );

        if (isAdmin) {
          return (
            <li key={v.id}>
              <Link
                href={`/admin/datasets/${datasetId}/versions/${v.id}`}
                className="block px-4 py-3 hover:bg-surface-alt transition-colors"
              >
                {content}
              </Link>
            </li>
          );
        }

        return (
          <li key={v.id} className="px-4 py-3">
            {content}
          </li>
        );
      })}
    </ul>
  );
}
