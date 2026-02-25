export default function ActivityLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6">
        <div className="h-8 w-36 bg-muted rounded" />
        <div className="h-4 w-48 bg-muted rounded mt-2" />
      </div>
      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-9 w-36 bg-muted rounded" />
        ))}
      </div>
      {/* Table */}
      <div className="rounded border overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30">
          <div className="flex gap-8">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-4 w-20 bg-muted rounded" />
            ))}
          </div>
        </div>
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="px-4 py-3 border-b">
            <div className="flex gap-8">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-4 w-20 bg-muted rounded" />
              <div className="h-4 w-28 bg-muted rounded" />
              <div className="h-4 w-32 bg-muted rounded" />
              <div className="h-4 w-24 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
