import { Database, Building2, FileDown, FileType } from "lucide-react";
import type { CatalogStats } from "@/lib/services/discovery";

interface StatsBarProps {
  stats: CatalogStats;
}

const statItems = [
  { key: "datasets" as const, label: "Datasets", icon: Database },
  { key: "organizations" as const, label: "Organizations", icon: Building2 },
  { key: "distributions" as const, label: "Resources", icon: FileDown },
  { key: "formats" as const, label: "Formats", icon: FileType },
];

export function StatsBar({ stats }: StatsBarProps) {
  return (
    <section className="bg-surface-alt rounded-lg py-6 px-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        {statItems.map(({ key, label, icon: Icon }) => (
          <div key={key} className="flex flex-col items-center gap-1">
            <Icon className="h-5 w-5 text-primary mb-1" />
            <span className="text-2xl font-bold">
              {stats[key].toLocaleString()}
            </span>
            <span className="text-sm text-text-muted">{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
