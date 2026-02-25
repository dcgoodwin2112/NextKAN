export default function AdminDashboardLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-40 bg-muted rounded mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-lg border p-6">
            <div className="h-4 w-20 bg-muted rounded mb-2" />
            <div className="h-8 w-16 bg-muted rounded" />
          </div>
        ))}
      </div>
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
