export default function OrganizationsLoading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-40 bg-muted rounded" />
        <div className="h-9 w-36 bg-muted rounded" />
      </div>
      <div className="space-y-4 mb-6">
        <div className="max-w-xl">
          <div className="flex gap-2">
            <div className="h-9 flex-1 bg-muted rounded" />
            <div className="h-9 w-20 bg-muted rounded" />
          </div>
        </div>
        <div className="flex gap-4">
          <div className="h-9 w-40 bg-muted rounded" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-lg border p-4 space-y-3">
            <div className="h-5 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
