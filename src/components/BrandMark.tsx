import React from "react";

interface BrandMarkProps {
  size?: "sm" | "md" | "lg" | "xl" | "entry";
  showText?: boolean;
  className?: string;
}

export const BrandMark: React.FC<BrandMarkProps> = ({
  size = "md",
  showText = true,
  className = "",
}) => {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
    xl: "w-12 h-12",
    entry: "w-[280px] max-w-[85vw] h-auto",
  };
  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
    xl: "text-lg",
    entry: "text-lg",
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img
        src="/logo.png"
        alt="Social Properties"
        className={`${sizeClasses[size]} object-contain flex-shrink-0`}
        aria-hidden="true"
      />
      {showText && (
        <div className="flex flex-col leading-tight min-w-0">
          <span className={`font-black tracking-tight text-slate-900 ${textSizeClasses[size]} truncate hidden sm:inline-block`}>
            Social Properties
          </span>
          <span className={`font-semibold text-emerald-700 leading-none ${textSizeClasses[size]} truncate hidden md:inline-block`}>
            सोशल प्रॉपर्टीज
          </span>
          {/* Fallback for very small screens: show abbreviated version */}
          <span className={`font-black tracking-tight text-slate-900 ${textSizeClasses[size]} truncate sm:hidden`}>
            Social Properties
          </span>
        </div>
      )}
    </div>
  );
};

export default BrandMark;