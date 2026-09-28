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
    sm: "w-5 h-5",
    md: "w-7 h-7",
    lg: "w-9 h-9",
    xl: "w-11 h-11",
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
    <div className={`flex items-center gap-1.5 ${className} min-w-0`}>
      <img
        src="/logo.png"
        alt="Social Properties"
        className={`${sizeClasses[size]} object-contain flex-shrink-0`}
        aria-hidden="true"
      />
      {showText && (
        <div className="flex flex-col leading-tight min-w-0 overflow-hidden">
          <span className={`font-black tracking-tight text-slate-900 ${textSizeClasses[size]} truncate hidden sm:inline-block`}>
            Social Properties
          </span>
          <span className={`font-semibold text-emerald-700 leading-none ${textSizeClasses[size]} truncate hidden md:inline-block`}>
            सोशल प्रॉपर्टीज
          </span>
          <span className={`font-black tracking-tight text-slate-900 ${textSizeClasses[size]} truncate sm:hidden md:hidden`}>
            Social Properties
          </span>
        </div>
      )}
    </div>
  );
};

export default BrandMark;