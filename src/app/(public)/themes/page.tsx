import Link from "next/link";
import { listThemes } from "@/lib/actions/themes";

export const metadata = {
  title: "Themes",
  description: "Browse datasets by theme",
};

export default async function ThemesPage() {
  const themes = await listThemes();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Themes</h1>
      <p className="text-text-tertiary mb-8">Browse datasets organized by topic.</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {themes.map((theme) => (
          <Link
            key={theme.id}
            href={`/datasets?theme=${theme.slug}`}
            className="block rounded-lg border p-4 hover:border-primary hover:shadow-sm transition-colors"
          >
            <div className="flex items-center gap-3 mb-2">
              {theme.color && (
                <span
                  className="inline-block w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: theme.color }}
                />
              )}
              <h2 className="font-semibold">{theme.name}</h2>
            </div>
            {theme.description && (
              <p className="text-sm text-text-muted mb-2">{theme.description}</p>
            )}
            <p className="text-xs text-text-muted">
              {theme._count.datasets} dataset{theme._count.datasets !== 1 ? "s" : ""}
            </p>
          </Link>
        ))}
      </div>

      {themes.length === 0 && (
        <p className="text-text-muted">No themes defined yet.</p>
      )}
    </div>
  );
}
