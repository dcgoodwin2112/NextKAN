export default function SettingsLoading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-28 bg-muted rounded" />
      </div>
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border p-6">
            <div className="h-6 w-32 bg-muted rounded mb-4" />
            <div className="space-y-4">
              {[1, 2, 3].map((j) => (
                <div key={j}>
                  <div className="h-4 w-24 bg-muted rounded mb-2" />
                  <div className="h-10 bg-muted rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
