import { DownloadLink } from "@/components/analytics/DownloadLink";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown } from "lucide-react";

interface Distribution {
  id?: string;
  title?: string | null;
  description?: string | null;
  downloadURL?: string | null;
  accessURL?: string | null;
  mediaType?: string | null;
  format?: string | null;
}

interface DistributionListProps {
  distributions: Distribution[];
  onRemove?: (index: number) => void;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
  editable?: boolean;
}

export function DistributionList({
  distributions,
  onRemove,
  onMoveUp,
  onMoveDown,
  editable = false,
}: DistributionListProps) {
  if (distributions.length === 0) {
    return <p className="text-sm text-text-muted">No distributions</p>;
  }

  return (
    <ul className="space-y-2" data-testid="distribution-list">
      {distributions.map((dist, index) => (
        <li
          key={dist.id || index}
          className="flex items-center justify-between rounded border border-border p-3"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">
                {dist.title || `Distribution ${index + 1}`}
              </span>
              {dist.format && (
                <span className="rounded bg-primary-subtle px-2 py-0.5 text-xs text-primary-subtle-text">
                  {dist.format}
                </span>
              )}
            </div>
            {dist.downloadURL && (
              <DownloadLink
                href={dist.downloadURL}
                distributionId={dist.id}
                className="text-xs text-primary hover:underline truncate block"
              >
                {dist.downloadURL}
              </DownloadLink>
            )}
          </div>
          {editable && (
            <div className="ml-2 flex items-center gap-1">
              {onMoveUp && onMoveDown && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    disabled={index === 0}
                    onClick={() => onMoveUp(index)}
                    aria-label={`Move distribution ${index + 1} up`}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    disabled={index === distributions.length - 1}
                    onClick={() => onMoveDown(index)}
                    aria-label={`Move distribution ${index + 1} down`}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </>
              )}
              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="ml-1 text-danger hover:opacity-80 text-sm"
                  aria-label={`Remove distribution ${index + 1}`}
                >
                  Remove
                </button>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
