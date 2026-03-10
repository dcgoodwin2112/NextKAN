"use client";

import { useState, useEffect, useRef } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import { DownloadLink } from "@/components/analytics/DownloadLink";
import type { Map as LeafletMap } from "leaflet";

interface DataPreviewProps {
  distributionId: string;
  format?: string | null;
  filePath?: string | null;
  downloadURL?: string | null;
}

interface CsvPreviewData {
  type: "csv";
  columns: string[];
  rows: Record<string, string>[];
  totalRows: number;
  truncated: boolean;
}

interface JsonPreviewData {
  type: "json";
  content: string;
  truncated: boolean;
}

interface JsonTablePreviewData {
  type: "json-table";
  columns: string[];
  rows: Record<string, string>[];
  totalRows: number;
  truncated: boolean;
}

interface GeoJsonPreviewData {
  type: "geojson";
  columns: string[];
  rows: Record<string, string>[];
  totalRows: number;
  truncated: boolean;
  geojson: unknown;
}

interface UnsupportedData {
  type: "unsupported";
  format: string;
  message: string;
}

type PreviewData = CsvPreviewData | JsonPreviewData | JsonTablePreviewData | GeoJsonPreviewData | UnsupportedData;

function CsvTable({ data }: { data: CsvPreviewData }) {
  const columnHelper = createColumnHelper<Record<string, string>>();
  const columns = data.columns.map((col) =>
    columnHelper.accessor(col, {
      header: col,
      cell: (info) => info.getValue() ?? "",
    })
  );

  const table = useReactTable({
    data: data.rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm border border-border">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="bg-surface">
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="border border-border px-3 py-2 text-left font-medium">
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="hover:bg-surface">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="border border-border px-3 py-1.5">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.truncated && (
        <p className="text-xs text-text-muted mt-2">
          Showing {data.rows.length} of {data.totalRows} rows
        </p>
      )}
    </div>
  );
}

function GeoJsonPreview({ data }: { data: GeoJsonPreviewData }) {
  const [view, setView] = useState<"table" | "map">("table");
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<LeafletMap | null>(null);

  useEffect(() => {
    if (view !== "map" || !mapRef.current) return;

    import("leaflet").then((L) => {
      // @ts-expect-error CSS import
      import("leaflet/dist/leaflet.css");

      if (mapInstance) {
        mapInstance.remove();
      }

      const map = L.map(mapRef.current!).setView([39.8283, -98.5795], 4);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      try {
        const geoLayer = L.geoJSON(data.geojson as any).addTo(map);
        map.fitBounds(geoLayer.getBounds(), { padding: [20, 20] });
      } catch {
        // fallback — keep default view
      }

      setMapInstance(map);
    });

    return () => {
      if (mapInstance) {
        mapInstance.remove();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, data.geojson]);

  const tableData: CsvPreviewData = {
    type: "csv",
    columns: data.columns,
    rows: data.rows,
    totalRows: data.totalRows,
    truncated: data.truncated,
  };

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setView("table")}
          className={`px-3 py-1 text-sm rounded ${view === "table" ? "bg-primary text-primary-foreground" : "bg-surface border border-border"}`}
        >
          Table
        </button>
        <button
          onClick={() => setView("map")}
          className={`px-3 py-1 text-sm rounded ${view === "map" ? "bg-primary text-primary-foreground" : "bg-surface border border-border"}`}
        >
          Map
        </button>
      </div>
      {view === "table" ? (
        <CsvTable data={tableData} />
      ) : (
        <div
          ref={mapRef}
          style={{ height: 400, width: "100%" }}
          className="rounded border"
        />
      )}
    </div>
  );
}

export function DataPreview({ distributionId, format, filePath, downloadURL }: DataPreviewProps) {
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPdf = format?.toUpperCase() === "PDF";
  const hasFile = !!filePath;

  useEffect(() => {
    if (!hasFile || isPdf) return;

    setLoading(true);
    setError(null);

    fetch(`/api/preview/${distributionId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load preview");
        return res.json();
      })
      .then(setPreview)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [distributionId, hasFile, isPdf]);

  if (!hasFile && !downloadURL) {
    return null;
  }

  if (isPdf && downloadURL) {
    return (
      <iframe
        src={downloadURL}
        className="w-full h-96 border border-border rounded"
        title="PDF Preview"
      />
    );
  }

  if (!hasFile) {
    return (
      <DownloadLink
        href={downloadURL!}
        distributionId={distributionId}
        className="text-primary hover:underline text-sm"
      >
        Download file
      </DownloadLink>
    );
  }

  if (loading) {
    return <p className="text-sm text-text-muted">Loading preview...</p>;
  }

  if (error) {
    return <p className="text-sm text-danger">Preview unavailable: {error}</p>;
  }

  if (!preview) return null;

  if (preview.type === "csv") {
    return <CsvTable data={preview} />;
  }

  if (preview.type === "json-table") {
    const tableData: CsvPreviewData = {
      type: "csv",
      columns: preview.columns,
      rows: preview.rows,
      totalRows: preview.totalRows,
      truncated: preview.truncated,
    };
    return <CsvTable data={tableData} />;
  }

  if (preview.type === "geojson") {
    return <GeoJsonPreview data={preview} />;
  }

  if (preview.type === "json") {
    return (
      <div className="overflow-auto max-h-96">
        <pre className="text-xs bg-surface p-4 rounded border border-border whitespace-pre-wrap">
          {preview.content}
        </pre>
        {preview.truncated && (
          <p className="text-xs text-text-muted mt-2">Content truncated (first 500KB shown)</p>
        )}
      </div>
    );
  }

  return (
    <p className="text-sm text-text-muted">
      Preview not available for {format || "this"} format.
      {downloadURL && (
        <>
          {" "}
          <DownloadLink
            href={downloadURL}
            distributionId={distributionId}
            className="text-primary hover:underline"
          >
            Download instead
          </DownloadLink>
        </>
      )}
    </p>
  );
}
