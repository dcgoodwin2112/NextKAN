import { notFound } from "next/navigation";
import Link from "next/link";
import { getSeriesBySlug } from "@/lib/actions/series";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function SeriesDetailPage({ params }: Props) {
  const { slug } = await params;
  const series = await getSeriesBySlug(slug);
  if (!series) notFound();

  const publishedDatasets = series.datasets
    .filter((d) => d.status === "published")
    .sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">{series.title}</h1>
      {series.description && (
        <p className="text-gray-700 mb-6">{series.description}</p>
      )}
      <p className="text-sm text-gray-500 mb-6">
        Identifier: {series.identifier}
      </p>

      <h2 className="text-lg font-semibold mb-4">
        Datasets ({publishedDatasets.length})
      </h2>
      {publishedDatasets.length === 0 ? (
        <p className="text-gray-500">No published datasets in this series.</p>
      ) : (
        <ul className="space-y-3">
          {publishedDatasets.map((d) => (
            <li key={d.id} className="rounded border p-4">
              <Link
                href={`/datasets/${d.slug}`}
                className="text-lg font-medium text-blue-600 hover:underline"
              >
                {d.title}
              </Link>
              <p className="text-sm text-gray-500 mt-1">
                {d.publisher.name} &middot; Modified{" "}
                {new Date(d.modified).toLocaleDateString()}
                {d.version && <> &middot; v{d.version}</>}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
