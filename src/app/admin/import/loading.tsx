export default function ImportLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-32 bg-muted rounded mb-6" />
      <div className="max-w-2xl space-y-4">
        <div className="h-9 bg-muted rounded w-48" />
        <div className="h-32 bg-muted rounded" />
        <div className="h-9 bg-muted rounded w-32" />
      </div>
    </div>
  );
}
