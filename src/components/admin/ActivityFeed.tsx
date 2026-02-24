interface Activity {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName: string;
  userId?: string | null;
  userName?: string | null;
  details?: string | null;
  createdAt: string | Date;
}

interface ActivityFeedProps {
  activities: Activity[];
}

const ACTION_LABELS: Record<string, string> = {
  "dataset:created": "created dataset",
  "dataset:updated": "updated dataset",
  "dataset:deleted": "deleted dataset",
  "organization:created": "created organization",
  "organization:updated": "updated organization",
  "organization:deleted": "deleted organization",
};

function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return then.toLocaleDateString();
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  if (activities.length === 0) {
    return <p className="text-sm text-text-muted">No recent activity</p>;
  }

  return (
    <ul className="space-y-3">
      {activities.map((activity) => (
        <li key={activity.id} className="flex items-start gap-3 text-sm">
          <div className="flex-1">
            <span className="font-medium">{activity.userName || "System"}</span>{" "}
            <span className="text-text-tertiary">
              {ACTION_LABELS[activity.action] || activity.action}
            </span>{" "}
            <span className="font-medium">{activity.entityName}</span>
          </div>
          <span className="text-text-muted whitespace-nowrap text-xs">
            {formatRelativeTime(activity.createdAt)}
          </span>
        </li>
      ))}
    </ul>
  );
}
