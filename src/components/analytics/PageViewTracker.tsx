"use client";

import { useEffect } from "react";

interface PageViewTrackerProps {
  entityType?: string;
  entityId?: string;
}

export function PageViewTracker({ entityType, entityId }: PageViewTrackerProps) {
  useEffect(() => {
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType: "page_view", entityType, entityId }),
    }).catch(() => {});
  }, [entityType, entityId]);

  return null;
}
