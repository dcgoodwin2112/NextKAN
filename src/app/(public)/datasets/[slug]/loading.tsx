export default function DatasetDetailLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 animate-pulse">
      {/* Breadcrumbs */}
      <div className="h-4 w-48 bg-muted rounded mb-6" />

      {/* Header */}
      <div className="mb-6">
        <div className="h-9 w-2/3 bg-muted rounded mb-3" />
        <div className="flex gap-2">
          <div className="h-5 w-32 bg-muted rounded" />
          <div className="h-5 w-20 bg-muted rounded" />
          <div className="h-5 w-28 bg-muted rounded" />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Main content */}
        <div className="flex-1 space-y-6">
          {/* Tabs */}
          <div className="flex gap-4 border-b pb-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-5 w-20 bg-muted rounded" />
            ))}
          </div>

          {/* Resource cards */}
          {[1, 2].map((i) => (
            <div key={i} className="rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="h-5 w-12 bg-muted rounded" />
                <div className="h-4 w-48 bg-muted rounded" />
              </div>
            </div>
          ))}

          {/* Description */}
          <div className="space-y-2">
            <div className="h-4 w-full bg-muted rounded" />
            <div className="h-4 w-full bg-muted rounded" />
            <div className="h-4 w-3/4 bg-muted rounded" />
          </div>
        </div>

        {/* Sidebar */}
        <div className="md:w-[300px] shrink-0">
          <div className="rounded-lg border p-4 space-y-4">
            <div className="h-4 w-20 bg-muted rounded" />
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i}>
                <div className="h-3 w-24 bg-muted rounded mb-1" />
                <div className="h-4 w-36 bg-muted rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
