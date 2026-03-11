export default function DatasetsLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 animate-pulse">
      {/* Breadcrumbs */}
      <div className="h-4 w-32 bg-muted rounded mb-6" />

      <div className="h-9 w-40 bg-muted rounded mb-6" />

      {/* Search bar */}
      <div className="h-10 w-full max-w-xl bg-muted rounded mb-6" />

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="md:w-[280px] shrink-0 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <div className="h-5 w-24 bg-muted rounded mb-2" />
              <div className="space-y-1">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-7 bg-muted rounded" />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Card grid */}
        <div className="flex-1">
          <div className="h-5 w-36 bg-muted rounded mb-4" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-lg border p-4 space-y-2">
                <div className="h-4 w-3/4 bg-muted rounded" />
                <div className="h-3 w-full bg-muted rounded" />
                <div className="h-3 w-1/2 bg-muted rounded" />
                <div className="flex gap-1">
                  <div className="h-4 w-10 bg-muted rounded" />
                  <div className="h-4 w-10 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
