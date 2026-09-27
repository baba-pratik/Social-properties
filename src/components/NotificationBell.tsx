import React, { useState, useEffect } from "react";
import { Bell, X, MessageSquare, Heart, Bookmark, ArrowRight } from "lucide-react";
import { Notification } from "../types/database";
import { formatRelativeTime } from "../lib/utils";

interface NotificationBellProps {
  currentUser: any;
  unreadCount: number;
  onNotificationClick?: (notification: Notification) => void;
  onMarkAllRead?: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  currentUser,
  unreadCount,
  onNotificationClick,
  onMarkAllRead,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    loadNotifications();
  }, [currentUser]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const { fetchNotifications } = await import("../lib/supabase");
      const data = await fetchNotifications(currentUser.id, 30);
      setNotifications(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    const { markNotificationRead } = await import("../lib/supabase");
    await markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const handleMarkAllRead = async () => {
    const { markAllNotificationsRead } = await import("../lib/supabase");
    await markAllNotificationsRead(currentUser.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    onMarkAllRead?.();
  };

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "new_message":
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case "liked":
        return <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />;
      case "commented":
        return <MessageSquare className="w-4 h-4 text-emerald-500" />;
      case "saved":
        return <Bookmark className="w-4 h-4 text-amber-500 fill-amber-500" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  const handleNotificationAction = (notification: Notification) => {
    if (!notification.is_read) handleMarkRead(notification.id);
    // Navigate based on target_type
    let href = "/";
    if (notification.target_type === "property" && notification.target_id) {
      href = `/property/${notification.target_id}`;
    } else if (notification.target_type === "reel" && notification.target_id) {
      href = `/reel/${notification.target_id}`;
    } else if (notification.target_type === "chat" && notification.target_id) {
      href = `/messages/${notification.target_id}`;
    }
    if (href !== "/") {
      window.dispatchEvent(new CustomEvent("navigate", { detail: { href } }));
    }
    onNotificationClick?.(notification);
    setIsOpen(false);
  };

  if (!currentUser) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl transition-colors cursor-pointer text-slate-700 hover:bg-slate-100 hover:text-emerald-600"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsOpen(false)} />
      )}

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
            <h3 className="font-bold text-slate-900">सूचनाएं</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-emerald-600 hover:underline"
                >
                  सभी पढ़ें
                </button>
              )}
              <button onClick={() => setIsOpen(false)} className="p-1 text-slate-500 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-slate-500">लोड हो रहा है...</div>
            ) : notifications.filter(n => !n.is_read).length === 0 ? (
              <div className="p-8 text-center text-slate-500">कोई सूचना नहीं</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {notifications.filter(n => !n.is_read).map((n) => (
                  <li
                    key={n.id}
                    onClick={() => handleNotificationAction(n)}
                    className={`px-4 py-3 cursor-pointer transition-colors ${
                      n.is_read ? "bg-white" : "bg-emerald-50/50"
                    } hover:bg-slate-50`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                        {getIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${n.is_read ? "text-slate-600" : "font-semibold text-slate-900"}`}>
                          {n.content}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {formatRelativeTime(n.created_at)}
                        </p>
                      </div>
                      {!n.is_read && (
                        <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};