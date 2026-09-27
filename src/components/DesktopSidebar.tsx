import React from "react";
import { Users, Film, Home, MessageCircle, Settings, HelpCircle, LogOut, User, Bell, Bookmark, MapPin, Building2, Film as FilmIcon, Info } from "lucide-react";
import { Profile } from "../types/database";
import { BrandMark } from "./BrandMark";
import { getSupabaseClient } from "../lib/supabase";

interface DesktopSidebarProps {
  activeTab: string;
  onTabChange: (tab: any) => void;
  unreadCount?: number;
  currentUser: Profile | null;
  onOpenAuth: () => void;
  onOpenAbout: () => void;
  onLogout: () => void;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  activeTab,
  onTabChange,
  unreadCount = 0,
  currentUser,
  onOpenAuth,
  onOpenAbout,
  onLogout,
}) => {
  const navItems = [
    { id: "community", label: "समुदाय", icon: Users },
    { id: "reels", label: "रील्स", icon: Film },
    { id: "messages", label: "चैट", icon: MessageCircle },
    { id: "profile", label: "प्रोफ़ाइल", icon: User },
  ];

  const bottomItems = [
    { id: "myProperties", label: "मेरी प्रॉपर्टीज", icon: Building2 },
    { id: "myReels", label: "मेरी रील्स", icon: FilmIcon },
    { id: "saved", label: "सहेजी गईं", icon: Bookmark },
    { id: "notifications", label: "सूचनाएं", icon: Bell },
    { id: "location", label: "स्थान", icon: MapPin },
    { id: "settings", label: "सेटिंग्स", icon: Settings },
    { id: "help", label: "सहायता", icon: HelpCircle },
    { id: "about", label: "हमारे बारे में", icon: Info },
    { id: "logout", label: "लॉगआउट", icon: LogOut },
  ];

  return (
    <aside className="hidden md:flex md:flex-col fixed left-0 top-0 h-screen w-64 bg-[var(--color-surface)] border-r border-[var(--color-border)] z-50 flex-col">
      {/* Brand Area */}
      <div
        onClick={() => onTabChange("community")}
        className="flex items-center gap-3 cursor-pointer select-none p-4 border-b border-[var(--color-border)] hover:bg-[var(--color-background)] transition-colors"
      >
        <BrandMark size="lg" showText={true} />
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 flex flex-col gap-1 p-3 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl font-semibold transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)] shadow-glass"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-background)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <div className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 ${
                isActive
                  ? "bg-[var(--color-primary)] text-white shadow-glass"
                  : "bg-[var(--color-background)] text-[var(--color-text-tertiary)] hover:bg-[var(--color-border)] hover:text-[var(--color-primary)]"
              }`}>
                <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5px] fill-current" : ""}`} />
              </div>
              <span className="text-sm tracking-tight">{item.label}</span>
              {item.id === "messages" && unreadCount > 0 && (
                <span className="ml-auto bg-[var(--color-primary)] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-glass">
                  {unreadCount}
                </span>
              )}
            </button>
          );
        })}

        <div className="border-t border-[var(--color-border)] my-2" />

        {bottomItems.map((item) => {
          const Icon = item.icon;
          const handleClick = () => {
            switch (item.id) {
              case "myProperties":
              case "myReels":
                onTabChange("profile");
                break;
              case "about":
                onOpenAbout();
                break;
              case "logout":
                onLogout();
                break;
              default:
                // other items: saved, notifications, location, settings, help - no action yet
                break;
            }
          };
          return (
            <button
              key={item.id}
              onClick={handleClick}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl font-medium transition-all duration-200 cursor-pointer text-[var(--color-text-secondary)] hover:bg-[var(--color-background)] hover:text-[var(--color-text-primary)]`}
            >
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--color-background)] text-[var(--color-text-tertiary)] hover:bg-[var(--color-border)] hover:text-[var(--color-primary)] transition-all duration-200">
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-sm tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Profile Mini */}
      {currentUser && (
        <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-background)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[var(--color-primary)] to-[var(--color-primary-dark)] flex items-center justify-center font-bold text-white">
              {currentUser.avatar_url ? (
                <img src={currentUser.avatar_url} alt="Profile" className="w-full h-full rounded-full object-cover" />
              ) : (
                currentUser.full_name?.charAt(0) || "U"
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[var(--color-text-primary)] truncate">{currentUser.full_name}</p>
              <p className="text-xs text-[var(--color-text-tertiary)] truncate capitalize">
                {currentUser.is_verified_broker ? 'ब्रोकर' : 'उपयोगकर्ता'}
              </p>
            </div>
          </div>
        </div>
      )}

      {!currentUser && (
        <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-background)]">
          <button
            onClick={onOpenAuth}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-bold rounded-xl transition-colors shadow-glass"
          >
            <LogOut className="w-5 h-5 rotate-180" />
            लॉगिन करें
          </button>
        </div>
      )}
    </aside>
  );
};