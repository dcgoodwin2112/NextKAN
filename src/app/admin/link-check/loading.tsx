export default function LinkCheckLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-4 w-32 bg-muted rounded mb-4" />
      <div className="h-8 w-56 bg-muted rounded mb-2" />
      <div className="h-4 w-80 bg-muted rounded mb-6" />
      <div className="h-10 w-32 bg-muted rounded mb-6" />
      <div className="rounded border overflow-hidden">
        <div className="bg-surface border-b px-4 py-3">
          <div className="h-4 w-full bg-muted rounded" />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="px-4 py-3 border-b">
            <div className="h-4 w-full bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
