import { ClientNotification } from "../api/client";

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getIcon(type: string): string {
  switch (type) {
    case "action_item":
      return "✓";
    case "message":
      return "💬";
    case "document":
      return "📄";
    default:
      return "•";
  }
}

interface NotificationItemProps {
  notification: ClientNotification;
  onRead?: (id: string) => void;
}

export function NotificationItem({ notification, onRead }: NotificationItemProps) {
  const isUnread = !notification.readAt;

  return (
    <div
      onClick={() => onRead?.(notification.id)}
      style={{
        padding: "12px",
        borderBottom: "1px solid #e5e5e5",
        cursor: "pointer",
        backgroundColor: isUnread ? "#f9f9f9" : "transparent",
        transition: "background-color 0.2s",
      }}
      onMouseEnter={(e) => {
        if (isUnread) {
          (e.currentTarget as HTMLDivElement).style.backgroundColor = "#f0f0f0";
        }
      }}
      onMouseLeave={(e) => {
        if (isUnread) {
          (e.currentTarget as HTMLDivElement).style.backgroundColor = "#f9f9f9";
        }
      }}
    >
      <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
        <div style={{ fontSize: "20px", flexShrink: 0 }}>{getIcon(notification.type)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
            <div
              style={{
                fontWeight: isUnread ? 600 : 400,
                fontSize: "14px",
                color: "#1a1a1a",
              }}
            >
              {notification.title}
            </div>
            {isUnread && (
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: "#ff6b35",
                  flexShrink: 0,
                }}
              />
            )}
          </div>
          <div
            style={{
              fontSize: "13px",
              color: "#666",
              marginTop: "4px",
              lineHeight: "1.4",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {notification.body}
          </div>
          <div style={{ fontSize: "12px", color: "#999", marginTop: "4px" }}>
            {formatTime(notification.createdAt)}
          </div>
        </div>
      </div>
    </div>
  );
}
