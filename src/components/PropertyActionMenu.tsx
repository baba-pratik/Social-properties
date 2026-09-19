import React, { useState, useRef, useEffect } from "react";
import { MoreVertical, MoreHorizontal, Edit3, Lock, RefreshCw, Trash2 } from "lucide-react";
import { Property, Profile } from "../types/database";

interface PropertyActionMenuProps {
  property: Property;
  currentUser: Profile | null;
  onEdit?: (property: Property) => void;
  onCloseListing?: (property: Property) => void;
  onReopenListing?: (property: Property) => void;
  onDeleteListing?: (property: Property) => void;
  align?: "left" | "right";
  orientation?: "vertical" | "horizontal";
  variant?: "card" | "reel" | "header";
  className?: string;
}

export const PropertyActionMenu: React.FC<PropertyActionMenuProps> = ({
  property,
  currentUser,
  onEdit,
  onCloseListing,
  onReopenListing,
  onDeleteListing,
  align = "right",
  orientation = "vertical",
  variant = "card",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Strict ownership check: only owner of record can see and use these actions
  const isOwner = Boolean(
    currentUser &&
    currentUser.id &&
    property.author_id &&
    currentUser.id === property.author_id
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  if (!isOwner) return null;

  const isClosed = property.status && property.status !== "active";

  const getButtonStyles = () => {
    switch (variant) {
      case "reel":
        return "w-11 h-11 rounded-full bg-black/50 backdrop-blur-md hover:bg-black/70 text-white flex items-center justify-center transition-transform active:scale-90 shadow-lg border border-white/10";
      case "header":
        return "p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors";
      default: // card
        return "p-1.5 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors";
    }
  };

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        type="button"
        aria-label="प्रॉपर्टी विकल्प"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className={`cursor-pointer ${getButtonStyles()}`}
      >
        {orientation === "horizontal" ? (
          <MoreHorizontal className="w-5 h-5" />
        ) : (
          <MoreVertical className="w-5 h-5" />
        )}
      </button>

      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute top-full mt-1.5 z-50 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 animate-in fade-in zoom-in-95 duration-100 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {onEdit && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onEdit(property);
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Edit3 className="w-4 h-4 text-slate-500" />
              <span>एडिट करें (Edit)</span>
            </button>
          )}

          {isClosed ? (
            onReopenListing && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onReopenListing(property);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 text-emerald-600" />
                <span>फिर से चालू करें</span>
              </button>
            )
          ) : (
            onCloseListing && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onCloseListing(property);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold text-amber-800 hover:bg-amber-50 transition-colors cursor-pointer"
              >
                <Lock className="w-4 h-4 text-amber-600" />
                <span>लिस्टिंग बंद करें</span>
              </button>
            )
          )}

          <div className="my-1 border-t border-slate-100" />

          {onDeleteListing && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onDeleteListing(property);
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-rose-500" />
              <span>हटाएं (Delete)</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
