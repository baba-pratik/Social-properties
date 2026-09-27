import React, { useState } from "react";
import { X, Home, Film, Users, Plus } from "lucide-react";
import { Profile } from "../types/database";

interface CreatePostOption {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  color: string;
  bg: string;
}

const options: CreatePostOption[] = [
  {
    id: "property",
    icon: Home,
    label: "प्रॉपर्टी पोस्ट",
    description: "बिक्री या किराए के लिए प्रॉपर्टी लिस्ट करें",
    color: "var(--color-primary)",
    bg: "linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))",
  },
  {
    id: "reel",
    icon: Film,
    label: "रील",
    description: "शॉर्ट वीडियो वॉकथ्रू बनाएं",
    color: "var(--color-primary-light)",
    bg: "linear-gradient(135deg, var(--color-primary-light), var(--color-primary))",
  },
  {
    id: "community",
    icon: Users,
    label: "कम्युनिटी पोस्ट",
    description: "अपडेट, सवाल या जानकारी शेयर करें",
    color: "var(--color-primary-dark)",
    bg: "linear-gradient(135deg, var(--color-primary-dark), #047857)",
  },
];

interface CreatePostSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOption: (optionId: string) => void;
  currentUser: Profile | null;
}

export const CreatePostSheet: React.FC<CreatePostSheetProps> = ({
  isOpen,
  onClose,
  onSelectOption,
  currentUser,
}) => {
  if (!isOpen || !currentUser) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="w-full max-w-md bg-[var(--color-surface)] rounded-t-3xl shadow-glass-lg border-t border-[var(--color-border-glass)] animate-in slide-in-from-bottom-full duration-300" onClick={(e) => e.stopPropagation()}>
        {/* Handle */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">पोस्ट बनाएं</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--color-background)] transition-colors text-[var(--color-text-secondary)]"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {options.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.id}
                onClick={() => {
                  onSelectOption(opt.id);
                  onClose();
                }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border border-[var(--color-border)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-primary)]/5 transition-all duration-200 text-left"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-glass flex-shrink-0"
                  style={{ background: opt.bg }}
                >
                  <Icon className="w-6 h-6" strokeWidth={2.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[var(--color-text-primary)] text-sm">{opt.label}</p>
                  <p className="text-xs text-[var(--color-text-tertiary)] truncate">{opt.description}</p>
                </div>
                <Plus className="w-5 h-5 text-[var(--color-text-tertiary)]" />
              </button>
            );
          })}

          {/* Future extensibility placeholder */}
          <div className="pt-2 border-t border-[var(--color-border)]">
            <button className="w-full flex items-center gap-4 p-4 rounded-2xl border border-dashed border-[var(--color-border)] text-[var(--color-text-tertiary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-all duration-200">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[var(--color-background)]">
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <p className="font-medium text-sm">अपनी सर्विस जोड़ें</p>
                <p className="text-xs text-[var(--color-text-tertiary)]">जल्द आ रहा है</p>
              </div>
            </button>
          </div>
        </div>

        {/* Bottom safe area */}
        <div className="pb-4" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }} />
      </div>
    </div>
  );
};

export default CreatePostSheet;