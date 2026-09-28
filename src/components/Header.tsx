import React from "react";
import { Search, Menu } from "lucide-react";
import { Profile } from "../types/database";
import { NotificationBell } from "./NotificationBell";
import { BrandMark } from "./BrandMark";

interface HeaderProps {
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
  activeTab,
  onTabChange,
  currentUser,
  onOpenAuth,
  onOpenSettings,
  unreadCount,
  compact = false,
}) => {
  return (
    <header className={`md:hidden sticky top-0 z-40 bg-[var(--color-glass-surface-strong)]/95 backdrop-blur-md border-b border-[var(--color-border-glass)] shadow-glass ${compact ? 'py-1.5' : 'py-2'}`}>
      <div className="max-w-full mx-auto px-3 flex items-center justify-between gap-2 min-w-0">
        {/* Left: Brand - responsive, truncates text on narrow screens */}
        <button
          onClick={() => onTabChange("community")}
          className="flex items-center gap-1.5 cursor-pointer select-none shrink-0"
          aria-label="Social Properties - Home"
        >
          <BrandMark size="md" showText={true} />
        </button>

        {/* Right: Action Icons - fixed width, never shrink, never wrap */}
        <div className="flex items-center gap-1 shrink-0 flex-nowrap">
          <button
            onClick={() => onTabChange("search")}
            title="खोजें"
            className={`p-2 rounded-xl transition-all cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0 ${
              activeTab === "search"
                ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-primary)]"
            }`}
            aria-label="Search"
          >
            <Search className="w-5 h-5 flex-shrink-0" />
          </button>

          <div className="flex-shrink-0">
            <NotificationBell
              currentUser={currentUser}
              unreadCount={unreadCount}
            />
          </div>

          <button
            onClick={onOpenSettings}
            title="मेनू"
            className="p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-primary)] rounded-xl transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0"
            aria-label="Menu"
          >
            <Menu className="w-5 h-5 flex-shrink-0" />
          </button>
        </div>
      </div>
    </header>
  );
};