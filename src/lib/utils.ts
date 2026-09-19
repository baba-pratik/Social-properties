/**
 * Utilities for formatting currency, dates, and localized labels for Social Properties
 */

export function formatPrice(price: number, listingType: "rent" | "sale"): string {
  if (!price && price !== 0) return "नेगोशिएबल";

  if (listingType === "rent") {
    return `₹${price.toLocaleString("en-IN")}/माह`;
  }

  // For sale in Indian numbering system
  if (price >= 10000000) {
    const cr = (price / 10000000).toFixed(2);
    return `₹${cr.replace(/\.00$/, "")} करोड़`;
  }
  if (price >= 100000) {
    const lakh = (price / 100000).toFixed(2);
    return `₹${lakh.replace(/\.00$/, "")} लाख`;
  }
  return `₹${price.toLocaleString("en-IN")}`;
}

export function formatRelativeTime(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "अभी-अभी";
  if (minutes < 60) return `${minutes} मिनट पहले`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} घंटे पहले`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "कल";
  if (days < 30) return `${days} दिन पहले`;
  const months = Math.floor(days / 30);
  return `${months} माह पहले`;
}

export const LOCALITIES_BY_CITY: Record<string, string[]> = {
  "बोकारो": [
    "सेक्टर 4",
    "सिटी सेंटर",
    "चास",
    "सेक्टर 1",
    "सेक्टर 9",
    "को-ऑपरेटिव कॉलोनी",
    "बोकारो थर्मल",
    "चीरा चास",
    "सेक्टर 6",
  ],
  "गिरिडीह": [
    "झंडा मैदान",
    "टॉवर चौक",
    "पचंबा",
    "बरगंडा",
    "बक्सीडीह",
    "मकतपुर",
    "स्टेशन रोड",
    "सिहोडीह",
  ],
  "अन्य": [
    "धनबाद",
    "राँची",
    "हजारीबाग",
    "देवघर",
  ],
};

export const PROPERTY_TYPE_LABELS: Record<string, { hi: string; en: string }> = {
  flat: { hi: "फ्लैट / अपार्टमेंट", en: "Flat / Apartment" },
  house: { hi: "स्वतंत्र मकान", en: "Independent House" },
  villa: { hi: "विला", en: "Villa" },
  pg: { hi: "पीजी / हॉस्टल", en: "PG / Co-living" },
  commercial: { hi: "कमर्शियल प्रॉपर्टी", en: "Commercial Property" },
  office: { hi: "ऑफिस स्पेस", en: "Office Space" },
  shop: { hi: "दुकान / शोरूम", en: "Shop / Showroom" },
  warehouse: { hi: "गोदाम / वेयरहाउस", en: "Warehouse / Godown" },
  land: { hi: "प्लॉट / आवासीय ज़मीन", en: "Plot / Residential Land" },
  agricultural_land: { hi: "कृषि भूमि / खेत", en: "Agricultural Land / Farm" },
  other: { hi: "अन्य", en: "Other" },
};

export const LISTING_TYPE_LABELS: Record<string, { hi: string; en: string }> = {
  rent: { hi: "किराया", en: "Rent" },
  sale: { hi: "बिक्री", en: "Sale" },
};

export const ROLE_LABELS: Record<string, { hi: string; en: string }> = {
  buyer: { hi: "खरीदार / किरायेदार", en: "Buyer / Tenant" },
  owner: { hi: "संपत्ति मालिक", en: "Owner" },
  broker: { hi: "प्रॉपर्टी ब्रोकर / डीलर", en: "Broker / Agent" },
};
