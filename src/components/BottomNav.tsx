import React from "react";
import { Users, Film, MessageCircle, User } from "lucide-react";
import { Profile } from "../types/database";

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: any) => void;
  unreadCount?: number;
  currentUser: Profile | null;
  onOpenAuth: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  unreadCount = 0,
  currentUser,
  onOpenAuth,
}) => {
  const navItems = [
    {
      id: "community",
      label: "समुदाय",
      icon: Users,
      badge: 0,
    },
    {
      id: "reels",
      label: "रील्स",
      icon: Film,
      badge: 0,
    },
    {
      id: "messages",
      label: "चैट",
      icon: MessageCircle,
      badge: unreadCount,
    },
    {
      id: "profile",
      label: "प्रोफाइल",
      icon: User,
      badge: 0,
    },
  ];

  return (
    <nav
      id="mobile-bottom-navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-glass-surface-strong)]/95 backdrop-blur-md border-t border-[var(--color-border-glass)] px-2 pt-1.5 flex items-center justify-around shadow-glass-lg"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 6px)" }}
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            id={`bottom-nav-${item.id}`}
            type="button"
            onClick={() => onTabChange(item.id)}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-1 transition-all cursor-pointer ${
              isActive
                ? "text-[var(--color-primary)] font-bold"
                : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] font-medium"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            <div className="relative">
              <div
                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                    : "text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-primary)]"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5px]" : ""}`} />
              </div>

              {item.badge > 0 && (
                <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 border-2 border-[var(--color-background)] text-[10px] text-white flex items-center justify-center font-bold">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </div>

            <span
              className={`text-[11px] leading-tight tracking-tight mt-1 ${
                isActive ? "font-bold text-[var(--color-primary)]" : "text-[var(--color-text-tertiary)]"
              }`}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};