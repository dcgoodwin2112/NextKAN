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
    return <p className="text-sm text-gray-500">No differences found.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="text-left px-3 py-2 font-medium text-gray-600">
              Field
            </th>
            <th className="text-left px-3 py-2 font-medium text-gray-600">
              Before
            </th>
            <th className="text-left px-3 py-2 font-medium text-gray-600">
              After
            </th>
          </tr>
        </thead>
        <tbody>
          {diffs.map((diff) => (
            <tr key={diff.field} className="border-b">
              <td className="px-3 py-2 font-medium">{diff.field}</td>
              <td className="px-3 py-2 text-red-700 bg-red-50">
                <pre className="whitespace-pre-wrap break-words">
                  {formatValue(diff.from)}
                </pre>
              </td>
              <td className="px-3 py-2 text-green-700 bg-green-50">
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
