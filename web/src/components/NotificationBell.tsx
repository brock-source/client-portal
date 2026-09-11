import { useEffect, useRef, useState } from "react";
import { api, ClientNotification } from "../api/client";
import { NotificationItem } from "./NotificationItem";

export function NotificationBell() {
  const [notifications, setNotifications] = useState<ClientNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const result = await api.client.notifications();
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        bellRef.current &&
        !bellRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleReadNotification = async (id: string) => {
    try {
      await api.client.readNotification(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.client.readAllNotifications();
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    }
  };

  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
      <button
        ref={bellRef}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: "20px",
          position: "relative",
          padding: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#333",
          transition: "opacity 0.2s",
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = "0.7")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = "1")}
      >
        🔔
        {unreadCount > 0 && (
          <div
            style={{
              position: "absolute",
              top: "0",
              right: "0",
              backgroundColor: "#ff6b35",
              color: "white",
              borderRadius: "50%",
              width: "20px",
              height: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
              fontWeight: "bold",
              border: "2px solid white",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </div>
        )}
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          style={{
            position: "absolute",
            top: "100%",
            right: "0",
            marginTop: "8px",
            width: "320px",
            backgroundColor: "white",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            zIndex: 1000,
            maxHeight: "400px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid #e5e5e5",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ fontWeight: 600, fontSize: "14px", color: "#1a1a1a" }}>
              Notifications {unreadCount > 0 && `(${unreadCount})`}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                style={{
                  background: "none",
                  border: "none",
                  color: "#0066cc",
                  cursor: "pointer",
                  fontSize: "12px",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  transition: "background-color 0.2s",
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "#f0f0f0")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent")}
              >
                Mark all read
              </button>
            )}
          </div>

          <div
            style={{
              overflowY: "auto",
              flex: 1,
            }}
          >
            {isLoading ? (
              <div style={{ padding: "20px", textAlign: "center", color: "#999", fontSize: "14px" }}>
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: "20px", textAlign: "center", color: "#999", fontSize: "14px" }}>
                No notifications
              </div>
            ) : (
              notifications.slice(0, 10).map((notification) => (
                <NotificationItem key={notification.id} notification={notification} onRead={handleReadNotification} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
