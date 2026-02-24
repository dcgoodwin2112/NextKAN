import { NextResponse } from "next/server";
import { siteConfig } from "@/lib/config";

export async function GET() {
  const siteUrl = siteConfig.url;

  return NextResponse.json({
    name: siteConfig.name,
    description: siteConfig.description,
    url: siteUrl,
    endpoints: {
      "dcat-us-1.1": `${siteUrl}/data.json`,
      "ckan-api": {
        package_list: `${siteUrl}/api/3/action/package_list`,
        package_show: `${siteUrl}/api/3/action/package_show`,
        package_search: `${siteUrl}/api/3/action/package_search`,
        organization_list: `${siteUrl}/api/3/action/organization_list`,
        organization_show: `${siteUrl}/api/3/action/organization_show`,
        tag_list: `${siteUrl}/api/3/action/tag_list`,
      },
    },
    conformsTo: "https://project-open-data.cio.gov/v1.1/schema",
  });
}
