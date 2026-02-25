"use client";

import { Badge } from "@/components/ui/badge";

interface VersionDetailProps {
  snapshot: Record<string, unknown>;
}

function renderValue(value: unknown): string {
  if (value === undefined || value === null) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

export function VersionDetail({ snapshot }: VersionDetailProps) {
  const publisher = snapshot.publisher as
    | { name?: string; subOrganizationOf?: { name?: string } }
    | undefined;
  const contactPoint = snapshot.contactPoint as
    | { fn?: string; hasEmail?: string }
    | undefined;
  const keywords = (snapshot.keyword as string[]) || [];
  const themes = (snapshot.theme as string[]) || [];
  const distributions = (snapshot.distribution as Record<string, unknown>[]) || [];

  return (
    <div className="space-y-6">
      {/* Core fields */}
      <section>
        <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">
          Core
        </h3>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="font-medium text-text-muted">Title</dt>
            <dd>{renderValue(snapshot.title)}</dd>
          </div>
          <div>
            <dt className="font-medium text-text-muted">Identifier</dt>
            <dd>{renderValue(snapshot.identifier)}</dd>
          </div>
          <div>
            <dt className="font-medium text-text-muted">Access Level</dt>
            <dd>{renderValue(snapshot.accessLevel)}</dd>
          </div>
          <div>
            <dt className="font-medium text-text-muted">Modified</dt>
            <dd>{renderValue(snapshot.modified)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="font-medium text-text-muted">Description</dt>
            <dd className="whitespace-pre-wrap">
              {renderValue(snapshot.description)}
            </dd>
          </div>
        </dl>
      </section>

      {/* Contact */}
      {contactPoint && (
        <section>
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">
            Contact Point
          </h3>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
            <div>
              <dt className="font-medium text-text-muted">Name</dt>
              <dd>{renderValue(contactPoint.fn)}</dd>
            </div>
            <div>
              <dt className="font-medium text-text-muted">Email</dt>
              <dd>{renderValue(contactPoint.hasEmail)}</dd>
            </div>
          </dl>
        </section>
      )}

      {/* Publisher */}
      {publisher && (
        <section>
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">
            Publisher
          </h3>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
            <div>
              <dt className="font-medium text-text-muted">Name</dt>
              <dd>{renderValue(publisher.name)}</dd>
            </div>
            {publisher.subOrganizationOf && (
              <div>
                <dt className="font-medium text-text-muted">Parent Organization</dt>
                <dd>{renderValue(publisher.subOrganizationOf.name)}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      {/* Keywords */}
      {keywords.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">
            Keywords
          </h3>
          <div className="flex flex-wrap gap-2">
            {keywords.map((kw) => (
              <Badge key={kw} variant="secondary">
                {kw}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {/* Themes */}
      {themes.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">
            Themes
          </h3>
          <div className="flex flex-wrap gap-2">
            {themes.map((t) => (
              <Badge key={t} variant="default">
                {t}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {/* Additional metadata */}
      <section>
        <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">
          Additional Metadata
        </h3>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
          {snapshot.temporal && (
            <div>
              <dt className="font-medium text-text-muted">Temporal Coverage</dt>
              <dd>{renderValue(snapshot.temporal)}</dd>
            </div>
          )}
          {snapshot.spatial && (
            <div>
              <dt className="font-medium text-text-muted">Spatial Coverage</dt>
              <dd>{renderValue(snapshot.spatial)}</dd>
            </div>
          )}
          {snapshot.accrualPeriodicity && (
            <div>
              <dt className="font-medium text-text-muted">Accrual Periodicity</dt>
              <dd>{renderValue(snapshot.accrualPeriodicity)}</dd>
            </div>
          )}
          {snapshot.license && (
            <div>
              <dt className="font-medium text-text-muted">License</dt>
              <dd>{renderValue(snapshot.license)}</dd>
            </div>
          )}
          {snapshot.rights && (
            <div>
              <dt className="font-medium text-text-muted">Rights</dt>
              <dd>{renderValue(snapshot.rights)}</dd>
            </div>
          )}
          {snapshot.conformsTo && (
            <div>
              <dt className="font-medium text-text-muted">Conforms To</dt>
              <dd>{renderValue(snapshot.conformsTo)}</dd>
            </div>
          )}
          {snapshot.describedBy && (
            <div>
              <dt className="font-medium text-text-muted">Described By</dt>
              <dd>{renderValue(snapshot.describedBy)}</dd>
            </div>
          )}
          {snapshot.isPartOf && (
            <div>
              <dt className="font-medium text-text-muted">Is Part Of</dt>
              <dd>{renderValue(snapshot.isPartOf)}</dd>
            </div>
          )}
          {snapshot.landingPage && (
            <div>
              <dt className="font-medium text-text-muted">Landing Page</dt>
              <dd>{renderValue(snapshot.landingPage)}</dd>
            </div>
          )}
          {snapshot.issued && (
            <div>
              <dt className="font-medium text-text-muted">Issued</dt>
              <dd>{renderValue(snapshot.issued)}</dd>
            </div>
          )}
          {snapshot.language && (
            <div>
              <dt className="font-medium text-text-muted">Language</dt>
              <dd>{renderValue(snapshot.language)}</dd>
            </div>
          )}
          {snapshot.bureauCode && (
            <div>
              <dt className="font-medium text-text-muted">Bureau Code</dt>
              <dd>{renderValue(snapshot.bureauCode)}</dd>
            </div>
          )}
          {snapshot.programCode && (
            <div>
              <dt className="font-medium text-text-muted">Program Code</dt>
              <dd>{renderValue(snapshot.programCode)}</dd>
            </div>
          )}
          {snapshot.systemOfRecords && (
            <div>
              <dt className="font-medium text-text-muted">System of Records</dt>
              <dd>{renderValue(snapshot.systemOfRecords)}</dd>
            </div>
          )}
          {snapshot.dataQuality !== undefined && snapshot.dataQuality !== null && (
            <div>
              <dt className="font-medium text-text-muted">Data Quality</dt>
              <dd>{renderValue(snapshot.dataQuality)}</dd>
            </div>
          )}
        </dl>
      </section>

      {/* Distributions */}
      {distributions.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">
            Distributions
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <th className="text-left px-3 py-2 font-medium text-text-tertiary">
                    Title
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-text-tertiary">
                    Format
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-text-tertiary">
                    Download URL
                  </th>
                </tr>
              </thead>
              <tbody>
                {distributions.map((dist, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="px-3 py-2">
                      {(dist.title as string) || "—"}
                    </td>
                    <td className="px-3 py-2">
                      {(dist.format as string) || "—"}
                    </td>
                    <td className="px-3 py-2 truncate max-w-xs">
                      {(dist.downloadURL as string) || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
