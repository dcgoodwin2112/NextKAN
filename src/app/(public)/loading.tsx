export default function HomeLoading() {
  return (
    <div className="animate-pulse">
      {/* Hero */}
      <div className="bg-muted py-16 md:py-24 -mx-[calc((100vw-100%)/2)] px-[calc((100vw-100%)/2)]">
        <div className="mx-auto max-w-3xl text-center space-y-4">
          <div className="h-10 w-64 bg-muted-foreground/10 rounded mx-auto" />
          <div className="h-6 w-96 bg-muted-foreground/10 rounded mx-auto" />
          <div className="h-10 w-full max-w-xl bg-muted-foreground/10 rounded mx-auto" />
          <div className="h-4 w-32 bg-muted-foreground/10 rounded mx-auto" />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 space-y-12">
        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-lg border p-4 text-center">
              <div className="h-8 w-12 bg-muted rounded mx-auto mb-2" />
              <div className="h-4 w-20 bg-muted rounded mx-auto" />
            </div>
          ))}
        </div>

        {/* Topic grid */}
        <div>
          <div className="h-6 w-24 bg-muted rounded mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-10 bg-muted rounded" />
            ))}
          </div>
        </div>

        {/* Recent datasets */}
        <div>
          <div className="h-8 w-48 bg-muted rounded mb-4" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="rounded-lg border p-4 space-y-2">
                <div className="h-4 w-3/4 bg-muted rounded" />
                <div className="h-3 w-full bg-muted rounded" />
                <div className="h-3 w-1/2 bg-muted rounded" />
                <div className="flex gap-1">
                  <div className="h-4 w-10 bg-muted rounded" />
                  <div className="h-4 w-10 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
