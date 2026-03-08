export default function MembersLoading() {
  return (
    <div className="animate-pulse">
      {/* Breadcrumbs */}
      <div className="h-4 w-80 bg-muted rounded mb-4" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-56 bg-muted rounded" />
        <div className="h-9 w-40 bg-muted rounded" />
      </div>

      {/* Members table */}
      <div className="flex items-center gap-2 mb-3">
        <div className="h-6 w-36 bg-muted rounded" />
        <div className="h-5 w-8 bg-muted rounded-full" />
      </div>
      <div className="rounded border overflow-hidden mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-4 p-3 border-b last:border-b-0">
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="h-4 bg-muted rounded w-1/6" />
            <div className="h-4 bg-muted rounded w-20" />
          </div>
        ))}
      </div>

      {/* Add member card */}
      <div className="rounded border p-6">
        <div className="h-6 w-28 bg-muted rounded mb-4" />
        <div className="flex gap-3">
          <div className="h-9 w-72 bg-muted rounded" />
          <div className="h-9 w-28 bg-muted rounded" />
        </div>
      </div>
    </div>
  );
}
