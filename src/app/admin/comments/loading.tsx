export default function CommentsLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-48 bg-muted rounded mb-6" />
      <div className="space-y-4 mb-6">
        <div className="max-w-xl">
          <div className="flex gap-2">
            <div className="h-9 flex-1 bg-muted rounded" />
            <div className="h-9 w-20 bg-muted rounded" />
          </div>
        </div>
        <div className="flex gap-4">
          <div className="h-9 w-32 bg-muted rounded" />
          <div className="h-9 w-36 bg-muted rounded" />
        </div>
      </div>
      <div className="border rounded-lg overflow-hidden">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex gap-4 p-3 border-b last:border-b-0">
            <div className="h-4 bg-muted rounded w-1/5" />
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-4 bg-muted rounded w-1/5" />
            <div className="h-4 bg-muted rounded w-1/6" />
            <div className="h-4 bg-muted rounded w-1/6" />
          </div>
        ))}
      </div>
    </div>
  );
}
