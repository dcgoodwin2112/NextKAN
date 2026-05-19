/**
 * Pure helpers that compute the MCP tool calls an agent would make against a
 * published version of the given dataset. Used by the admin "Agent preview"
 * panel — no network round-trip; the data already lives on the page.
 */

export interface PreviewColumn {
  name: string;
  type: string;
  filterable: boolean;
  aggregatable: boolean;
  min?: string | null;
  max?: string | null;
  sampleValues?: unknown[];
  enumValues?: unknown[];
}

export interface PreviewResource {
  id: string;
  name: string;
  queryable: boolean;
  rowCount?: number | null;
  columns: PreviewColumn[];
}

export interface PreviewDataset {
  id: string;
  identifier: string;
  title: string;
  resources: PreviewResource[];
}

export interface ToolCallPreview {
  /** MCP tool name. */
  name:
    | "list_datasets"
    | "get_dataset"
    | "get_schema"
    | "query_dataset"
    | "aggregate_dataset"
    | "sample_dataset";
  /** Short description of what this call demonstrates. */
  description: string;
  /** Arguments object the agent passes. */
  arguments: Record<string, unknown>;
  /** True if any inputs were synthesized (e.g. example values). */
  synthesized?: boolean;
  /** Tool is not available given current dataset state (e.g. no queryable resource). */
  unavailable?: string;
}

/**
 * Build the preview list for a dataset. Always returns all six tools, but
 * tools that aren't applicable (e.g. no queryable resource) carry an
 * `unavailable` reason so the UI can dim them.
 */
export function buildToolCallPreviews(
  dataset: PreviewDataset,
): ToolCallPreview[] {
  const queryable = dataset.resources.find((r) => r.queryable && r.columns.length > 0);
  const firstResource = dataset.resources[0];

  const previews: ToolCallPreview[] = [];

  previews.push({
    name: "list_datasets",
    description:
      "Agents discover this dataset by searching the catalog. Title words make good seeds for the `query`.",
    arguments: {
      query: firstWord(dataset.title),
      limit: 10,
    },
    synthesized: true,
  });

  previews.push({
    name: "get_dataset",
    description: "Fetches full metadata, resources, and per-column flags.",
    arguments: { datasetId: dataset.id },
  });

  if (firstResource) {
    previews.push({
      name: "get_schema",
      description:
        "Lightweight column schema with stats — call this before querying to pick valid filter/group-by columns.",
      arguments: { resourceId: firstResource.id },
    });
  } else {
    previews.push({
      name: "get_schema",
      description: "No resources on this dataset yet.",
      arguments: {},
      unavailable: "Add a resource to enable this tool.",
    });
  }

  if (queryable) {
    previews.push(buildQueryPreview(queryable));
    previews.push(buildAggregatePreview(queryable));
    previews.push({
      name: "sample_dataset",
      description: "Random rows from the Parquet store — quick smoke check.",
      arguments: { resourceId: queryable.id, n: 5 },
    });
  } else {
    const reason = firstResource
      ? "The dataset's resources are not yet profiled to Parquet — publish + profile first."
      : "Add a resource and let the profiler run.";
    previews.push({
      name: "query_dataset",
      description: "Row-level retrieval over the Parquet store.",
      arguments: {},
      unavailable: reason,
    });
    previews.push({
      name: "aggregate_dataset",
      description: "Group-by aggregation over the Parquet store.",
      arguments: {},
      unavailable: reason,
    });
    previews.push({
      name: "sample_dataset",
      description: "Random rows from the Parquet store.",
      arguments: {},
      unavailable: reason,
    });
  }

  return previews;
}

function buildQueryPreview(resource: PreviewResource): ToolCallPreview {
  const filterableCols = resource.columns.filter((c) => c.filterable);
  const projection = resource.columns.slice(0, 4).map((c) => c.name);

  const args: Record<string, unknown> = {
    resourceId: resource.id,
    columns: projection,
    limit: 20,
  };

  const filter = pickFilterExample(filterableCols);
  if (filter) args.filters = [filter];

  return {
    name: "query_dataset",
    description:
      "Row-level retrieval with projection, filter and limit. Filters require columns with `filterable: true`.",
    arguments: args,
    synthesized: filter != null,
  };
}

function buildAggregatePreview(resource: PreviewResource): ToolCallPreview {
  const groupCol = resource.columns.find((c) => c.filterable);
  const metricCol = resource.columns.find((c) => c.aggregatable);

  const args: Record<string, unknown> = {
    resourceId: resource.id,
    groupBy: groupCol ? [groupCol.name] : [],
    metrics: metricCol
      ? [
          { function: "count_all" },
          { column: metricCol.name, function: metricCol.type === "string" ? "count" : "sum" },
        ]
      : [{ function: "count_all" }],
    limit: 20,
  };

  if (!groupCol || !metricCol) {
    return {
      name: "aggregate_dataset",
      description:
        "Group-by aggregation. Needs at least one filterable group-by column and one aggregatable metric column.",
      arguments: args,
      unavailable: !groupCol
        ? "No filterable column available for group-by."
        : "No aggregatable column available for metrics.",
    };
  }

  return {
    name: "aggregate_dataset",
    description:
      "Group-by aggregation. The preferred analytical path — cheap relative to fetching rows and aggregating client-side.",
    arguments: args,
    synthesized: true,
  };
}

function pickFilterExample(
  cols: PreviewColumn[],
): { column: string; operator: string; value: unknown } | null {
  if (cols.length === 0) return null;
  // Prefer a column with an obvious sample/enum value to make the example concrete.
  const withSample = cols.find(
    (c) =>
      (c.enumValues && c.enumValues.length > 0) ||
      (c.sampleValues && c.sampleValues.length > 0),
  );
  if (withSample) {
    const value =
      withSample.enumValues?.[0] ?? withSample.sampleValues?.[0] ?? null;
    return {
      column: withSample.name,
      operator: "=",
      value,
    };
  }
  // Date/number column: use IS NOT NULL — safe and concrete.
  const dateOrNum = cols.find(
    (c) => c.type === "date" || c.type === "datetime" || c.type === "number" || c.type === "integer",
  );
  if (dateOrNum) {
    return { column: dateOrNum.name, operator: "is_not_null", value: undefined };
  }
  return { column: cols[0].name, operator: "is_not_null", value: undefined };
}

function firstWord(s: string): string {
  const trimmed = s.trim();
  if (!trimmed) return "";
  return trimmed.split(/\s+/)[0].toLowerCase();
}
