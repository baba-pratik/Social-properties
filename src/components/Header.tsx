import React from "react";
import { Building2, Search, Bell, Menu, MapPin, User } from "lucide-react";
import { Profile } from "../types/database";

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
}) => {
  return (
    <header className="md:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-lg mx-auto px-4 py-2.5 flex items-center justify-between gap-2">
        {/* Logo & Branding */}
        <div
          onClick={() => onTabChange("feed")}
          className="flex items-center gap-2 cursor-pointer select-none shrink-0"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
            <Building2 className="w-4.5 h-4.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-black tracking-tight text-slate-900 leading-tight">
              Social Properties
            </span>
            <span className="text-[10px] font-semibold text-emerald-700 leading-none">
              सोशल प्रॉपर्टीज
            </span>
          </div>
        </div>

        {/* Location Selector */}
        <div className="flex items-center bg-slate-100 hover:bg-slate-200/80 rounded-full px-2 py-1 transition-colors">
          <MapPin className="w-3 h-3 text-emerald-600 shrink-0 mr-1" />
          <select
            value={currentCity}
            onChange={(e) => onCityChange(e.target.value)}
            className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer pr-1"
          >
            <option value="सभी">सभी शहर</option>
            <option value="बोकारो">बोकारो</option>
            <option value="गिरिडीह">गिरिडीह</option>
          </select>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Top Header Search Icon */}
          <button
            onClick={() => onTabChange("search")}
            title="प्रॉपर्टी खोजें (Search)"
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              activeTab === "search"
                ? "bg-emerald-50 text-emerald-600 font-bold"
                : "text-slate-700 hover:bg-slate-100 hover:text-emerald-600"
            }`}
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Settings / Menu Drawer */}
          <button
            onClick={onOpenSettings}
            title="मेन्यू"
            className="p-1.5 text-slate-700 hover:bg-slate-100 hover:text-emerald-600 rounded-xl transition-colors cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};


