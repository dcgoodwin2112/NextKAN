import type { Metadata } from "next";
import { siteConfig } from "@/lib/config";
import { PublicBreadcrumbs } from "@/components/public/PublicBreadcrumbs";
import { SwaggerClient } from "./SwaggerClient";

export const metadata: Metadata = {
  title: `API Documentation | ${siteConfig.name}`,
  description: "Interactive API documentation for the data catalog",
};

export default function ApiDocsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <PublicBreadcrumbs
        items={[{ label: "Home", href: "/" }, { label: "API Documentation" }]}
      />
      <h1 className="text-3xl font-bold mb-6">API Documentation</h1>
      <SwaggerClient url="/api/openapi.json" />
    </div>
  );
}
