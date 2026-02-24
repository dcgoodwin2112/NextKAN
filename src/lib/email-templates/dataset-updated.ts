interface DatasetUpdatedParams {
  title: string;
  datasetUrl: string;
  changedFields: string[];
}

export function datasetUpdatedEmail(params: DatasetUpdatedParams) {
  const { title, datasetUrl, changedFields } = params;
  const fieldList = changedFields.map((f) => `<li>${f}</li>`).join("");

  return {
    subject: `Dataset updated: ${title}`,
    html: `
      <h2>Dataset Updated</h2>
      <p><strong>${title}</strong> has been updated.</p>
      <p>Changed fields:</p>
      <ul>${fieldList}</ul>
      <p><a href="${datasetUrl}">View dataset</a></p>
    `.trim(),
    text: `Dataset "${title}" updated. Changed: ${changedFields.join(", ")}. View at: ${datasetUrl}`,
  };
}
