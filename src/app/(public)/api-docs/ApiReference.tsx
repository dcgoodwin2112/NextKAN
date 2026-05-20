import type { getOpenApiSpec } from "@/lib/openapi";

type Spec = ReturnType<typeof getOpenApiSpec>;

interface ApiReferenceProps {
  spec: Spec;
}

const HTTP_METHODS = ["get", "post", "put", "patch", "delete"] as const;
type HttpMethod = (typeof HTTP_METHODS)[number];

const METHOD_STYLES: Record<HttpMethod, string> = {
  get: "bg-success-subtle text-success-text",
  post: "bg-primary-subtle text-primary-subtle-text",
  put: "bg-warning-subtle text-warning-text",
  patch: "bg-warning-subtle text-warning-text",
  delete: "bg-danger-subtle text-danger-text",
};

interface Operation {
  summary?: string;
  description?: string;
  tags?: string[];
  security?: Array<Record<string, unknown>>;
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses?: Record<string, ResponseObject>;
}

interface EndpointEntry {
  path: string;
  method: HttpMethod;
  operation: Operation;
}

/**
 * Group operations by their primary tag. Operations without tags fall under "Other".
 */
function groupByTag(paths: Spec["paths"]): Map<string, EndpointEntry[]> {
  const groups = new Map<string, EndpointEntry[]>();
  for (const [path, item] of Object.entries(paths)) {
    const pathItem = item as Record<string, Operation | undefined>;
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!operation) continue;
      const tag = operation.tags?.[0] ?? "Other";
      const bucket = groups.get(tag) ?? [];
      bucket.push({ path, method, operation });
      groups.set(tag, bucket);
    }
  }
  return groups;
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function operationId(path: string, method: string): string {
  return `op-${method}-${slugify(path)}`;
}

export function ApiReference({ spec }: ApiReferenceProps) {
  const groups = groupByTag(spec.paths);
  const tagNames = Array.from(groups.keys()).sort();
  const serverUrl = spec.servers?.[0]?.url ?? "";

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[16rem_1fr]">
      <nav
        aria-label="API endpoints"
        className="lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto rounded-lg border border-border bg-surface p-4 text-sm"
      >
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Endpoints
        </p>
        <ul className="space-y-4">
          {tagNames.map((tag) => (
            <li key={tag}>
              <a
                href={`#tag-${slugify(tag)}`}
                className="block font-medium text-foreground hover:text-primary"
              >
                {tag}
              </a>
              <ul className="mt-1 space-y-1 border-l border-border pl-3">
                {groups.get(tag)!.map(({ path, method }) => (
                  <li key={`${method}-${path}`}>
                    <a
                      href={`#${operationId(path, method)}`}
                      className="flex items-baseline gap-2 py-0.5 text-text-secondary hover:text-primary"
                    >
                      <span
                        className={`inline-block min-w-[3rem] text-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${METHOD_STYLES[method]}`}
                      >
                        {method}
                      </span>
                      <span className="font-mono text-xs break-all">{path}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </nav>

      <div className="min-w-0 space-y-12">
        <header className="rounded-lg border border-border bg-surface p-6">
          <h2 className="text-2xl font-bold">{spec.info.title}</h2>
          <p className="mt-1 text-sm text-text-muted">Version {spec.info.version}</p>
          {spec.info.description && (
            <p className="mt-3 text-foreground">{spec.info.description}</p>
          )}
          {serverUrl && (
            <p className="mt-4 text-sm">
              <span className="font-semibold text-text-secondary">Server: </span>
              <code className="rounded bg-surface-inset px-2 py-1 font-mono text-xs">
                {serverUrl}
              </code>
            </p>
          )}
        </header>

        {tagNames.map((tag) => (
          <section key={tag} id={`tag-${slugify(tag)}`} className="scroll-mt-20">
            <h2 className="border-b border-border pb-2 text-xl font-bold">{tag}</h2>
            <div className="mt-4 space-y-4">
              {groups.get(tag)!.map((entry) => (
                <OperationCard key={`${entry.method}-${entry.path}`} entry={entry} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function OperationCard({ entry }: { entry: EndpointEntry }) {
  const { path, method, operation: op } = entry;
  const requiresAuth = (op.security?.length ?? 0) > 0;

  return (
    <article
      id={operationId(path, method)}
      className="scroll-mt-20 rounded-lg border border-border bg-surface"
    >
      <header className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <span
          className={`rounded px-2 py-1 text-xs font-bold uppercase ${METHOD_STYLES[method]}`}
        >
          {method}
        </span>
        <code className="font-mono text-sm break-all text-foreground">{path}</code>
        {requiresAuth && (
          <span className="ml-auto rounded bg-surface-inset px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
            Auth required
          </span>
        )}
      </header>
      <div className="space-y-4 px-4 py-4 text-sm">
        {op.summary && <p className="font-medium text-foreground">{op.summary}</p>}
        {op.description && <p className="text-text-secondary">{op.description}</p>}

        {op.parameters && op.parameters.length > 0 && (
          <ParametersTable parameters={op.parameters} />
        )}

        {op.requestBody && <RequestBodyBlock requestBody={op.requestBody} />}

        {op.responses && <ResponsesTable responses={op.responses} />}
      </div>
    </article>
  );
}

interface Parameter {
  name: string;
  in: string;
  required?: boolean;
  description?: string;
  schema?: { type?: string; default?: unknown; enum?: unknown[] };
}

function ParametersTable({ parameters }: { parameters: Parameter[] }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
        Parameters
      </h3>
      <div className="overflow-x-auto rounded border border-border">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-alt text-text-secondary">
            <tr>
              <th className="px-3 py-2 font-semibold">Name</th>
              <th className="px-3 py-2 font-semibold">In</th>
              <th className="px-3 py-2 font-semibold">Type</th>
              <th className="px-3 py-2 font-semibold">Required</th>
              <th className="px-3 py-2 font-semibold">Description</th>
            </tr>
          </thead>
          <tbody>
            {parameters.map((p) => {
              const enumList = p.schema?.enum;
              const typeLabel = enumList
                ? enumList.map((v) => JSON.stringify(v)).join(" | ")
                : p.schema?.type ?? "—";
              return (
                <tr key={`${p.in}-${p.name}`} className="border-t border-border">
                  <td className="px-3 py-2 font-mono">{p.name}</td>
                  <td className="px-3 py-2 text-text-secondary">{p.in}</td>
                  <td className="px-3 py-2 font-mono text-text-secondary break-all">
                    {typeLabel}
                    {p.schema?.default !== undefined &&
                      ` (default: ${JSON.stringify(p.schema.default)})`}
                  </td>
                  <td className="px-3 py-2 text-text-secondary">
                    {p.required ? "yes" : "no"}
                  </td>
                  <td className="px-3 py-2 text-text-secondary">
                    {p.description ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

interface RequestBody {
  required?: boolean;
  content?: Record<string, { schema?: unknown }>;
}

function RequestBodyBlock({ requestBody }: { requestBody: RequestBody }) {
  const entries = Object.entries(requestBody.content ?? {});
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
        Request body {requestBody.required ? <span className="text-danger">*</span> : null}
      </h3>
      <div className="space-y-2">
        {entries.map(([mediaType, body]) => (
          <div key={mediaType}>
            <p className="mb-1 font-mono text-xs text-text-secondary">{mediaType}</p>
            <pre className="overflow-x-auto rounded border border-border bg-surface-inset p-3 font-mono text-xs">
              {JSON.stringify(body.schema ?? {}, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </section>
  );
}

interface ResponseObject {
  description?: string;
}

function ResponsesTable({ responses }: { responses: Record<string, ResponseObject> }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
        Responses
      </h3>
      <div className="overflow-x-auto rounded border border-border">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-alt text-text-secondary">
            <tr>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 font-semibold">Description</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(responses).map(([status, resp]) => (
              <tr key={status} className="border-t border-border">
                <td className="px-3 py-2 font-mono">{status}</td>
                <td className="px-3 py-2 text-text-secondary">
                  {resp.description ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
