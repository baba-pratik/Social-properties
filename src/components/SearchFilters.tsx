import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  SlidersHorizontal,
  RotateCcw,
  MapPin,
  Building,
  CheckCircle2,
  X,
  DollarSign,
  Maximize2,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { PropertyFilterState } from "../types/database";
import { LOCALITIES_BY_CITY } from "../lib/utils";

interface SearchFiltersProps {
  filters: PropertyFilterState;
  onFilterChange: (newFilters: PropertyFilterState) => void;
  onReset: () => void;
  resultCount: number;
  isLoading?: boolean;
}

export const SearchFilters: React.FC<SearchFiltersProps> = ({
  filters,
  onFilterChange,
  onReset,
  resultCount,
  isLoading = false,
}) => {
  // Local state to allow user to tweak multiple inputs and click "Apply" or live update
  const [localFilters, setLocalFilters] = useState<PropertyFilterState>(filters);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Synchronize localFilters whenever outer filters change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const localities = LOCALITIES_BY_CITY[localFilters.city] || [];

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (localFilters.search_query.trim()) count++;
    if (localFilters.city !== "all" && localFilters.city !== "सभी") count++;
    if (localFilters.locality && localFilters.locality !== "all") count++;
    if (localFilters.listing_type !== "all" && localFilters.listing_type !== "सभी") count++;
    if (localFilters.property_type !== "all" && localFilters.property_type !== "सभी") count++;
    if (localFilters.bedrooms) count++;
    if (localFilters.furnishing && localFilters.furnishing !== "all") count++;
    if (localFilters.min_price && localFilters.min_price > 0) count++;
    if (localFilters.max_price && localFilters.max_price < 50000000) count++;
    if (localFilters.min_area && localFilters.min_area > 0) count++;
    if (localFilters.max_area && localFilters.max_area > 0) count++;
    if (localFilters.verified_only) count++;
    if (localFilters.sort_by && localFilters.sort_by !== "newest") count++;
    return count;
  }, [localFilters]);

  const handleApply = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onFilterChange(localFilters);
  };

  const handleReset = () => {
    onReset();
  };

  const isPlotOrLand = ["land", "agricultural_land"].includes(localFilters.property_type);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-6 space-y-4">
      {/* Top Search Input */}
      <form onSubmit={handleApply} className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              id="property-search-input"
              type="text"
              placeholder="शीर्षक, विवरण, पता, इलाका या लैंडमार्क से खोजें..."
              value={localFilters.search_query}
              onChange={(e) =>
                setLocalFilters({ ...localFilters, search_query: e.target.value })
              }
              className="w-full pl-10 pr-9 py-2.5 sm:py-3 text-xs sm:text-sm border-2 border-slate-200 rounded-2xl focus:border-emerald-500 focus:outline-none transition-colors bg-slate-50/50"
            />
            {localFilters.search_query && (
              <button
                type="button"
                onClick={() => {
                  const updated = { ...localFilters, search_query: "" };
                  setLocalFilters(updated);
                  onFilterChange(updated);
                }}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              id="apply-search-filters-btn"
              type="submit"
              className="flex-1 sm:flex-none px-5 py-2.5 sm:py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>खोजें</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`px-4 py-2.5 sm:py-3 rounded-2xl border-2 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                showAdvanced || activeFilterCount > 0
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>फ़िल्टर</span>
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-black ml-0.5">
                  {activeFilterCount}
                </span>
              )}
              {showAdvanced ? (
                <ChevronUp className="w-3.5 h-3.5 ml-0.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Main Filter Row (City, Locality, Listing Type, Property Type, Sort) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-2 border-t border-slate-100 text-xs">
        {/* City Filter */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            शहर (City)
          </label>
          <select
            value={localFilters.city}
            onChange={(e) => {
              const updated = {
                ...localFilters,
                city: e.target.value,
                locality: "",
              };
              setLocalFilters(updated);
              onFilterChange(updated);
            }}
            className="w-full px-2.5 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="all">सभी शहर (All)</option>
            <option value="बोकारो">बोकारो (Bokaro)</option>
            <option value="गिरिडीह">गिरिडीह (Giridih)</option>
            <option value="अन्य">अन्य क्षेत्र</option>
          </select>
        </div>

        {/* Locality Filter */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            इलाका (Locality)
          </label>
          <select
            value={localFilters.locality}
            onChange={(e) => {
              const updated = { ...localFilters, locality: e.target.value };
              setLocalFilters(updated);
              onFilterChange(updated);
            }}
            className="w-full px-2.5 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="">सभी इलाके</option>
            {localities.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>

        {/* Listing Type */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            उद्देश्य (Type)
          </label>
          <select
            value={localFilters.listing_type}
            onChange={(e) => {
              const updated = { ...localFilters, listing_type: e.target.value };
              setLocalFilters(updated);
              onFilterChange(updated);
            }}
            className="w-full px-2.5 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="all">सभी (बिक्री / किराया)</option>
            <option value="sale">बिक्री (Sale)</option>
            <option value="rent">किराया (Rent)</option>
            <option value="lease">लीज (Lease)</option>
          </select>
        </div>

        {/* Property Type */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            प्रॉपर्टी श्रेणी
          </label>
          <select
            value={localFilters.property_type}
            onChange={(e) => {
              const updated = { ...localFilters, property_type: e.target.value };
              setLocalFilters(updated);
              onFilterChange(updated);
            }}
            className="w-full px-2.5 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="all">सभी श्रेणियां</option>
            <option value="flat">फ्लैट / अपार्टमेंट</option>
            <option value="house">स्वतंत्र मकान (House)</option>
            <option value="villa">विला (Villa)</option>
            <option value="land">प्लॉट / ज़मीन (Land/Plot)</option>
            <option value="agricultural_land">कृषि भूमि (Farm Land)</option>
            <option value="commercial">कमर्शियल प्रॉपर्टी</option>
            <option value="shop">दुकान / शोरूम</option>
            <option value="office">ऑफिस स्पेस</option>
            <option value="warehouse">गोदाम / वेयरहाउस</option>
            <option value="pg">पीजी / हॉस्टल</option>
          </select>
        </div>

        {/* Sort Order (Real Data Only) */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1">
            क्रमबद्ध (Sort By)
          </label>
          <select
            value={localFilters.sort_by}
            onChange={(e) => {
              const updated = { ...localFilters, sort_by: e.target.value as any };
              setLocalFilters(updated);
              onFilterChange(updated);
            }}
            className="w-full px-2.5 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="newest">नवीनतम (Latest)</option>
            <option value="oldest">पुरातन (Oldest)</option>
            <option value="price_asc">कीमत: कम से ज्यादा</option>
            <option value="price_desc">कीमत: ज्यादा से कम</option>
            <option value="likes">सर्वाधिक पसंद (Most Liked)</option>
            <option value="views">सर्वाधिक देखे गए (Most Viewed)</option>
          </select>
        </div>
      </div>

      {/* Advanced Filters Expandable Panel */}
      {showAdvanced && (
        <div className="pt-3 border-t border-slate-100 space-y-4 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Price Range: Min and Max */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                कीमत दायरा (₹)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="न्यूनतम"
                  value={localFilters.min_price || ""}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      min_price: e.target.value ? Number(e.target.value) : 0,
                    })
                  }
                  className="w-1/2 p-2 border border-slate-300 rounded-xl text-xs font-semibold"
                />
                <span className="text-slate-400 font-bold">-</span>
                <input
                  type="number"
                  placeholder="अधिकतम"
                  value={
                    localFilters.max_price >= 50000000 ? "" : localFilters.max_price
                  }
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      max_price: e.target.value ? Number(e.target.value) : 50000000,
                    })
                  }
                  className="w-1/2 p-2 border border-slate-300 rounded-xl text-xs font-semibold"
                />
              </div>
            </div>

            {/* Area Range (sq ft) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                क्षेत्रफल दायरा (वर्ग फीट)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="न्यूनतम वर्ग फीट"
                  value={localFilters.min_area || ""}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      min_area: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-1/2 p-2 border border-slate-300 rounded-xl text-xs font-semibold"
                />
                <span className="text-slate-400 font-bold">-</span>
                <input
                  type="number"
                  placeholder="अधिकतम वर्ग फीट"
                  value={localFilters.max_area || ""}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      max_area: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-1/2 p-2 border border-slate-300 rounded-xl text-xs font-semibold"
                />
              </div>
            </div>

            {/* Bedrooms (BHK) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-slate-700">
                  बेडरूम (BHK)
                </label>
                {isPlotOrLand && (
                  <span className="text-[10px] text-amber-600 font-bold">
                    (प्लॉट के लिए लागू नहीं)
                  </span>
                )}
              </div>
              <select
                disabled={isPlotOrLand}
                value={localFilters.bedrooms || ""}
                onChange={(e) =>
                  setLocalFilters({
                    ...localFilters,
                    bedrooms: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className="w-full px-2.5 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 bg-white disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">कोई भी (Any BHK)</option>
                <option value="1">1 BHK</option>
                <option value="2">2 BHK</option>
                <option value="3">3 BHK</option>
                <option value="4">4+ BHK</option>
              </select>
            </div>

            {/* Furnishing Status */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                फर्निशिंग स्थिति
              </label>
              <select
                value={localFilters.furnishing || "all"}
                onChange={(e) =>
                  setLocalFilters({
                    ...localFilters,
                    furnishing: e.target.value === "all" ? undefined : e.target.value,
                  })
                }
                className="w-full px-2.5 py-2 border border-slate-300 rounded-xl text-xs font-semibold bg-white"
              >
                <option value="all">सभी फर्निशिंग</option>
                <option value="Unfurnished">अनफर्निश्ड (खाली)</option>
                <option value="Semi-Furnished">सेमी-फर्निश्ड</option>
                <option value="Fully Furnished">फुल्ली फर्निश्ड</option>
              </select>
            </div>
          </div>

          {/* Verified Only & Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={localFilters.verified_only || false}
                onChange={(e) =>
                  setLocalFilters({
                    ...localFilters,
                    verified_only: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
              />
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                केवल सत्यापित ब्रोकर / मालिक (Verified Only)
              </span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 border border-slate-200 hover:border-slate-300 rounded-xl text-slate-600 hover:text-slate-900 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>फ़िल्टर रीसेट</span>
              </button>

              <button
                type="button"
                onClick={() => handleApply()}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-500/20 transition-all cursor-pointer flex items-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>फ़िल्टर लागू करें</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Footer: Result count and status */}
      <div className="flex items-center justify-between pt-2 text-xs text-slate-500 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <span>उपलब्ध संपत्तियां:</span>
          <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
            {isLoading ? "खोज रहे हैं..." : `${resultCount} प्रॉपर्टी`}
          </span>
          {activeFilterCount > 0 && (
            <span className="text-[11px] text-slate-400">
              ({activeFilterCount} फ़िल्टर सक्रिय)
            </span>
          )}
        </div>

        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={handleReset}
            className="text-emerald-700 hover:underline flex items-center gap-1 font-bold transition-colors cursor-pointer text-xs"
          >
            <RotateCcw className="w-3 h-3" />
            <span>सभी साफ़ करें</span>
          </button>
        )}
      </div>
    </div>
  );
};
