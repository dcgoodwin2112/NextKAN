interface DatasetCreatedParams {
  title: string;
  datasetUrl: string;
  publisherName: string;
}

export function datasetCreatedEmail(params: DatasetCreatedParams) {
  const { title, datasetUrl, publisherName } = params;

  return {
    subject: `New dataset published: ${title}`,
    html: `
      <h2>New Dataset Published</h2>
      <p><strong>${title}</strong> has been published by ${publisherName}.</p>
      <p><a href="${datasetUrl}">View dataset</a></p>
    `.trim(),
    text: `New dataset "${title}" published by ${publisherName}. View at: ${datasetUrl}`,
  };
}
