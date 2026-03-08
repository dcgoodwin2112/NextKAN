export default function AccountLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-4 w-40 bg-muted rounded mb-4" />
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-32 bg-muted rounded" />
      </div>
      <div className="rounded-lg border p-6">
        <div className="h-6 w-28 bg-muted rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <div className="h-4 bg-muted rounded w-1/3" />
              <div className="h-4 bg-muted rounded w-1/4" />
            </div>
          ))}
        </div>
        <div className="h-9 w-32 bg-muted rounded mt-4" />
      </div>
    </div>
  );
}
