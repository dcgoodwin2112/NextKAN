export default function AdminDashboardLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-40 bg-muted rounded mb-6" />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg border p-6">
            <div className="h-4 w-24 bg-muted rounded mb-2" />
            <div className="h-8 w-16 bg-muted rounded" />
          </div>
        ))}
      </div>

      {/* Action items */}
      <div className="mt-8">
        <div className="h-6 w-36 bg-muted rounded mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-lg border p-6">
              <div className="h-5 w-32 bg-muted rounded mb-3" />
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Catalog health */}
      <div className="mt-8">
        <div className="h-6 w-32 bg-muted rounded mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-lg border p-6">
              <div className="h-5 w-28 bg-muted rounded mb-2" />
              <div className="h-8 w-12 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="mt-8">
        <div className="h-6 w-20 bg-muted rounded mb-4" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-lg border p-6">
              <div className="h-5 w-32 bg-muted rounded mb-3" />
              <div className="h-[250px] bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Activity */}
      <div className="mt-8">
        <div className="h-6 w-36 bg-muted rounded mb-4" />
        <div className="rounded-lg border p-6 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-4 bg-muted rounded w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
