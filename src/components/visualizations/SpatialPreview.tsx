"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";

interface SpatialPreviewProps {
  spatial: string;
}

export function SpatialPreview({ spatial }: SpatialPreviewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<LeafletMap | null>(null);
  const [isText, setIsText] = useState(false);

  useEffect(() => {
    if (!mapRef.current) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(spatial);
    } catch {
      setIsText(true);
      return;
    }

    // Dynamic import to avoid SSR
    import("leaflet").then((L) => {
      // @ts-expect-error CSS import
      import("leaflet/dist/leaflet.css");

      // Fix default marker icons
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (mapInstance) {
        mapInstance.remove();
      }

      const map = L.map(mapRef.current!).setView([39.8283, -98.5795], 4);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      if (
        parsed &&
        typeof parsed === "object" &&
        "type" in (parsed as Record<string, unknown>) &&
        (parsed as any).type === "BoundingBox"
      ) {
        const [west, south, east, north] = (parsed as any).coordinates;
        const bounds = L.latLngBounds(
          [south, west],
          [north, east]
        );
        L.rectangle(bounds, { color: "#2563eb", weight: 2 }).addTo(map);
        map.fitBounds(bounds, { padding: [20, 20] });
      } else if (parsed && typeof parsed === "object") {
        try {
          const geoLayer = L.geoJSON(parsed as any).addTo(map);
          map.fitBounds(geoLayer.getBounds(), { padding: [20, 20] });
        } catch {
          // fallback
        }
      }

      setMapInstance(map);
    });

    return () => {
      if (mapInstance) {
        mapInstance.remove();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spatial]);

  if (isText) {
    return (
      <p className="text-sm text-gray-600">
        <span className="font-medium">Spatial coverage:</span> {spatial}
      </p>
    );
  }

  return (
    <div
      ref={mapRef}
      style={{ height: 300, width: "100%" }}
      className="rounded border"
    />
  );
}
