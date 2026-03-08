export default function SystemLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-40 bg-muted rounded mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded border p-6">
            <div className="h-5 w-24 bg-muted rounded mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((j) => (
                <div key={j} className="flex justify-between">
                  <div className="h-4 w-28 bg-muted rounded" />
                  <div className="h-4 w-20 bg-muted rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
