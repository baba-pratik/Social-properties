import React from "react";

export const PropertyCardSkeleton: React.FC<{ index?: number }> = ({ index = 0 }) => {
  return (
    <div
      id={`property-skeleton-card-${index}`}
      aria-hidden="true"
      className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col animate-pulse"
    >
      {/* Media Skeleton Area */}
      <div className="relative aspect-16/10 w-full bg-slate-200 overflow-hidden">
        {/* Shimmer sweep overlay */}
        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/25 to-transparent" />

        {/* Top Badges Placeholders */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-20 rounded-md bg-slate-300/80" />
            <div className="h-6 w-16 rounded-md bg-slate-300/80" />
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-8 h-8 rounded-full bg-slate-300/80" />
            <div className="w-8 h-8 rounded-full bg-slate-300/80" />
          </div>
        </div>

        {/* Bottom overlay inside image: Price & City */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          <div className="space-y-1.5">
            <div className="h-6 w-28 rounded-md bg-slate-300/90" />
            <div className="h-3.5 w-36 rounded bg-slate-300/70" />
          </div>
          <div className="h-5 w-14 rounded bg-slate-300/60" />
        </div>
      </div>

      {/* Card Content Skeleton */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          {/* Title line */}
          <div className="h-4.5 w-4/5 rounded-md bg-slate-200" />
          {/* Description lines */}
          <div className="space-y-1.5 pt-1">
            <div className="h-3 w-full rounded bg-slate-100" />
            <div className="h-3 w-3/4 rounded bg-slate-100" />
          </div>
        </div>

        {/* Feature Tags Placeholder */}
        <div className="flex items-center gap-3 py-2 border-y border-slate-100">
          <div className="h-4 w-16 rounded bg-slate-200/80" />
          <div className="h-4 w-20 rounded bg-slate-200/80" />
          <div className="h-4 w-16 rounded bg-slate-200/70" />
        </div>

        {/* Card Footer: User Avatar + CTA */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-slate-200 shrink-0" />
            <div className="space-y-1">
              <div className="h-3 w-16 rounded bg-slate-200" />
              <div className="h-2.5 w-12 rounded bg-slate-100" />
            </div>
          </div>
          <div className="h-8 w-22 rounded-lg bg-slate-200/80" />
        </div>
      </div>
    </div>
  );
};

interface PropertyGridSkeletonProps {
  count?: number;
}

export const PropertyGridSkeleton: React.FC<PropertyGridSkeletonProps> = ({ count = 6 }) => {
  return (
    <div
      id="property-feed-skeleton-grid"
      role="status"
      aria-label="प्रॉपर्टी लोड हो रही हैं..."
      className="space-y-4"
    >
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-xs font-semibold text-slate-500">
            ताज़ा संपत्तियां लोड हो रही हैं (Loading properties)...
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: count }).map((_, idx) => (
          <PropertyCardSkeleton key={idx} index={idx} />
        ))}
      </div>
    </div>
  );
};
