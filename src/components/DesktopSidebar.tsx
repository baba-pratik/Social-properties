import React from "react";
import { Building2, Home, Search, PlusSquare, MessageCircle, Heart, User, Film, LogOut } from "lucide-react";
import { Profile } from "../types/database";

interface DesktopSidebarProps {
  activeTab: string;
  onTabChange: (tab: any) => void;
  unreadCount?: number;
  currentUser: Profile | null;
  onOpenAuth: () => void;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  activeTab,
  onTabChange,
  unreadCount = 0,
  currentUser,
  onOpenAuth,
}) => {
  const navItems = [
    { id: "feed", label: "होम (Home)", icon: Home },
    { id: "reels", label: "रील्स (Reels)", icon: Film },
    { id: "upload", label: "अपलोड (Upload)", icon: PlusSquare },
    { id: "search", label: "सर्च (Search)", icon: Search },
    { id: "messages", label: "चैट (Chat)", icon: MessageCircle },
    { id: "saved", label: "सेव्ड (Saved)", icon: Heart },
  ];

  return (
    <div className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-64 lg:w-72 bg-white border-r border-slate-200 py-8 px-4 z-50">
      {/* Logo */}
      <div
        onClick={() => onTabChange("feed")}
        className="flex items-center gap-3 cursor-pointer select-none mb-10 px-2 group"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
          <Building2 className="w-6 h-6" />
        </div>
        <span className="text-xl font-black tracking-tight text-slate-900 group-hover:text-emerald-700 transition-colors" style={{ fontFamily: 'var(--font-heading)' }}>
          Social Properties
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 flex flex-col gap-2">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex items-center gap-4 px-3 py-3 rounded-xl font-semibold transition-all duration-300 cursor-pointer group ${
                isActive
                  ? "bg-gradient-to-r from-emerald-50/80 to-transparent text-emerald-900 border-l-4 border-emerald-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-4 border-transparent"
              }`}
            >
              <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 ${isActive ? 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-md shadow-emerald-500/30' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-800'}`}>
                <item.icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive && item.id !== 'search' && item.id !== 'upload' ? 'fill-white stroke-white' : ''}`} />
              </div>
              <span className="text-base tracking-tight">{item.label}</span>
              {item.id === "messages" && unreadCount > 0 && (
                <span className="ml-auto bg-gradient-to-br from-rose-400 to-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md shadow-rose-500/30">
                  {unreadCount}
                </span>
              )}
            </button>
          );
        })}

        <button
          onClick={() => {
            if (currentUser) onTabChange("profile");
            else onOpenAuth();
          }}
          className={`flex items-center gap-4 px-3 py-3 rounded-xl font-semibold transition-all duration-300 cursor-pointer group ${
            activeTab === "profile"
              ? "bg-gradient-to-r from-emerald-50/80 to-transparent text-emerald-900 border-l-4 border-emerald-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-4 border-transparent"
          }`}
        >
          <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300 ${activeTab === 'profile' ? 'bg-gradient-to-br from-emerald-400 to-teal-500 shadow-md shadow-emerald-500/30 ring-2 ring-emerald-500/20' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-800'}`}>
            {currentUser?.avatar_url ? (
              <img
                src={currentUser.avatar_url}
                alt="Profile"
                className="w-full h-full rounded-lg object-cover"
              />
            ) : (
              <User className={`w-4 h-4 transition-transform group-hover:scale-110 ${activeTab === "profile" ? "fill-white stroke-white" : ""}`} />
            )}
          </div>
          <span className="text-base tracking-tight">{currentUser ? "प्रोफ़ाइल (Profile)" : "लॉगिन करें"}</span>
        </button>
      </nav>

      {/* User Profile Mini */}
      {currentUser && (
        <div className="mt-auto border-t border-slate-100 pt-5 px-2 flex items-center gap-3">
          {currentUser.avatar_url ? (
            <img
              src={currentUser.avatar_url}
              alt="Profile"
              className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              {currentUser.full_name?.charAt(0) || "U"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">{currentUser.full_name}</p>
            <p className="text-xs text-slate-500 truncate capitalize">
              {currentUser.is_verified_broker ? 'ब्रोकर' : 'उपयोगकर्ता'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
