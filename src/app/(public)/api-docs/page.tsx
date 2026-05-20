import type { Metadata } from "next";
import { siteConfig } from "@/lib/config";
import { PublicBreadcrumbs } from "@/components/public/PublicBreadcrumbs";
import { getOpenApiSpec } from "@/lib/openapi";
import { ApiReference } from "./ApiReference";

export const metadata: Metadata = {
  title: `API Documentation | ${siteConfig.name}`,
  description: "Interactive API documentation for the data catalog",
};

export default function ApiDocsPage() {
  const spec = getOpenApiSpec(siteConfig.url);
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <PublicBreadcrumbs
        items={[{ label: "Home", href: "/" }, { label: "API Documentation" }]}
      />
      <h1 className="mb-6 text-3xl font-bold">API Documentation</h1>
      <p className="mb-8 text-text-secondary">
        Reference for the {siteConfig.name} HTTP API. The raw OpenAPI 3.0 spec
        is available at{" "}
        <a href="/api/openapi.json" className="font-mono text-link hover:underline">
          /api/openapi.json
        </a>
        .
      </p>
      <ApiReference spec={spec} />
    </div>
  );
}
