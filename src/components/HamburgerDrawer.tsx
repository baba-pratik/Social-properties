import React from 'react';
import { X, Info, FileText, Shield, HelpCircle, LogOut, LogIn, User, Home, Search, Film } from 'lucide-react';
import { Profile } from '../types/database';
import { getSupabaseClient } from '../lib/supabase';
import { useUserStore } from '../store/useUserStore';

interface HamburgerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Profile | null;
  onOpenAuth: () => void;
  onOpenSection: (section: 'about' | 'terms' | 'privacy' | 'help') => void;
  onNavigateTab: (tab: any) => void;
}

export const HamburgerDrawer: React.FC<HamburgerDrawerProps> = ({
  isOpen,
  onClose,
  currentUser,
  onOpenAuth,
  onOpenSection,
  onNavigateTab
}) => {
  const { setSessionUser, setCurrentUser } = useUserStore();

  const handleLogout = async () => {
    const c = getSupabaseClient();
    if (c) await c.auth.signOut();
    setSessionUser(null);
    setCurrentUser(null);
    onClose();
    onNavigateTab("feed");
  };

  const handleLogin = () => {
    onClose();
    onOpenAuth();
  };

  const handleNav = (tab: string) => {
    onClose();
    onNavigateTab(tab);
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm transition-opacity" 
          onClick={onClose} 
        />
      )}
      
      {/* Drawer */}
      <div 
        className={`fixed top-0 right-0 h-full w-[280px] sm:w-[320px] bg-white z-[110] transform transition-transform duration-300 ease-in-out flex flex-col shadow-2xl ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">मेनू (Menu)</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Section: User Profile */}
        <div className="p-6 border-b border-slate-100 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden shrink-0">
            {currentUser?.avatar_url ? (
              <img src={currentUser.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xl">
                {currentUser?.full_name?.charAt(0) || "U"}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            {currentUser ? (
              <>
                <h3 className="font-bold text-slate-900 truncate text-lg">
                  {currentUser.full_name || "उपयोगकर्ता"}
                </h3>
                <p className="text-sm text-slate-500 truncate">{currentUser.phone || "No details"}</p>
              </>
            ) : (
              <h3 className="font-bold text-slate-900 text-lg">अतिथि (Guest)</h3>
            )}
          </div>
        </div>

        {/* Middle Section: Menu Links */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-4 space-y-1">
            <button 
              onClick={() => handleNav("feed")}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors text-slate-700 font-medium"
            >
              <Home className="w-5 h-5 text-emerald-600" />
              होम (Home)
            </button>
            <button 
              onClick={() => handleNav("search")}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors text-slate-700 font-medium"
            >
              <Search className="w-5 h-5 text-emerald-600" />
              सर्च (Search)
            </button>
            <button 
              onClick={() => handleNav("reels")}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors text-slate-700 font-medium"
            >
              <Film className="w-5 h-5 text-emerald-600" />
              रील्स (Reels)
            </button>
            <button 
              onClick={() => handleNav("profile")}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors text-slate-700 font-medium"
            >
              <User className="w-5 h-5 text-emerald-600" />
              प्रोफ़ाइल (Profile)
            </button>
          </div>

          <div className="px-4 py-4 space-y-1 border-t border-slate-100">
            <button 
              onClick={() => { onClose(); onOpenSection("about"); }}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors text-slate-600 font-medium text-sm"
            >
              <Info className="w-5 h-5 text-slate-400" />
              हमारे बारे में (About)
            </button>
            <button 
              onClick={() => { onClose(); onOpenSection("privacy"); }}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors text-slate-600 font-medium text-sm"
            >
              <Shield className="w-5 h-5 text-slate-400" />
              गोपनीयता नीति (Privacy)
            </button>
            <button 
              onClick={() => { onClose(); onOpenSection("terms"); }}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors text-slate-600 font-medium text-sm"
            >
              <FileText className="w-5 h-5 text-slate-400" />
              नियम एवं शर्तें (Terms)
            </button>
            <button 
              onClick={() => { onClose(); onOpenSection("help"); }}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors text-slate-600 font-medium text-sm"
            >
              <HelpCircle className="w-5 h-5 text-slate-400" />
              सहायता (Support)
            </button>
          </div>
        </div>

        {/* Bottom Section: Auth Action */}
        <div className="p-6 border-t border-slate-100">
          {currentUser ? (
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl transition-colors"
            >
              <LogOut className="w-5 h-5" />
              लॉगआउट (Logout)
            </button>
          ) : (
            <button 
              onClick={handleLogin}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors shadow-sm"
            >
              <LogIn className="w-5 h-5" />
              लॉगिन करें (Login)
            </button>
          )}
        </div>
      </div>
    </>
  );
};
