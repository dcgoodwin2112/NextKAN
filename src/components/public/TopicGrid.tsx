import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

interface TopicItem {
  id: string;
  name: string;
  slug: string;
  color?: string | null;
  datasetCount: number;
}

interface TopicGridProps {
  topics: TopicItem[];
}

export function TopicGrid({ topics }: TopicGridProps) {
  if (topics.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-3xl font-semibold">Topics</h2>
        <Link
          href="/themes"
          className="text-base text-primary hover:underline font-medium"
        >
          View all
        </Link>
      </div>
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {topics.map((topic) => (
          <Link key={topic.id} href={`/datasets?theme=${topic.slug}`}>
            <Card className="hover:shadow-md transition-shadow py-4 h-full">
              <CardContent className="flex items-center gap-3 px-4 py-0">
                <span
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: topic.color || "#3b82f6" }}
                />
                <div className="min-w-0">
                  <p className="font-medium text-base truncate">{topic.name}</p>
                  <p className="text-sm text-text-muted">
                    {topic.datasetCount} dataset{topic.datasetCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
