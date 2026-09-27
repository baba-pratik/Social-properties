import React from "react";
import { Building2, Search, Menu, MapPin, ChevronDown } from "lucide-react";
import { Profile } from "../types/database";
import { NotificationBell } from "./NotificationBell";
import { BrandMark } from "./BrandMark";

interface HeaderProps {
  currentCity: string;
  onCityChange: (city: string) => void;
  activeTab: string;
  onTabChange: (tab: any) => void;
  currentUser: Profile | null;
  onOpenAuth: () => void;
  onOpenSettings: () => void;
  isSupabaseActive: boolean;
  unreadCount: number;
  savedCount?: number;
  compact?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentCity,
  onCityChange,
  activeTab,
  onTabChange,
  currentUser,
  onOpenAuth,
  onOpenSettings,
  unreadCount,
  compact = false,
}) => {
  const cities = ["सभी", "बोकारो", "गिरिडीह"] as const;

  return (
    <header className={`md:hidden sticky top-0 z-40 bg-[var(--color-glass-surface-strong)]/95 backdrop-blur-md border-b border-[var(--color-border-glass)] shadow-glass ${compact ? 'py-1' : 'py-2'}`}>
      <div className="max-w-full mx-auto px-3 flex items-center justify-between gap-2">
        {/* Brand */}
        <button
          onClick={() => onTabChange("community")}
          className="flex items-center gap-2 cursor-pointer select-none shrink-0"
          aria-label="Social Properties - Home"
        >
          <BrandMark size="md" showText={true} />
        </button>

        {/* Location Selector */}
        <div className="flex-1 flex items-center justify-center">
          <select
            value={currentCity}
            onChange={(e) => onCityChange(e.target.value)}
            className={`
              bg-[var(--color-surface)]
              border border-[var(--color-border)]
              text-xs font-semibold text-[var(--color-text-primary)]
              rounded-full px-3 py-1.5
              appearance-none
              cursor-pointer
              pr-8
              bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%252310b981%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')]
              bg-no-repeat bg-right-2 bg-center
              focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]
            `}
          >
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onTabChange("search")}
            title="खोजें"
            className={`p-2 rounded-xl transition-all cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center ${
              activeTab === "search"
                ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-primary)]"
            }`}
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </button>

          <NotificationBell
            currentUser={currentUser}
            unreadCount={unreadCount}
          />

          <button
            onClick={onOpenSettings}
            title="मेनू"
            className="p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-primary)] rounded-xl transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};