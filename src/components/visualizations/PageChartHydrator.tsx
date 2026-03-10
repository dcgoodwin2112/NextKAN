"use client";

import { useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ChartRenderer } from "./ChartRenderer";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// WeakMap ties root lifetime to DOM element — GC handles cleanup when elements are removed
const rootMap = new WeakMap<HTMLElement, Root>();

function getOrCreateRoot(el: HTMLElement): Root {
  let root = rootMap.get(el);
  if (!root) {
    root = createRoot(el);
    rootMap.set(el, root);
  }
  return root;
}

interface PageChartHydratorProps {
  containerSelector: string;
}

export function PageChartHydrator({ containerSelector }: PageChartHydratorProps) {
  useEffect(() => {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    const elements = container.querySelectorAll<HTMLElement>("[data-chart-id]");
    if (elements.length === 0) return;

    let cancelled = false;

    elements.forEach((el) => {
      const chartId = el.getAttribute("data-chart-id");
      if (!chartId) return;

      // Validate UUID format to prevent request forgery
      if (!UUID_RE.test(chartId)) return;

      const root = getOrCreateRoot(el);

      // Render loading state
      root.render(
        <div className="py-4 text-sm text-text-muted">Loading chart...</div>
      );

      // Fetch chart data and render
      fetch(`/api/charts/${chartId}`)
        .then((res) => {
          if (!res.ok) throw new Error("Chart not found");
          return res.json();
        })
        .then(({ chart, data }) => {
          if (cancelled) return;
          root.render(
            <div className="my-4">
              {chart.title && (
                <h3 className="text-lg font-semibold mb-2">{chart.title}</h3>
              )}
              <ChartRenderer
                chartType={chart.chartType}
                data={data}
                xColumn={chart.config.xColumn}
                yColumns={chart.config.yColumns}
              />
            </div>
          );
        })
        .catch(() => {
          if (cancelled) return;
          root.render(
            <div className="py-4 text-sm text-red-600">
              Failed to load chart.
            </div>
          );
        });
    });

    return () => {
      cancelled = true;
    };
  }, [containerSelector]);

  return null;
}
