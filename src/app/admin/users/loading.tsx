export default function UsersLoading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-40 bg-muted rounded" />
      </div>
      <div className="space-y-4 mb-6">
        <div className="max-w-xl">
          <div className="flex gap-2">
            <div className="h-9 flex-1 bg-muted rounded" />
            <div className="h-9 w-20 bg-muted rounded" />
          </div>
        </div>
        <div className="flex gap-4">
          <div className="h-9 w-32 bg-muted rounded" />
          <div className="h-9 w-40 bg-muted rounded" />
          <div className="h-9 w-40 bg-muted rounded" />
        </div>
      </div>
      <div className="border rounded-lg overflow-hidden">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="flex gap-4 p-3 border-b last:border-b-0">
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="h-4 bg-muted rounded w-1/5" />
            <div className="h-4 bg-muted rounded w-1/6" />
            <div className="h-4 bg-muted rounded w-1/5" />
            <div className="h-4 bg-muted rounded w-1/6" />
          </div>
        ))}
      </div>
    </div>
  );
}
