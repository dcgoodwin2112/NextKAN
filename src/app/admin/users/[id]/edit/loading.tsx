export default function UserEditLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-4 w-48 bg-muted rounded mb-4" />
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-32 bg-muted rounded" />
      </div>
      <div className="space-y-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i}>
            <div className="h-4 w-24 bg-muted rounded mb-2" />
            <div className="h-10 bg-muted rounded" />
          </div>
        ))}
        <div className="flex gap-3">
          <div className="h-10 w-24 bg-muted rounded" />
          <div className="h-10 w-24 bg-muted rounded" />
        </div>
      </div>
    </div>
  );
}
