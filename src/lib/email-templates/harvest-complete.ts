interface HarvestCompleteParams {
  sourceName: string;
  status: string;
  created: number;
  updated: number;
  deleted: number;
  errors: number;
}

export function harvestCompleteEmail(params: HarvestCompleteParams) {
  const { sourceName, status, created, updated, deleted, errors } = params;
  const statusLabel =
    status === "success"
      ? "completed successfully"
      : status === "partial"
        ? "completed with errors"
        : "failed";

  return {
    subject: `Harvest ${statusLabel}: ${sourceName}`,
    html: `
      <h2>Harvest ${statusLabel}</h2>
      <p>Source: <strong>${sourceName}</strong></p>
      <ul>
        <li>Datasets created: ${created}</li>
        <li>Datasets updated: ${updated}</li>
        <li>Datasets archived: ${deleted}</li>
        ${errors > 0 ? `<li>Errors: ${errors}</li>` : ""}
      </ul>
    `.trim(),
    text: `Harvest ${statusLabel} for ${sourceName}. Created: ${created}, Updated: ${updated}, Archived: ${deleted}.${errors > 0 ? ` Errors: ${errors}` : ""}`,
  };
}
