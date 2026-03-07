export default function TrashLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-24 bg-muted rounded mb-6" />
      <div className="max-w-xl mb-6">
        <div className="flex gap-2">
          <div className="h-9 flex-1 bg-muted rounded" />
          <div className="h-9 w-20 bg-muted rounded" />
        </div>
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 bg-muted rounded" />
        ))}
      </div>
    </div>
  );
}
