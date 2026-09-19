import React from "react";
import { Home, Film, PlusSquare, MessageCircle, User } from "lucide-react";
import { Profile } from "../types/database";

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: any) => void;
  unreadCount?: number;
  savedCount?: number;
  currentUser: Profile | null;
  onOpenAuth: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  unreadCount = 0,
}) => {
  const navItems = [
    {
      id: "feed",
      label: "घर",
      icon: Home,
      badge: 0,
    },
    {
      id: "reels",
      label: "रील्स",
      icon: Film,
      badge: 0,
    },
    {
      id: "upload",
      label: "अपलोड",
      icon: PlusSquare,
      badge: 0,
      highlight: true,
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
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 pt-1.5 flex items-center justify-around shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.08)]"
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
                ? "text-emerald-700 font-bold"
                : "text-slate-500 hover:text-slate-900 font-medium"
            }`}
          >
            <div className="relative">
              <div
                className={`w-9 h-8 flex items-center justify-center rounded-xl transition-all duration-200 ${
                  isActive
                    ? item.highlight
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/30"
                      : "bg-emerald-50 text-emerald-600"
                    : item.highlight
                    ? "bg-emerald-600/10 text-emerald-700"
                    : "text-slate-600"
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    isActive && !item.highlight ? "stroke-[2.5px]" : ""
                  }`}
                />
              </div>

              {/* Badges for unread or saved count */}
              {item.badge > 0 && (
                <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 border border-white text-[10px] text-white flex items-center justify-center font-bold">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </div>

            {/* Hindi Label */}
            <span
              className={`text-[11px] leading-tight tracking-tight mt-0.5 ${
                isActive ? "font-bold text-emerald-700" : "text-slate-600"
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

