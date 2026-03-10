import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

const STATUS_COLORS: Record<string, string> = {
  // Success
  published: "bg-success-subtle text-success-text hover:bg-success-subtle",
  active: "bg-success-subtle text-success-text hover:bg-success-subtle",
  success: "bg-success-subtle text-success-text hover:bg-success-subtle",
  approved: "bg-success-subtle text-success-text hover:bg-success-subtle",
  // Warning
  draft: "bg-warning-subtle text-warning-text hover:bg-warning-subtle",
  pending: "bg-warning-subtle text-warning-text hover:bg-warning-subtle",
  partial: "bg-warning-subtle text-warning-text hover:bg-warning-subtle",
  pending_review: "bg-warning-subtle text-warning-text hover:bg-warning-subtle",
  // Danger
  rejected: "bg-danger-subtle text-danger-text hover:bg-danger-subtle",
  failed: "bg-danger-subtle text-danger-text hover:bg-danger-subtle",
  error: "bg-danger-subtle text-danger-text hover:bg-danger-subtle",
  // Neutral
  archived: "bg-surface-alt text-text-tertiary hover:bg-surface-alt",
  disabled: "bg-surface-alt text-text-tertiary hover:bg-surface-alt",
};

interface StatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const colors = STATUS_COLORS[status];

  return (
    <Badge
      variant={colors ? "default" : "outline"}
      className={cn(colors, className)}
    >
      {label || status}
    </Badge>
  );
}
