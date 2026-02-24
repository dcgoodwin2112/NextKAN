export function getOpenApiSpec(siteUrl: string) {
  return {
    openapi: "3.0.3",
    info: {
      title: "NextKAN API",
      description: "Open data catalog API — DCAT-US v1.1 compliant",
      version: "1.0.0",
    },
    servers: [{ url: siteUrl }],
    paths: {
      "/data.json": {
        get: {
          summary: "DCAT-US Catalog",
          description: "Returns the full DCAT-US v1.1 catalog in JSON format",
          tags: ["Catalog"],
          responses: {
            "200": {
              description: "DCAT-US catalog",
              content: { "application/json": { schema: { type: "object" } } },
            },
          },
        },
      },
      "/api/datasets": {
        get: {
          summary: "List datasets",
          tags: ["Datasets"],
          parameters: [
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
            { name: "search", in: "query", schema: { type: "string" } },
            { name: "organizationId", in: "query", schema: { type: "string" } },
            { name: "status", in: "query", schema: { type: "string" } },
            { name: "bbox", in: "query", schema: { type: "string" }, description: "Bounding box: west,south,east,north" },
          ],
          responses: {
            "200": {
              description: "Paginated list of datasets",
              content: { "application/json": { schema: { type: "object" } } },
            },
          },
        },
        post: {
          summary: "Create dataset",
          tags: ["Datasets"],
          security: [{ session: [] }],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { type: "object" } } },
          },
          responses: {
            "201": { description: "Created dataset" },
            "401": { description: "Unauthorized" },
          },
        },
      },
      "/api/datasets/{id}": {
        get: {
          summary: "Get dataset by ID",
          tags: ["Datasets"],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: {
            "200": { description: "Dataset details" },
            "404": { description: "Dataset not found" },
          },
        },
        put: {
          summary: "Update dataset",
          tags: ["Datasets"],
          security: [{ session: [] }],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
          ],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { type: "object" } } },
          },
          responses: {
            "200": { description: "Updated dataset" },
            "401": { description: "Unauthorized" },
            "404": { description: "Dataset not found" },
          },
        },
        delete: {
          summary: "Delete dataset",
          tags: ["Datasets"],
          security: [{ session: [] }],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: {
            "204": { description: "Dataset deleted" },
            "401": { description: "Unauthorized" },
            "404": { description: "Dataset not found" },
          },
        },
      },
      "/api/organizations": {
        get: {
          summary: "List organizations",
          tags: ["Organizations"],
          responses: {
            "200": { description: "List of organizations" },
          },
        },
        post: {
          summary: "Create organization",
          tags: ["Organizations"],
          security: [{ session: [] }],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { type: "object" } } },
          },
          responses: {
            "201": { description: "Created organization" },
            "401": { description: "Unauthorized" },
          },
        },
      },
      "/api/organizations/{id}": {
        get: {
          summary: "Get organization by ID",
          tags: ["Organizations"],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: {
            "200": { description: "Organization details" },
            "404": { description: "Organization not found" },
          },
        },
        put: {
          summary: "Update organization",
          tags: ["Organizations"],
          security: [{ session: [] }],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
          ],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { type: "object" } } },
          },
          responses: {
            "200": { description: "Updated organization" },
            "401": { description: "Unauthorized" },
            "404": { description: "Organization not found" },
          },
        },
        delete: {
          summary: "Delete organization",
          tags: ["Organizations"],
          security: [{ session: [] }],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: {
            "204": { description: "Organization deleted" },
            "401": { description: "Unauthorized" },
            "404": { description: "Organization not found" },
          },
        },
      },
      "/api/users": {
        get: {
          summary: "List users",
          tags: ["Users"],
          security: [{ session: [] }],
          responses: {
            "200": { description: "List of users" },
            "401": { description: "Unauthorized" },
          },
        },
        post: {
          summary: "Create user",
          tags: ["Users"],
          security: [{ session: [] }],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { type: "object" } } },
          },
          responses: {
            "201": { description: "Created user" },
            "401": { description: "Unauthorized" },
          },
        },
      },
      "/api/users/{id}": {
        patch: {
          summary: "Update user",
          tags: ["Users"],
          security: [{ session: [] }],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
          ],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { type: "object" } } },
          },
          responses: {
            "200": { description: "Updated user" },
            "401": { description: "Unauthorized" },
            "404": { description: "User not found" },
          },
        },
        delete: {
          summary: "Delete user",
          tags: ["Users"],
          security: [{ session: [] }],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: {
            "204": { description: "User deleted" },
            "401": { description: "Unauthorized" },
            "404": { description: "User not found" },
          },
        },
      },
      "/api/preview/{distributionId}": {
        get: {
          summary: "Preview distribution data",
          tags: ["Preview"],
          parameters: [
            { name: "distributionId", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: {
            "200": { description: "Preview data (CSV, JSON, or PDF)" },
            "404": { description: "Distribution not found" },
          },
        },
      },
      "/api/admin/harvest/run-scheduled": {
        post: {
          summary: "Run scheduled harvest jobs",
          tags: ["Harvest"],
          security: [{ session: [] }],
          responses: {
            "200": { description: "Harvest results" },
            "401": { description: "Unauthorized" },
          },
        },
      },
      "/api/datastore/{distributionId}": {
        get: {
          summary: "Query datastore",
          tags: ["Datastore"],
          parameters: [
            { name: "distributionId", in: "path", required: true, schema: { type: "string" } },
            { name: "limit", in: "query", schema: { type: "integer", default: 100 } },
            { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
            { name: "sort", in: "query", schema: { type: "string" } },
            { name: "order", in: "query", schema: { type: "string", enum: ["asc", "desc"] } },
            { name: "filters", in: "query", schema: { type: "string" }, description: "JSON array of filter objects" },
          ],
          responses: {
            "200": { description: "Query results" },
            "404": { description: "Distribution not found" },
          },
        },
      },
      "/api/datastore/sql": {
        post: {
          summary: "Execute SQL query",
          tags: ["Datastore"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { sql: { type: "string" } },
                  required: ["sql"],
                },
              },
            },
          },
          responses: {
            "200": { description: "Query results" },
            "400": { description: "Invalid SQL" },
          },
        },
      },
      "/api/charts": {
        get: {
          summary: "List saved charts",
          tags: ["Charts"],
          parameters: [
            { name: "distributionId", in: "query", schema: { type: "string" } },
          ],
          responses: { "200": { description: "List of charts" } },
        },
        post: {
          summary: "Save a chart",
          tags: ["Charts"],
          security: [{ session: [] }],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { type: "object" } } },
          },
          responses: {
            "201": { description: "Created chart" },
            "401": { description: "Unauthorized" },
          },
        },
      },
      "/api/charts/{id}": {
        get: {
          summary: "Get chart with data",
          tags: ["Charts"],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: {
            "200": { description: "Chart config and data" },
            "404": { description: "Chart not found" },
          },
        },
      },
      "/api/datasets/{id}/dictionary": {
        get: {
          summary: "Get data dictionaries",
          tags: ["Data Dictionary"],
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: { "200": { description: "Frictionless Table Schema" } },
        },
      },
      "/api/export": {
        get: {
          summary: "Export catalog",
          tags: ["Export"],
          parameters: [
            { name: "format", in: "query", required: true, schema: { type: "string", enum: ["csv", "json"] } },
          ],
          responses: {
            "200": { description: "Exported file" },
          },
        },
      },
      "/api/activity": {
        get: {
          summary: "List activity log entries",
          tags: ["Activity"],
          parameters: [
            { name: "entityType", in: "query", schema: { type: "string" } },
            { name: "entityId", in: "query", schema: { type: "string" } },
            { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          ],
          responses: { "200": { description: "Activity log entries" } },
        },
      },
    },
    components: {
      securitySchemes: {
        session: {
          type: "apiKey",
          in: "cookie",
          name: "next-auth.session-token",
        },
      },
    },
  };
}
