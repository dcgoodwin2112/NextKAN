export default function ThemesLoading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-28 bg-muted rounded" />
        <div className="h-9 w-32 bg-muted rounded" />
      </div>
      <div className="border rounded-lg overflow-hidden">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex gap-4 p-3 border-b last:border-b-0">
            <div className="h-6 w-6 bg-muted rounded-full" />
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-4 bg-muted rounded w-12" />
            <div className="h-4 bg-muted rounded w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
