"use client";

interface FieldDiff {
  field: string;
  from: unknown;
  to: unknown;
}

interface VersionDiffProps {
  diffs: FieldDiff[];
}

function formatValue(value: unknown): string {
  if (value === undefined) return "(none)";
  if (value === null) return "(null)";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

export function VersionDiff({ diffs }: VersionDiffProps) {
  if (diffs.length === 0) {
    return <p className="text-sm text-text-muted">No differences found.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-border bg-surface">
            <th className="text-left px-3 py-2 font-medium text-text-tertiary">
              Field
            </th>
            <th className="text-left px-3 py-2 font-medium text-text-tertiary">
              Before
            </th>
            <th className="text-left px-3 py-2 font-medium text-text-tertiary">
              After
            </th>
          </tr>
        </thead>
        <tbody>
          {diffs.map((diff) => (
            <tr key={diff.field} className="border-b border-border">
              <td className="px-3 py-2 font-medium">{diff.field}</td>
              <td className="px-3 py-2 text-diff-remove-text bg-diff-remove-bg">
                <pre className="whitespace-pre-wrap break-words">
                  {formatValue(diff.from)}
                </pre>
              </td>
              <td className="px-3 py-2 text-diff-add-text bg-diff-add-bg">
                <pre className="whitespace-pre-wrap break-words">
                  {formatValue(diff.to)}
                </pre>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
