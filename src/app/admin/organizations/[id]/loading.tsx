export default function OrgDashboardLoading() {
  return (
    <div className="animate-pulse">
      {/* Breadcrumbs */}
      <div className="h-4 w-64 bg-muted rounded mb-4" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-9 w-36 bg-muted rounded" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded border p-6">
            <div className="h-4 w-20 bg-muted rounded mb-2" />
            <div className="h-7 w-16 bg-muted rounded" />
          </div>
        ))}
      </div>

      {/* Members table */}
      <div className="h-6 w-24 bg-muted rounded mb-3" />
      <div className="rounded border overflow-hidden mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="px-4 py-3 border-b">
            <div className="h-4 w-full bg-muted rounded" />
          </div>
        ))}
      </div>

      {/* Datasets table */}
      <div className="h-6 w-20 bg-muted rounded mb-3" />
      <div className="rounded border overflow-hidden mb-8">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="px-4 py-3 border-b">
            <div className="h-4 w-full bg-muted rounded" />
          </div>
        ))}
      </div>

      {/* Activity */}
      <div className="h-6 w-32 bg-muted rounded mb-3" />
      <div className="rounded border p-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-4 w-full bg-muted rounded mb-3" />
        ))}
      </div>
    </div>
  );
}
