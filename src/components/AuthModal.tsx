import React from "react";
import { Login } from "./Login";
import { X } from "lucide-react";

export const AuthModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void;
  currentUser?: any;
  onUserChange?: (u: any) => void;
}> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto relative shadow-2xl animate-in fade-in zoom-in duration-300">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="p-1">
          <Login onSuccess={onClose} />
        </div>
      </div>
    </div>
  );
};
