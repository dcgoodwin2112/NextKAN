export default function ThemesLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 animate-pulse">
      <div className="h-4 w-32 bg-muted rounded mb-6" />
      <div className="h-9 w-36 bg-muted rounded mb-2" />
      <div className="h-5 w-64 bg-muted rounded mb-8" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 bg-muted rounded-full" />
              <div className="h-4 w-28 bg-muted rounded" />
            </div>
            <div className="h-3 w-full bg-muted rounded" />
            <div className="h-4 w-20 bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
