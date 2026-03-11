import type { Metadata } from "next";
import { listThemes } from "@/lib/actions/themes";
import { siteConfig } from "@/lib/config";
import { PublicBreadcrumbs } from "@/components/public/PublicBreadcrumbs";
import { PublicThemeCard } from "@/components/public/PublicThemeCard";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `Themes | ${siteConfig.name}`,
    description: "Browse datasets by theme",
  };
}

export default async function ThemesPage() {
  const themes = await listThemes();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <PublicBreadcrumbs
        items={[{ label: "Home", href: "/" }, { label: "Themes" }]}
      />

      <h1 className="text-3xl font-bold mb-2">Themes</h1>
      <p className="text-text-muted mb-8">Browse datasets organized by topic.</p>

      {themes.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {themes.map((theme) => (
            <PublicThemeCard
              key={theme.id}
              theme={{
                id: theme.id,
                name: theme.name,
                slug: theme.slug,
                color: theme.color,
                description: theme.description,
                datasetCount: theme._count.datasets,
              }}
            />
          ))}
        </div>
      ) : (
        <p className="text-text-muted">No themes defined yet.</p>
      )}
    </div>
  );
}
