import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Profile, Property, PropertyStatus, Conversation, Message, PropertyComment, SavedProperty, PropertyFilterState, Reel, CommunityPost } from "../types/database";

const STORAGE_KEYS = {
  SUPABASE_CONFIG: "sp_supabase_config_v1",
};

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function getSupabaseConfig(): SupabaseConfig {
  let envUrl = import.meta.env.VITE_SUPABASE_URL || "";
  let envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
  
  if (envUrl.includes("=")) envUrl = envUrl.split("=")[1].trim();
  if (envKey.includes("=")) envKey = envKey.split("=")[1].trim();

  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SUPABASE_CONFIG);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.url && parsed.anonKey) {
        return parsed;
      }
    }
  } catch (e) {
    // Ignore parse error
  }
  
  return { url: envUrl, anonKey: envKey };
}

export function saveSupabaseConfig(config: SupabaseConfig): void {
  localStorage.setItem(STORAGE_KEYS.SUPABASE_CONFIG, JSON.stringify(config));
  initSupabaseClient();
}

let supabaseInstance: SupabaseClient | null = null;

function createSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (config.url && config.anonKey && config.url.startsWith("http") && !config.url.includes("placeholder")) {
    try {
      return createClient(config.url, config.anonKey);
    } catch (err) {
      console.warn("Failed to initialize Supabase client:", err);
      return null;
    }
  }
  return null;
}

// Initialize immediately with config (may be placeholder)
supabaseInstance = createSupabaseClient();

export function isSupabaseConfigured(): boolean {
  const config = getSupabaseConfig();
  return Boolean(
    config.url &&
    config.anonKey &&
    config.url.startsWith("http") &&
    !config.url.includes("placeholder") &&
    config.anonKey !== "placeholder"
  );
}

export function getSupabaseClient(): SupabaseClient | null {
  // Re-create if config changed and we don't have a valid client
  if (!supabaseInstance || !isSupabaseConfigured()) {
    supabaseInstance = createSupabaseClient();
  }
  return supabaseInstance;
}

function initSupabaseClient(): void {
  supabaseInstance = createSupabaseClient();
}

function client(): SupabaseClient | null {
  return getSupabaseClient();
}

export async function getAccessToken(): Promise<string | null> {
  const sb = getSupabaseClient();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session?.access_token ?? null;
}

const LOCAL_PROPERTIES_KEY = "sp_local_properties_v2";

export function getLocalProperties(): Property[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_PROPERTIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalProperty(prop: Property): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getLocalProperties();
    const updated = [prop, ...existing.filter((p) => p.id !== prop.id)];
    localStorage.setItem(LOCAL_PROPERTIES_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn("Could not save property to local storage:", e);
  }
}

export function removeLocalProperty(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getLocalProperties();
    const updated = existing.filter((p) => p.id !== id);
    localStorage.setItem(LOCAL_PROPERTIES_KEY, JSON.stringify(updated));
  } catch {}
}

// Global Custom Event Emitter for legacy calls
const emitRealtimeEvent = (eventName: string, detail: any) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("social-properties-realtime", { detail: { event: eventName, ...detail } })
    );
  }
};

export function filterPropertiesLocally(props: Property[], filters?: PropertyFilterState): Property[] {
  if (!filters) return props;

  return props
    .filter((prop) => {
      // City match
      if (filters.city && filters.city !== "all" && filters.city !== "सभी") {
        if (prop.city !== filters.city) return false;
      }

      // Locality match
      if (filters.locality && filters.locality.trim() && filters.locality !== "all") {
        const locMatch = prop.locality?.toLowerCase().includes(filters.locality.trim().toLowerCase());
        if (!locMatch) return false;
      }

      // Listing Type match (sale, rent, lease)
      if (filters.listing_type && filters.listing_type !== "all" && filters.listing_type !== "सभी") {
        if (prop.listing_type !== filters.listing_type) return false;
      }

      // Property Type match
      if (filters.property_type && filters.property_type !== "all" && filters.property_type !== "सभी") {
        if (prop.property_type !== filters.property_type) return false;
      }

      // Bedrooms match (Only apply if specified and property is residential)
      if (filters.bedrooms && filters.bedrooms > 0) {
        const isPlot = ["land", "agricultural_land"].includes(prop.property_type);
        if (isPlot) return false; // plot does not have bedrooms
        if (filters.bedrooms >= 4) {
          if ((prop.bedrooms || 0) < 4) return false;
        } else {
          if (prop.bedrooms !== filters.bedrooms) return false;
        }
      }

      // Furnishing match
      if (filters.furnishing && filters.furnishing !== "all" && filters.furnishing !== "सभी") {
        if (prop.furnishing !== filters.furnishing) return false;
      }

      // Min Price
      if (filters.min_price && filters.min_price > 0) {
        if (prop.price < filters.min_price) return false;
      }

      // Max Price
      if (filters.max_price && filters.max_price > 0 && filters.max_price < 100000000) {
        if (prop.price > filters.max_price) return false;
      }

      // Min Area (carpet_area or plot_area)
      if (filters.min_area && filters.min_area > 0) {
        const area = prop.carpet_area || prop.plot_area || prop.built_up_area || 0;
        if (area < filters.min_area) return false;
      }

      // Max Area
      if (filters.max_area && filters.max_area > 0) {
        const area = prop.carpet_area || prop.plot_area || prop.built_up_area || 0;
        if (area > 0 && area > filters.max_area) return false;
      }

      // Verified Only
      if (filters.verified_only) {
        if (!prop.author?.is_verified && !prop.author?.is_verified_broker) return false;
      }

      // Search query (matches title, description, city, address, locality, landmark)
      if (filters.search_query && filters.search_query.trim()) {
        const q = filters.search_query.trim().toLowerCase();
        const matchTitle = prop.title?.toLowerCase().includes(q);
        const matchDesc = prop.description?.toLowerCase().includes(q);
        const matchLocality = prop.locality?.toLowerCase().includes(q);
        const matchAddress = prop.address?.toLowerCase().includes(q);
        const matchCity = prop.city?.toLowerCase().includes(q);
        const matchLandmark = prop.landmark?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchLocality && !matchAddress && !matchCity && !matchLandmark) {
          return false;
        }
      }

      // Author match (e.g. for owner profile)
      if (filters.author_id) {
        if (prop.author_id !== filters.author_id) return false;
        if (filters.status && filters.status !== "all" && prop.status !== filters.status) return false;
      } else {
        // Public feed & search: only show active properties (hide closed/sold/rented)
        if (prop.status && prop.status !== "active") return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (!filters.sort_by || filters.sort_by === "newest") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (filters.sort_by === "oldest") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (filters.sort_by === "price_asc") {
        return a.price - b.price;
      }
      if (filters.sort_by === "price_desc") {
        return b.price - a.price;
      }
      if (filters.sort_by === "likes") {
        return (b.likes_count || 0) - (a.likes_count || 0);
      }
      if (filters.sort_by === "views") {
        return (b.views_count || 0) - (a.views_count || 0);
      }
      if (filters.sort_by === "popular") {
        const scoreA = (a.likes_count || 0) * 2 + (a.views_count || 0);
        const scoreB = (b.likes_count || 0) * 2 + (b.views_count || 0);
        return scoreB - scoreA;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
}

export async function fetchProperties(
  page: number = 1,
  limit: number = 10,
  filters?: PropertyFilterState
): Promise<Property[]> {
  const localProps = getLocalProperties();

  if (!isSupabaseConfigured()) {
    const filteredLocal = filterPropertiesLocally(localProps, filters);
    const start = (page - 1) * limit;
    return filteredLocal.slice(start, start + limit);
  }

  try {
    const c = client();
    if (!c) throw new Error("Supabase not configured");
    let query = c.from("properties").select("*, author:profiles(*)");

    if (filters) {
      if (filters.city && filters.city !== "all" && filters.city !== "सभी") {
        query = query.eq("city", filters.city);
      }
      if (filters.locality && filters.locality.trim() && filters.locality !== "all") {
        query = query.ilike("locality", `%${filters.locality.trim()}%`);
      }
      if (filters.listing_type && filters.listing_type !== "all" && filters.listing_type !== "सभी") {
        query = query.eq("listing_type", filters.listing_type);
      }
      if (filters.property_type && filters.property_type !== "all" && filters.property_type !== "सभी") {
        const safeType = mapToSafeDbPropertyType(filters.property_type);
        query = query.eq("property_type", safeType);
      }
      if (filters.bedrooms && filters.bedrooms > 0) {
        if (filters.bedrooms >= 4) {
          query = query.gte("bedrooms", 4);
        } else {
          query = query.eq("bedrooms", filters.bedrooms);
        }
      }
      if (filters.furnishing && filters.furnishing !== "all" && filters.furnishing !== "सभी") {
        query = query.eq("furnishing", filters.furnishing);
      }
      if (filters.min_price && filters.min_price > 0) {
        query = query.gte("price", filters.min_price);
      }
      if (filters.max_price && filters.max_price > 0 && filters.max_price < 100000000) {
        query = query.lte("price", filters.max_price);
      }
      if (filters.search_query && filters.search_query.trim()) {
        const q = filters.search_query.trim();
        query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,address.ilike.%${q}%,locality.ilike.%${q}%,city.ilike.%${q}%`);
      }

      if (filters.author_id) {
        query = query.eq("author_id", filters.author_id);
        if (filters.status && filters.status !== "all") {
          query = query.eq("status", filters.status);
        }
      } else {
        // Public feed & search: only active properties
        query = query.eq("status", "active");
      }

      if (filters.sort_by === "price_asc") {
        query = query.order("price", { ascending: true });
      } else if (filters.sort_by === "price_desc") {
        query = query.order("price", { ascending: false });
      } else if (filters.sort_by === "oldest") {
        query = query.order("created_at", { ascending: true });
      } else if (filters.sort_by === "likes") {
        query = query.order("likes_count", { ascending: false });
      } else if (filters.sort_by === "views") {
        query = query.order("views_count", { ascending: false });
      } else {
        query = query.order("created_at", { ascending: false });
      }
    } else {
      query = query.eq("status", "active").order("created_at", { ascending: false });
    }

    const { data, error } = await query.range((page - 1) * limit, page * limit - 1);
      
    if (error) {
      console.warn("fetchProperties error, returning filtered local properties:", error.message);
      const filteredLocal = filterPropertiesLocally(localProps, filters);
      const start = (page - 1) * limit;
      return filteredLocal.slice(start, start + limit);
    }

    const fetched = (data || []).map(normalizeProperty);
    const combined = [...localProps, ...fetched];
    const unique = Array.from(new Map(combined.map((item) => [item.id, item])).values());
    const filteredAll = filterPropertiesLocally(unique, filters);
    const start = (page - 1) * limit;
    return filteredAll.slice(start, start + limit);
  } catch (err) {
    console.warn("fetchProperties network error:", err);
    const filteredLocal = filterPropertiesLocally(localProps, filters);
    const start = (page - 1) * limit;
    return filteredLocal.slice(start, start + limit);
  }
}

function normalizeProperty(p: any): Property {
  if (!p) return p;
  
  // Extract extended fields from property_details JSONB
  if (p.property_details && typeof p.property_details === "object") {
    const details = p.property_details;
    p.balconies = details.balconies ?? p.balconies;
    p.carpet_area = details.carpet_area ?? p.carpet_area;
    p.built_up_area = details.built_up_area ?? p.built_up_area;
    p.floor_number = details.floor_number ?? p.floor_number;
    p.total_floors = details.total_floors ?? p.total_floors;
    p.parking = details.parking ?? p.parking;
    p.property_age = details.property_age ?? p.property_age;
    p.facing = details.facing ?? p.facing;
    p.plot_area = details.plot_area ?? p.plot_area;
    p.area_unit = details.area_unit ?? p.area_unit;
    p.road_width = details.road_width ?? p.road_width;
    p.boundary_wall = details.boundary_wall ?? p.boundary_wall;
    p.land_use = details.land_use ?? p.land_use;
    p.corner_plot = details.corner_plot ?? p.corner_plot;
    p.ownership_status = details.ownership_status ?? p.ownership_status;
    p.commercial_category = details.commercial_category ?? p.commercial_category;
    p.washroom = details.washroom ?? p.washroom;
    p.power_backup = details.power_backup ?? p.power_backup;
    p.negotiable = details.negotiable ?? p.negotiable;
    p.landmark = details.landmark ?? p.landmark;
    p.contact_preference = details.contact_preference ?? p.contact_preference;
  }
  
  if (!p.video_url && Array.isArray(p.media_urls)) {
    const foundVid = p.media_urls.find((u: string) => 
      typeof u === "string" && (
        u.includes(".mp4") || 
        u.includes(".webm") || 
        u.includes(".mov") || 
        u.includes("/video") || 
        u.startsWith("data:video")
      )
    );
    if (foundVid) {
      p.video_url = foundVid;
    }
  }
  return p as Property;
}

// Safe DB Enum Mapper for property_type & listing_type
// Identity function - preserves canonical PropertyType values.
// DB schema must be updated separately to support all 11 enum values.
function mapToSafeDbPropertyType(rawType: string): string {
  return rawType;
}

export async function createProperty(propertyData: any): Promise<Property | null> {
  let payload: any = { ...propertyData };

  // Always ensure video is also stored in media_urls so video is preserved
  if (payload.video_url) {
    if (!payload.media_urls) payload.media_urls = [];
    if (!payload.media_urls.includes(payload.video_url)) {
      payload.media_urls = [payload.video_url, ...payload.media_urls];
    }
  }

  // Build property_details JSONB from extended fields
  const extendedFields = [
    "balconies", "carpet_area", "built_up_area", "floor_number", "total_floors",
    "parking", "property_age", "facing", "plot_area", "area_unit", "road_width",
    "boundary_wall", "land_use", "corner_plot", "ownership_status",
    "commercial_category", "washroom", "power_backup", "negotiable",
    "landmark", "contact_preference"
  ];
  const propertyDetails: Record<string, any> = {};
  for (const field of extendedFields) {
    if (payload[field] !== undefined && payload[field] !== null) {
      propertyDetails[field] = payload[field];
    }
  }
  if (Object.keys(propertyDetails).length > 0) {
    payload.property_details = propertyDetails;
  }

  // Remove extended fields from root payload (they go in property_details)
  for (const field of extendedFields) {
    delete payload[field];
  }

  // First attempt: insert payload with mapped DB property type
  const safeDbPropType = mapToSafeDbPropertyType(payload.property_type);
  const attemptedPayload = { ...payload, property_type: safeDbPropType };

  if (isSupabaseConfigured()) {
    const c = client();
    if (!c) throw new Error("Supabase not configured");
    try {
      let { data, error } = await c
        .from("properties")
        .insert([attemptedPayload])
        .select("*, author:profiles(*)")
        .single();

      // If DB rejected with schema cache missing column (PGRST204 or 42703), strip extended columns and retry
      if (
        error &&
        (error.code === "PGRST204" ||
          error.code === "42703" ||
          error.message?.includes("column") ||
          error.message?.includes("schema cache"))
      ) {
        console.warn("Retrying property insert with core columns only due to schema mismatch:", error.message);
        const corePayload: any = {
          author_id: payload.author_id,
          title: payload.title,
          description: payload.description,
          price: payload.price,
          listing_type: payload.listing_type === "lease" ? "rent" : payload.listing_type,
          property_type: safeDbPropType,
          bedrooms: payload.bedrooms ?? 0,
          bathrooms: payload.bathrooms ?? 0,
          furnishing: payload.furnishing,
          address: payload.address,
          locality: payload.locality,
          city: payload.city,
          lat: payload.lat,
          lng: payload.lng,
          media_urls: payload.media_urls || [],
          status: payload.status || "active",
        };

        if (payload.video_url && !error.message?.includes("video_url")) {
          corePayload.video_url = payload.video_url;
        }
        if (payload.property_details) {
          corePayload.property_details = payload.property_details;
        }
        if (payload.negotiable !== undefined) {
          corePayload.negotiable = payload.negotiable;
        }

        const retry = await c
          .from("properties")
          .insert([corePayload])
          .select("*, author:profiles(*)")
          .single();

        data = retry.data;
        error = retry.error;
      }
          
      if (!error && data) {
        const normalized = normalizeProperty(data);
        saveLocalProperty(normalized);
        return normalized;
      }
      console.warn("Supabase insert had error, persisting locally:", error?.message);
    } catch (insertErr) {
      console.warn("Supabase insert network error, persisting locally:", insertErr);
    }
  }

  // Fallback: create and store property locally
  const localProp: Property = {
    id: `prop-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    author_id: payload.author_id,
    title: payload.title,
    description: payload.description,
    price: Number(payload.price),
    listing_type: payload.listing_type,
    property_type: payload.property_type,
    bedrooms: payload.bedrooms ?? 0,
    bathrooms: payload.bathrooms ?? 1,
    furnishing: payload.furnishing || "Semi-Furnished",
    address: payload.address,
    locality: payload.locality,
    city: payload.city,
    lat: payload.lat ?? null,
    lng: payload.lng ?? null,
    media_urls: payload.media_urls || [],
    video_url: payload.video_url,
    status: payload.status || "active",
    property_details: payload.property_details,
  };

  saveLocalProperty(localProp);
  return localProp;
}

export async function updateProperty(id: string, propertyData: any): Promise<Property | null> {
  let payload = { ...propertyData };

  if (payload.video_url) {
    if (!payload.media_urls) payload.media_urls = [];
    if (!payload.media_urls.includes(payload.video_url)) {
      payload.media_urls = [payload.video_url, ...payload.media_urls];
    }
  }

  // Build property_details JSONB from extended fields
  const extendedFields = [
    "balconies", "carpet_area", "built_up_area", "floor_number", "total_floors",
    "parking", "property_age", "facing", "plot_area", "area_unit", "road_width",
    "boundary_wall", "land_use", "corner_plot", "ownership_status",
    "commercial_category", "washroom", "power_backup", "negotiable",
    "landmark", "contact_preference"
  ];
  const propertyDetails: Record<string, any> = {};
  for (const field of extendedFields) {
    if (payload[field] !== undefined && payload[field] !== null) {
      propertyDetails[field] = payload[field];
    }
  }
  if (Object.keys(propertyDetails).length > 0) {
    payload.property_details = propertyDetails;
  }

  // Remove extended fields from root payload (they go in property_details)
  for (const field of extendedFields) {
    delete payload[field];
  }

  if (payload.property_type) {
    payload.property_type = mapToSafeDbPropertyType(payload.property_type);
  }
  if (payload.listing_type === "lease") {
    payload.listing_type = "rent";
  }

  if (isSupabaseConfigured()) {
    const c = client();
    if (!c) throw new Error("Supabase not configured");
    try {
      let { data, error } = await c
        .from("properties")
        .update(payload)
        .eq("id", id)
        .select("*, author:profiles(*)")
        .single();

      // If column does not exist in schema, retry with core fields
      if (
        error &&
        (error.code === "PGRST204" ||
          error.code === "42703" ||
          error.message?.includes("column") ||
          error.message?.includes("schema cache"))
      ) {
        console.warn("Retrying property update with core columns only:", error.message);
        const corePayload: any = {
          title: payload.title,
          description: payload.description,
          price: payload.price,
          listing_type: payload.listing_type,
          property_type: payload.property_type,
          bedrooms: payload.bedrooms ?? 0,
          bathrooms: payload.bathrooms ?? 0,
          furnishing: payload.furnishing,
          address: payload.address,
          locality: payload.locality,
          city: payload.city,
          lat: payload.lat,
          lng: payload.lng,
          media_urls: payload.media_urls || [],
          status: payload.status || "active",
        };
        if (payload.video_url && !error.message?.includes("video_url")) {
          corePayload.video_url = payload.video_url;
        }
        if (payload.property_details) {
          corePayload.property_details = payload.property_details;
        }
        if (payload.negotiable !== undefined) {
          corePayload.negotiable = payload.negotiable;
        }

        const retry = await c
          .from("properties")
          .update(corePayload)
          .eq("id", id)
          .select("*, author:profiles(*)")
          .single();

        data = retry.data;
        error = retry.error;
      }

      if (!error && data) {
        const normalized = normalizeProperty(data);
        saveLocalProperty(normalized);
        return normalized;
      }
    } catch (err) {
      console.warn("updateProperty network error:", err);
    }
  }

  // Local fallback
  const localProps = getLocalProperties();
  const existingIndex = localProps.findIndex((p) => p.id === id);
  if (existingIndex >= 0) {
    const updated: Property = {
      ...localProps[existingIndex],
      ...payload,
      updated_at: new Date().toISOString(),
    };
    saveLocalProperty(updated);
    return updated;
  }

  return payload as Property;
}

export async function updatePropertyStatus(
  id: string,
  newStatus: PropertyStatus,
  authorId: string
): Promise<{ success: boolean; property?: Property; error?: string }> {
  const localProps = getLocalProperties();
  const existingIdx = localProps.findIndex((p) => p.id === id);
  let updatedLocal: Property | null = null;
  if (existingIdx >= 0) {
    updatedLocal = {
      ...localProps[existingIdx],
      status: newStatus,
      updated_at: new Date().toISOString(),
    };
    saveLocalProperty(updatedLocal);
  }

  if (isSupabaseConfigured()) {
    const c = client();
    if (!c) throw new Error("Supabase not configured");
    try {
      let { data, error } = await c
        .from("properties")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("author_id", authorId)
        .select("*, author:profiles(*)")
        .single();

      // If 'closed' is not supported in the database enum, fall back to domain status
      if (error && (error.message?.includes("invalid input value for enum") || error.code === "22P02") && newStatus === "closed") {
        const fallbackStatus = updatedLocal?.listing_type === "rent" ? "rented" : "sold";
        const retry = await c
          .from("properties")
          .update({ status: fallbackStatus, updated_at: new Date().toISOString() })
          .eq("id", id)
          .eq("author_id", authorId)
          .select("*, author:profiles(*)")
          .single();
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        console.error("updatePropertyStatus DB error:", error.message);
        return { success: false, error: error.message };
      }

      if (data) {
        const normalized = normalizeProperty(data);
        saveLocalProperty(normalized);
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("social-properties-realtime", {
              detail: { type: "property-updated", property: normalized },
            })
          );
        }
        return { success: true, property: normalized };
      }
    } catch (err: any) {
      console.error("updatePropertyStatus network error:", err);
      return { success: false, error: err?.message || "नेटवर्क त्रुटि के कारण स्टेटस अपडेट नहीं हो सका।" };
    }
  }

  if (updatedLocal && typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("social-properties-realtime", {
        detail: { type: "property-updated", property: updatedLocal },
      })
    );
  }

  return { success: true, property: updatedLocal || undefined };
}

export async function deleteProperty(
  id: string,
  authorId?: string
): Promise<{ success: boolean; error?: string }> {
  removeLocalProperty(id);
  if (authorId) {
    removeLocalSavedId(authorId, id);
  }

  if (isSupabaseConfigured()) {
    const c = client();
    if (!c) throw new Error("Supabase not configured");
    try {
      // Step 1: Verify ownership and inspect media
      const { data: propData, error: fetchErr } = await c
        .from("properties")
        .select("id, author_id, media_urls, video_url")
        .eq("id", id)
        .maybeSingle();

      if (fetchErr) {
        console.warn("deleteProperty verify error:", fetchErr.message);
      }

      if (authorId && propData && propData.author_id !== authorId) {
        return { success: false, error: "आप केवल अपनी संपत्ति या पोस्ट हटा सकते हैं।" };
      }

      // Step 2: Attempt media removal from property-media storage bucket
      const allUrls = [
        ...(propData?.media_urls || []),
        ...(propData?.video_url ? [propData.video_url] : []),
      ];
      const filesToRemove: string[] = [];
      for (const url of allUrls) {
        if (typeof url === "string" && url.includes("/property-media/")) {
          const parts = url.split("/property-media/");
          if (parts[1]) {
            filesToRemove.push(decodeURIComponent(parts[1].split("?")[0]));
          }
        }
      }
      if (filesToRemove.length > 0) {
        try {
          const c = client();
          if (c) await c.storage.from("property-media").remove(filesToRemove);
        } catch (e) {
          console.warn("Storage cleanup note:", e);
        }
      }

      // Step 3: Remove saved property rows
      try {
        const c = client();
        if (c) await c.from("saved_properties").delete().eq("property_id", id);
      } catch (e) {
        console.warn("saved_properties delete note:", e);
      }

      // Step 4: Delete the property record (enforcing author_id if provided)
      const c2 = client();
      if (!c2) throw new Error("Supabase not configured");
      let delQuery = c2.from("properties").delete().eq("id", id);
      if (authorId) {
        delQuery = delQuery.eq("author_id", authorId);
      }
      const { error: delError } = await delQuery;

      if (delError) {
        console.error("deleteProperty DB error:", delError.message);
        return { success: false, error: delError.message };
      }
    } catch (err: any) {
      console.error("deleteProperty network error:", err);
      return { success: false, error: err?.message || "नेटवर्क त्रुटि के कारण प्रॉपर्टी हटाई नहीं जा सकी।" };
    }
  }

  // Dispatch realtime event
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("social-properties-realtime", {
        detail: { type: "property-deleted", propertyId: id },
      })
    );
  }

  return { success: true };
}

export async function fetchUserConversations(userId: string): Promise<Conversation[]> {
  const c = client();
  if (!c) return [];
  const { data, error } = await c
    .from("conversations")
    .select("*, property:properties(*), participant_1_profile:profiles!participant_1(*), participant_2_profile:profiles!participant_2(*)")
    .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
    .order("last_message_at", { ascending: false });
    
  if (error) {
    console.error("fetchUserConversations error:", error);
    return [];
  }
  return data as Conversation[];
}

export async function fetchConversationMessages(conversationId: string): Promise<Message[]> {
  const c = client();
  if (!c) return [];
  const { data, error } = await c
    .from("messages")
    .select("*, sender:profiles(*)")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
    
  if (error) {
    console.error("fetchConversationMessages error:", error);
    return [];
  }
  return data as Message[];
}

export async function sendMessage(conversationId: string, senderId: string, text: string, mediaUrl?: string): Promise<Message | null> {
  const c = client();
  if (!c) return null;
  const newMessage = {
    conversation_id: conversationId,
    sender_id: senderId,
    text,
    media_url: mediaUrl,
  };
  
  const { data, error } = await c
    .from("messages")
    .insert([newMessage])
    .select("*, sender:profiles(*)")
    .single();
    
  if (error) {
    console.error("sendMessage error:", error);
    return null;
  }
  
  // Update last_message_at
  await c
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);
    
  return data as Message;
}

export async function markMessagesAsRead(conversationId: string, userId: string): Promise<boolean> {
  const c = client();
  if (!c) return false;
  const { error } = await c
    .from("messages")
    .update({ is_read: true })
    .eq("conversation_id", conversationId)
    .neq("sender_id", userId)
    .eq("is_read", false);
  if (error) {
    console.error("markMessagesAsRead error:", error);
    return false;
  }
  return true;
}

export async function getUnreadCounts(userId: string): Promise<Record<string, number>> {
  const c = client();
  if (!c) return {};
  const { data, error } = await c.rpc("get_unread_counts", { p_user_id: userId });
  if (error) {
    console.error("getUnreadCounts error:", error);
    return {};
  }
  const map: Record<string, number> = {};
  for (const row of (data || []) as { conversation_id: string; unread_count: number }[]) {
    map[row.conversation_id] = Number(row.unread_count);
  }
  return map;
}

export async function getOrCreateConversation(propertyId: string, buyerId: string, ownerId: string): Promise<Conversation | null> {
  const c = client();
  if (!c) return null;
  const { data: existing, error: findError } = await c
    .from("conversations")
    .select("*")
    .eq("property_id", propertyId)
    .or(`and(participant_1.eq.${buyerId},participant_2.eq.${ownerId}),and(participant_1.eq.${ownerId},participant_2.eq.${buyerId})`)
    .single();
    
  if (existing) {
    return existing as Conversation;
  }
  
  const { data: newConv, error: createError } = await c
    .from("conversations")
    .insert([{
      property_id: propertyId,
      participant_1: buyerId,
      participant_2: ownerId,
      last_message_at: new Date().toISOString(),
      last_message: "बातचीत शुरू की गई"
    }])
    .select("*")
    .single();
    
  if (createError) {
    console.error("getOrCreateConversation error:", createError);
    return null;
  }
  
  return newConv as Conversation;
}

export async function fetchPropertyComments(propertyId: string): Promise<PropertyComment[]> {
  const c = client();
  if (!c) return [];
  const { data, error } = await c
    .from("comments")
    .select("*, author:profiles(*)")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: true });
    
  if (error) return [];
  return data as PropertyComment[];
}

export async function addPropertyComment(propertyId: string, authorId: string, content: string): Promise<PropertyComment | null> {
  const c = client();
  if (!c) return null;
  const { data, error } = await c
    .from("comments")
    .insert([{ property_id: propertyId, author_id: authorId, content }])
    .select("*, author:profiles(*)")
    .single();
    
  if (error) return null;
  return data as PropertyComment;
}

// Reel comments
export async function fetchReelComments(reelId: string): Promise<PropertyComment[]> {
  const c = client();
  if (!c) return [];
  const { data, error } = await c
    .from("comments")
    .select("*, author:profiles(*)")
    .eq("reel_id", reelId)
    .order("created_at", { ascending: true });
    
  if (error) return [];
  return data as PropertyComment[];
}

export async function addReelComment(reelId: string, authorId: string, content: string): Promise<PropertyComment | null> {
  const c = client();
  if (!c) return null;
  const { data, error } = await c
    .from("comments")
    .insert([{ reel_id: reelId, author_id: authorId, content }])
    .select("*, author:profiles(*)")
    .single();
    
  if (error) return null;
  return data as PropertyComment;
}

const SAVED_PROPERTIES_STORAGE_PREFIX = "sp_saved_property_ids_";

export function getLocalSavedIds(userId: string): string[] {
  try {
    const raw = localStorage.getItem(`${SAVED_PROPERTIES_STORAGE_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalSavedId(userId: string, propertyId: string) {
  try {
    const ids = getLocalSavedIds(userId);
    if (!ids.includes(propertyId)) {
      ids.push(propertyId);
      localStorage.setItem(`${SAVED_PROPERTIES_STORAGE_PREFIX}${userId}`, JSON.stringify(ids));
    }
  } catch {}
}

export function removeLocalSavedId(userId: string, propertyId: string) {
  try {
    const ids = getLocalSavedIds(userId).filter((id) => id !== propertyId);
    localStorage.setItem(`${SAVED_PROPERTIES_STORAGE_PREFIX}${userId}`, JSON.stringify(ids));
  } catch {}
}

export async function getSavedPropertyIds(userId: string): Promise<string[]> {
  const localIds = getLocalSavedIds(userId);
  if (!isSupabaseConfigured()) {
    return localIds;
  }

  const c = client();
  if (!c) return localIds;

  try {
    const { data, error } = await c
      .from("saved_properties")
      .select("property_id")
      .eq("user_id", userId);

    if (error) {
      console.warn("getSavedPropertyIds error:", error.message);
      return localIds;
    }

    const dbIds = (data || []).map((d) => d.property_id);
    const combined = Array.from(new Set([...localIds, ...dbIds]));
    return combined;
  } catch (err) {
    console.warn("getSavedPropertyIds network error:", err);
    return localIds;
  }
}

export async function fetchSavedProperties(userId: string): Promise<Property[]> {
  const localSavedIds = getLocalSavedIds(userId);
  const localProps = getLocalProperties();

  if (!isSupabaseConfigured()) {
    return localProps.filter((p) => localSavedIds.includes(p.id));
  }

  const c = client();
  if (!c) return localProps.filter((p) => localSavedIds.includes(p.id));

  try {
    const { data, error } = await c
      .from("saved_properties")
      .select("id, property_id, created_at, property:properties(*, author:profiles(*))")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("fetchSavedProperties error:", error.message);
      return localProps.filter((p) => localSavedIds.includes(p.id));
    }

    const savedList: Property[] = [];
    if (Array.isArray(data)) {
      for (const item of data) {
        if (item.property) {
          savedList.push(normalizeProperty(item.property));
        }
      }
    }

    // Merge with any local properties saved
    const localMatches = localProps.filter((p) => localSavedIds.includes(p.id));
    const combined = [...savedList, ...localMatches];
    const unique = Array.from(new Map(combined.map((item) => [item.id, item])).values());
    return unique;
  } catch (err) {
    console.warn("fetchSavedProperties network error:", err);
    return localProps.filter((p) => localSavedIds.includes(p.id));
  }
}

export async function removeSavedProperty(
  userId: string,
  propertyId: string
): Promise<{ success: boolean; error?: string }> {
  // Update local storage cache immediately
  removeLocalSavedId(userId, propertyId);

  if (isSupabaseConfigured()) {
    const c = client();
    if (c) {
      try {
        const { error } = await c
          .from("saved_properties")
          .delete()
          .eq("user_id", userId)
          .eq("property_id", propertyId);

        if (error) {
          console.error("removeSavedProperty DB error:", error.message);
          return { success: false, error: error.message };
        }
      } catch (err: any) {
        console.error("removeSavedProperty exception:", err);
        return { success: false, error: err?.message || "नेटवर्क त्रुटि के कारण विशलिस्ट से हटाया नहीं जा सका।" };
      }
    }
  }

  // Trigger sync event
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("social-properties-realtime", {
        detail: { type: "saved-property-removed", userId, propertyId },
      })
    );
  }

  return { success: true };
}

export async function saveProperty(
  userId: string,
  propertyId: string
): Promise<{ success: boolean; error?: string }> {
  saveLocalSavedId(userId, propertyId);

  if (isSupabaseConfigured()) {
    const c = client();
    if (c) {
      try {
        const { error } = await c
          .from("saved_properties")
          .upsert([{ user_id: userId, property_id: propertyId }], { onConflict: "user_id,property_id" });

        if (error) {
          console.error("saveProperty DB error:", error.message);
          return { success: false, error: error.message };
        }
      } catch (err: any) {
        console.error("saveProperty exception:", err);
        return { success: false, error: err?.message || "नेटवर्क त्रुटि के कारण प्रॉपर्टी सेव नहीं हो सकी।" };
      }
    }
  }

  // Trigger sync event
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("social-properties-realtime", {
        detail: { type: "saved-property-added", userId, propertyId },
      })
    );
  }

  return { success: true };
}

export async function toggleSaveProperty(userId: string, propertyId: string): Promise<boolean> {
  const currentIds = await getSavedPropertyIds(userId);
  const isCurrentlySaved = currentIds.includes(propertyId);

  if (isCurrentlySaved) {
    const res = await removeSavedProperty(userId, propertyId);
    return res.success ? false : true;
  } else {
    const res = await saveProperty(userId, propertyId);
    return res.success ? true : false;
  }
}

// Reel save/bookmark functions
export async function getSavedReelIds(userId: string): Promise<string[]> {
  if (!isSupabaseConfigured()) return [];
  const c = client();
  if (!c) return [];
  try {
    const { data, error } = await c
      .from("saved_properties")
      .select("reel_id")
      .eq("user_id", userId)
      .not("reel_id", "is", null);
    if (error) {
      console.warn("getSavedReelIds error:", error.message);
      return [];
    }
    return (data || []).map((d) => d.reel_id).filter(Boolean) as string[];
  } catch (err) {
    console.warn("getSavedReelIds network error:", err);
    return [];
  }
}

export async function fetchSavedReels(userId: string): Promise<Reel[]> {
  if (!isSupabaseConfigured()) return [];
  const c = client();
  if (!c) return [];
  try {
    const { data, error } = await c
      .from("saved_properties")
      .select("id, reel_id, created_at, reel:reels(*, author:profiles(*))")
      .eq("user_id", userId)
      .not("reel_id", "is", null)
      .order("created_at", { ascending: false });
    if (error) {
      console.warn("fetchSavedReels error:", error.message);
      return [];
    }
    const savedList: Reel[] = [];
    if (Array.isArray(data)) {
      for (const item of data) {
        if (item.reel) savedList.push(item.reel as unknown as Reel);
      }
    }
    return savedList;
  } catch (err) {
    console.warn("fetchSavedReels network error:", err);
    return [];
  }
}

export async function saveReel(
  userId: string,
  reelId: string
): Promise<{ success: boolean; error?: string }> {
  if (isSupabaseConfigured()) {
    const c = client();
    if (c) {
      try {
        const { error } = await c
          .from("saved_properties")
          .upsert([{ user_id: userId, reel_id: reelId }], { onConflict: "user_id,reel_id" });
        if (error) {
          console.error("saveReel DB error:", error.message);
          return { success: false, error: error.message };
        }
      } catch (err: any) {
        console.error("saveReel exception:", err);
        return { success: false, error: err?.message || "नेटवर्क त्रुटि के कारण रील सेव नहीं हो सकी।" };
      }
    }
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("social-properties-realtime", {
        detail: { type: "saved-reel-added", userId, reelId },
      })
    );
  }
  return { success: true };
}

export async function removeSavedReel(
  userId: string,
  reelId: string
): Promise<{ success: boolean; error?: string }> {
  if (isSupabaseConfigured()) {
    const c = client();
    if (c) {
      try {
        const { error } = await c
          .from("saved_properties")
          .delete()
          .eq("user_id", userId)
          .eq("reel_id", reelId);
        if (error) {
          console.error("removeSavedReel DB error:", error.message);
          return { success: false, error: error.message };
        }
      } catch (err: any) {
        console.error("removeSavedReel exception:", err);
        return { success: false, error: err?.message || "नेटवर्क त्रुटि के कारण रील हटाई नहीं जा सकी।" };
      }
    }
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("social-properties-realtime", {
        detail: { type: "saved-reel-removed", userId, reelId },
      })
    );
  }
  return { success: true };
}

export async function toggleSaveReel(userId: string, reelId: string): Promise<boolean> {
  const currentIds = await getSavedReelIds(userId);
  const isCurrentlySaved = currentIds.includes(reelId);
  if (isCurrentlySaved) {
    const res = await removeSavedReel(userId, reelId);
    return res.success ? false : true;
  } else {
    const res = await saveReel(userId, reelId);
    return res.success ? true : false;
  }
}

export async function fetchCommunityPosts(): Promise<CommunityPost[]> {
  if (!isSupabaseConfigured()) return [];
  const c = client();
  if (!c) return [];
  try {
    const { data, error } = await c
      .from("community_posts")
      .select("*, author:profiles(*)")
      .order("created_at", { ascending: false });
      
    if (error) {
      console.warn("fetchCommunityPosts error:", error.message);
      return [];
    }
    return (data || []) as CommunityPost[];
  } catch {
    return [];
  }
}

export async function createCommunityPost(postData: {
  author_id: string;
  content: string;
  media_urls?: string[];
  video_url?: string;
  city?: string;
  locality?: string;
}): Promise<CommunityPost | null> {
  const c = client();
  if (!c) throw new Error("Supabase not configured");
  
  const payload = {
    ...postData,
    likes_count: 0,
    comments_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await c
        .from("community_posts")
        .insert([payload])
        .select("*, author:profiles(*)")
        .single();

      if (!error && data) {
        return data as CommunityPost;
      }
      console.warn("createCommunityPost error:", error?.message);
    } catch (err) {
      console.warn("createCommunityPost network error:", err);
    }
  }
  return null;
}

export async function updateCommunityPost(
  postId: string,
  authorId: string,
  updates: Partial<Pick<CommunityPost, "content" | "media_urls" | "video_url" | "city" | "locality">>
): Promise<CommunityPost | null> {
  const c = client();
  if (!c) throw new Error("Supabase not configured");

  const payload = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await c
        .from("community_posts")
        .update(payload)
        .eq("id", postId)
        .eq("author_id", authorId)
        .select("*, author:profiles(*)")
        .single();

      if (!error && data) {
        return data as CommunityPost;
      }
      console.warn("updateCommunityPost error:", error?.message);
    } catch (err) {
      console.warn("updateCommunityPost network error:", err);
    }
  }
  return null;
}

export async function deleteCommunityPost(postId: string, authorId: string): Promise<{ success: boolean; error?: string }> {
  const c = client();
  if (!c) throw new Error("Supabase not configured");

  if (isSupabaseConfigured()) {
    try {
      // First get the post to clean up media
      const { data: postData, error: fetchErr } = await c
        .from("community_posts")
        .select("media_urls, video_url")
        .eq("id", postId)
        .eq("author_id", authorId)
        .maybeSingle();

      if (fetchErr) {
        console.warn("deleteCommunityPost fetch error:", fetchErr.message);
      }

      // Clean up media from storage
      const allUrls = [
        ...(postData?.media_urls || []),
        ...(postData?.video_url ? [postData.video_url] : []),
      ];
      const filesToRemove: string[] = [];
      for (const url of allUrls) {
        if (typeof url === "string" && url.includes("/property-media/")) {
          const parts = url.split("/property-media/");
          if (parts[1]) {
            filesToRemove.push(decodeURIComponent(parts[1].split("?")[0]));
          }
        }
      }
      if (filesToRemove.length > 0) {
        try {
          await c.storage.from("property-media").remove(filesToRemove);
        } catch (e) {
          console.warn("Storage cleanup note:", e);
        }
      }

      // Delete the post
      const { error: delError } = await c
        .from("community_posts")
        .delete()
        .eq("id", postId)
        .eq("author_id", authorId);

      if (delError) {
        console.error("deleteCommunityPost DB error:", delError.message);
        return { success: false, error: delError.message };
      }
      return { success: true };
    } catch (err: any) {
      console.error("deleteCommunityPost network error:", err);
      return { success: false, error: err?.message || "नेटवर्क त्रुटि के कारण पोस्ट हटाई नहीं जा सकी।" };
    }
  }
  return { success: false, error: "Supabase not configured" };
}

export type LikeTargetType = "property" | "reel" | "post";

export async function toggleLike(userId: string, targetId: string, type: LikeTargetType): Promise<boolean> {
  const key = type === "property" ? "property_id" : type === "reel" ? "reel_id" : "post_id";
  const c = client();
  if (!c) return false;
  try {
    const { data: existing, error } = await c
      .from("likes")
      .select("id")
      .eq("user_id", userId)
      .eq(key, targetId)
      .maybeSingle();
    
    if (error) {
      console.error("toggleLike error:", error);
      return false;
    }
    
    if (existing) {
      await c.from("likes").delete().eq("id", existing.id);
      return false;
    } else {
      await c.from("likes").insert([{ user_id: userId, [key]: targetId }]);
      return true;
    }
  } catch {
    return false;
  }
}

export async function getLikes(targetId: string, type: LikeTargetType): Promise<any[]> {
  const key = type === "property" ? "property_id" : type === "reel" ? "reel_id" : "post_id";
  const c = client();
  if (!c) return [];
  try {
    const { data, error } = await c
      .from("likes")
      .select("*")
      .eq(key, targetId);
    
    if (error) {
      console.error("getLikes error:", error);
      return [];
    }
    return data || [];
  } catch {
    return [];
  }
}

export async function incrementViews(targetTable: "properties" | "reels", rowId: string): Promise<void> {
  const c = client();
  if (!c) return;
  try {
    const { error } = await c.rpc("increment_views", { target_table: targetTable, row_id: rowId });
    if (error) {
      console.error("incrementViews error:", error);
    }
  } catch {
    // ignore
  }
}

export async function toggleFollow(followerId: string, followingId: string): Promise<boolean> {
  if (followerId === followingId) return false; // prevent self-follow
  const c = client();
  if (!c) return false;
  try {
    const { data: existing, error } = await c
      .from("follows")
      .select("id")
      .eq("follower_id", followerId)
      .eq("following_id", followingId)
      .maybeSingle();
      
    if (error) {
      console.error("toggleFollow select error:", error);
      return false;
    }
    
    if (existing) {
      const { error: delError } = await c.from("follows").delete().eq("id", existing.id);
      if (delError) console.error("toggleFollow delete error:", delError);
      return false;
    } else {
      const { error: insError } = await c.from("follows").insert([{ follower_id: followerId, following_id: followingId }]);
      if (insError) console.error("toggleFollow insert error:", insError);
      return true;
    }
  } catch (err) {
    console.error("toggleFollow error:", err);
    return false;
  }
}

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  if (followerId === followingId) return false;
  const c = client();
  if (!c) return false;
  try {
    const { data, error } = await c
      .from("follows")
      .select("id")
      .eq("follower_id", followerId)
      .eq("following_id", followingId)
      .maybeSingle();
    if (error) return false;
    return !!data;
  } catch {
    return false;
  }
}

export async function getFollowers(userId: string): Promise<any[]> {
  const c = client();
  if (!c) return [];
  try {
    const { data, error } = await c
      .from("follows")
      .select("*, follower:profiles!follower_id(*)")
      .eq("following_id", userId);
    if (error) {
      console.error("getFollowers error:", error);
      return [];
    }
    return data || [];
  } catch {
    return [];
  }
}

export async function getFollowing(userId: string): Promise<any[]> {
  const c = client();
  if (!c) return [];
  try {
    const { data, error } = await c
      .from("follows")
      .select("*, following:profiles!following_id(*)")
      .eq("follower_id", userId);
    if (error) {
      console.error("getFollowing error:", error);
      return [];
    }
    return data || [];
  } catch {
    return [];
  }
}

export async function fetchPublicProfile(userId: string): Promise<Profile | null> {
  const c = client();
  if (!c) return null;
  const { data, error } = await c
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
    
  if (error) return null;
  return data as Profile;
}

export async function fetchUserProperties(userId: string): Promise<Property[]> {
  const c = client();
  if (!c) return [];
  const { data, error } = await c
    .from("properties")
    .select("*, author:profiles(*)")
    .eq("author_id", userId)
    .order("created_at", { ascending: false });
    
  if (error) return [];
  return (data || []).map(normalizeProperty);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

export async function uploadPropertyMedia(file: File): Promise<string> {
  const isVideo = file.type.startsWith("video/");
  const rawExt = file.name.split(".").pop();
  const fileExt =
    rawExt && /^[a-zA-Z0-9]+$/.test(rawExt)
      ? rawExt.toLowerCase()
      : isVideo
      ? "mp4"
      : "jpg";
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

  // 1. If Supabase is configured with real credentials (not placeholder), try Supabase Storage first
  if (isSupabaseConfigured()) {
    const c = client();
    if (c) {
      try {
        // Get authenticated user id for ownership‑scoped path
        const { data: { user }, error: userErr } = await c.auth.getUser();
        if (userErr || !user) {
          console.warn("Cannot determine authenticated user for upload:", userErr?.message);
        } else {
          const userId = user.id;
          const filePath = `properties/${userId}/${fileName}`;
          const { error: uploadError } = await c.storage
            .from("property-media")
            .upload(filePath, file, {
              contentType: file.type || (fileExt === "mp4" ? "video/mp4" : "image/jpeg"),
              cacheControl: "3600",
              upsert: false,
            });

          if (!uploadError) {
            const { data } = c.storage.from("property-media").getPublicUrl(filePath);
            if (data?.publicUrl) {
              return data.publicUrl;
            }
          } else {
            console.warn("Supabase storage upload error:", uploadError.message);
          }
        }
      } catch (supabaseErr: any) {
        console.warn("Supabase storage upload request failed:", supabaseErr?.message || supabaseErr);
      }
    }
  }

  // 2. Primary local/server upload: use /api/upload endpoint (supports videos & images up to 100MB)
  try {
    const formData = new FormData();
    formData.append("file", file);
    const token = await getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
      headers,
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.url) {
        return data.url;
      }
    } else {
      console.warn("Server /api/upload returned non-200 status:", res.status);
    }
  } catch (serverErr: any) {
    console.warn("Server /api/upload fetch failed:", serverErr?.message || serverErr);
  }

  // 3. Fallback handling: Images can use Data/Object URLs, Videos MUST have persistent storage
  if (isVideo) {
    // Video uploads require persistent storage (Supabase or server endpoint)
    // NEVER return blob: or data: URLs for videos - they break on page refresh
    const errorMsg = isSupabaseConfigured() 
      ? "Video upload failed: Supabase Storage upload succeeded but public URL unavailable. Check bucket policies."
      : "Video upload requires configured Supabase Storage. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.";
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // 4. Images only: Guaranteed client fallback (Data URL or Object URL)
  try {
    if (file.size < 15 * 1024 * 1024) {
      return await fileToDataUrl(file);
    }
    return URL.createObjectURL(file);
  } catch (fallbackErr) {
    console.warn("Data URL conversion failed, using blob object URL:", fallbackErr);
    return URL.createObjectURL(file);
  }
}

export interface ReelVideoMetadata {
  videoUrl: string;
  videoWidth: number;
  videoHeight: number;
  videoFileSize: number;
  durationSec: number;
  thumbnailUrl?: string;
  userId: string;
}

function getVideoMetadata(file: File): Promise<{ width: number; height: number; duration: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        duration: Math.round(video.duration),
      });
      URL.revokeObjectURL(video.src);
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error("Failed to load video metadata"));
    };
    video.src = URL.createObjectURL(file);
  });
}

export async function uploadReelVideo(file: File): Promise<ReelVideoMetadata> {
  // Validate file type
  const allowedTypes = ["video/mp4", "video/webm", "video/quicktime"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("केवल MP4, WebM या MOV वीडियो फ़ाइलें अपलोड करें।");
  }

  // Validate file size (100 MB)
  const MAX_SIZE = 100 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error("वीडियो का आकार 100 MB से अधिक नहीं होना चाहिए।");
  }

  // Get authenticated user from active Supabase client
  const c = client();
  if (!c) throw new Error("Supabase not configured");
  const { data: { user }, error: authError } = await c.auth.getUser();
  
  // TEMPORARY DIAGNOSTICS - REMOVE AFTER DEBUG
  console.log("[ReelUpload] auth.getUser() result:", {
    hasUser: !!user,
    userId: user?.id,
    authError: authError?.message,
    authErrorCode: authError?.code
  });
  
  if (authError || !user) {
    throw new Error("User not authenticated. Please log in to upload a reel.");
  }

  // Extract video metadata before upload
  let width = 0;
  let height = 0;
  let duration = 0;
  try {
    const metadata = await getVideoMetadata(file);
    width = metadata.width;
    height = metadata.height;
    duration = metadata.duration;
  } catch (metaErr) {
    console.warn("Could not extract video metadata:", metaErr);
  }

  // Generate unique filename using authenticated user's ID
  const rawExt = file.name.split(".").pop();
  const fileExt = rawExt && /^[a-zA-Z0-9]+$/.test(rawExt) ? rawExt.toLowerCase() : "mp4";
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  const filePath = `${user.id}/${fileName}`;
  
  // TEMPORARY DIAGNOSTICS
  console.log("[ReelUpload] Generated storage path:", filePath);
  console.log("[ReelUpload] Folder components:", filePath.split('/'));

  // Upload to Supabase Storage (reels bucket) using same client
  if (isSupabaseConfigured()) {
    try {
      const { error: uploadError } = await c.storage
        .from("reels")
        .upload(filePath, file, {
          contentType: file.type || "video/mp4",
          cacheControl: "3600",
          upsert: false,
        });

      // TEMPORARY DIAGNOSTICS
      console.log("[ReelUpload] Storage upload result:", {
        hasError: !!uploadError,
        errorMessage: uploadError?.message,
        errorName: uploadError?.name
      });

      if (!uploadError) {
        const { data } = c.storage.from("reels").getPublicUrl(filePath);
        if (data?.publicUrl) {
          return {
            videoUrl: data.publicUrl,
            videoWidth: width,
            videoHeight: height,
            videoFileSize: file.size,
            durationSec: duration,
            userId: user.id,
          };
        }
      } else {
        console.warn("Supabase reels storage upload error:", uploadError.message);
        throw new Error(uploadError.message);
      }
    } catch (supabaseErr: any) {
      // TEMPORARY DIAGNOSTICS
      console.log("[ReelUpload] Storage upload exception:", {
        message: supabaseErr?.message,
        code: supabaseErr?.code,
        statusCode: supabaseErr?.statusCode,
        name: supabaseErr?.name,
        stack: supabaseErr?.stack?.slice(0, 500)
      });
      console.warn("Supabase reels storage upload request failed:", supabaseErr?.message || supabaseErr);
      throw supabaseErr;
    }
  }

  // If Supabase not configured or upload failed, throw error for videos (no fallback to /api/upload)
  throw new Error("रील वीडियो अपलोड के लिए Supabase Storage कॉन्फ़िगरेशन आवश्यक है। कृपया VITE_SUPABASE_URL और VITE_SUPABASE_ANON_KEY सेट करें।");
}

export async function createReel(reelData: {
  title: string;
  description?: string;
  video_url: string;
  video_width?: number;
  video_height?: number;
  video_file_size?: number;
  duration_sec?: number;
  city: string;
  locality: string;
  landmark?: string;
  contact_preference?: string;
  userId: string;
}): Promise<Reel | null> {
  const c = client();
  if (!c) throw new Error("Supabase not configured");

  const { userId, ...reelDataRest } = reelData;
  const payload = {
    ...reelDataRest,
    author_id: userId,
    status: "active",
    views_count: 0,
    likes_count: 0,
    comments_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await c
        .from("reels")
        .insert([payload])
        .select("*, author:profiles(*)")
        .single();

      if (!error && data) {
        return data as Reel;
      }
      console.warn("Supabase createReel error:", error?.message);
      
      if (error) {
        try {
          const videoUrl = reelData.video_url;
          if (videoUrl) {
            const url = new URL(videoUrl);
            const pathMatch = url.pathname.match(/\/reels\/([^\/]+)\//);
            if (pathMatch) {
              const userFolder = pathMatch[1];
              const fileName = url.pathname.split('/').pop();
              if (fileName) {
                await c.storage.from("reels").remove([`${userFolder}/${fileName}`]);
              }
            }
          }
        } catch (cleanupErr) {
          console.warn("Failed to cleanup storage object after DB insert failure:", cleanupErr);
        }
      }
    } catch (err) {
      console.warn("createReel network error:", err);
    }
  }

  throw new Error("Failed to create reel in database");
}

export async function updateReelStatus(
  reelId: string,
  newStatus: string,
  authorId: string
): Promise<{ success: boolean; reel?: Reel; error?: string }> {
  const c = client();
  if (!c) return { success: false, error: "Supabase not configured" };
  try {
    const { data, error } = await c
      .from("reels")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", reelId)
      .eq("author_id", authorId)
      .select("*, author:profiles(*)")
      .single();

    if (error) {
      console.error("updateReelStatus DB error:", error.message);
      return { success: false, error: error.message };
    }

    if (data) {
      const normalized = data as Reel;
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("social-properties-realtime", {
            detail: { type: "reel-updated", property: normalized },
          })
        );
      }
      return { success: true, reel: normalized };
    }
    return { success: false, error: "Reel not found" };
  } catch (err: any) {
    console.error("updateReelStatus network error:", err);
    return { success: false, error: err?.message || "Network error" };
  }
}

export async function deleteReel(
  reelId: string,
  authorId: string
): Promise<{ success: boolean; error?: string }> {
  const c = client();
  if (!c) return { success: false, error: "Supabase not configured" };
  try {
    // Fetch reel to get video_url for storage cleanup
    const { data: reel, error: fetchErr } = await c
      .from("reels")
      .select("video_url, author_id")
      .eq("id", reelId)
      .single();

    if (fetchErr || !reel) {
      return { success: false, error: fetchErr?.message || "Reel not found" };
    }
    if (reel.author_id !== authorId) {
      return { success: false, error: "Not authorized" };
    }

    // Delete storage object if possible
    if (reel.video_url) {
      try {
        const url = new URL(reel.video_url);
        const pathMatch = url.pathname.match(/\/reels\/(.+)$/);
        if (pathMatch) {
          const storagePath = pathMatch[1];
          await c.storage.from("reels").remove([storagePath]);
        }
      } catch (storageErr) {
        console.warn("Failed to delete reel video from storage:", storageErr);
      }
    }

    // Delete saved_properties rows referencing this reel
    await c.from("saved_properties").delete().eq("reel_id", reelId);

    // Delete reel record
    const { error: delError } = await c.from("reels").delete().eq("id", reelId);
    if (delError) {
      console.error("deleteReel DB error:", delError.message);
      return { success: false, error: delError.message };
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("social-properties-realtime", {
          detail: { type: "reel-deleted", propertyId: reelId },
        })
      );
    }
    return { success: true };
  } catch (err: any) {
    console.error("deleteReel network error:", err);
    return { success: false, error: err?.message || "Network error" };
  }
}

export async function fetchReels(
  page: number = 1,
  limit: number = 10,
  city?: string
): Promise<Reel[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const c = client();
  if (!c) return [];

  try {
    let query = c
      .from("reels")
      .select("*, author:profiles(*)")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (city && city !== "all") {
      query = query.eq("city", city);
    }

    const { data, error } = await query.range((page - 1) * limit, page * limit - 1);

    if (error) {
      console.warn("fetchReels error:", error.message);
      return [];
    }

    return (data || []) as Reel[];
  } catch (err) {
    console.warn("fetchReels network error:", err);
    return [];
  }
}

export async function uploadProfileImage(file: File): Promise<string> {
  const rawExt = file.name.split(".").pop();
  const fileExt =
    rawExt && /^[a-zA-Z0-9]+$/.test(rawExt)
      ? rawExt.toLowerCase()
      : "jpg";
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  const filePath = `profiles/${fileName}`;

  if (isSupabaseConfigured()) {
    const c = client();
    if (c) {
      try {
        const { error: uploadError } = await c.storage
          .from("property-media")
          .upload(filePath, file, {
            contentType: file.type || `image/${fileExt === "jpg" ? "jpeg" : fileExt}`,
            cacheControl: "3600",
            upsert: false,
          });

        if (!uploadError) {
          const { data } = c.storage.from("property-media").getPublicUrl(filePath);
          if (data?.publicUrl) {
            return data.publicUrl;
          }
        } else {
          console.warn("Supabase profile image upload error:", uploadError.message);
        }
      } catch (supabaseErr: any) {
        console.warn("Supabase profile storage request failed, falling back:", supabaseErr?.message || supabaseErr);
      }
    }
  }

  // Server upload
  try {
    const formData = new FormData();
    formData.append("file", file);
    const token = await getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
      headers,
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.url) {
        return data.url;
      }
    }
  } catch (serverErr: any) {
    console.warn("Server profile upload failed, falling back:", serverErr?.message || serverErr);
  }

  // Client Data URL fallback
  try {
    return await fileToDataUrl(file);
  } catch {
    return URL.createObjectURL(file);
  }
}

export async function updateUserProfile(profile: Profile): Promise<Profile | null> {
  const updatePayload: any = {
    full_name: profile.full_name,
    phone: profile.phone || profile.mobile_number,
    city: profile.city || profile.location,
  };
  if (profile.avatar_url !== undefined) updatePayload.avatar_url = profile.avatar_url;
  if (profile.bio !== undefined) updatePayload.bio = profile.bio;
  if (profile.age !== undefined) updatePayload.age = profile.age;
  if (profile.location !== undefined) updatePayload.location = profile.location;
  if (profile.mobile_number !== undefined) updatePayload.mobile_number = profile.mobile_number;
  if (profile.address !== undefined) updatePayload.address = profile.address;

  const c = client();
  if (!c) throw new Error("Supabase not configured");

  let { data, error } = await c
    .from("profiles")
    .update(updatePayload)
    .eq("id", profile.id)
    .select("*")
    .single();

  // If any extended column does not exist in profiles schema cache (PGRST204 or 42703), retry with core fields
  if (
    error &&
    (error.code === "PGRST204" ||
      error.code === "42703" ||
      error.message?.includes("column") ||
      error.message?.includes("schema cache"))
  ) {
    console.warn("Retrying profile update with core fields only due to missing schema columns:", error.message);
    const corePayload: any = {
      full_name: profile.full_name,
      phone: profile.phone || profile.mobile_number,
      city: profile.city || profile.location,
    };
    if (profile.avatar_url) corePayload.avatar_url = profile.avatar_url;
    if (profile.bio && !error.message?.includes("bio")) corePayload.bio = profile.bio;

    const retry = await c
      .from("profiles")
      .update(corePayload)
      .eq("id", profile.id)
      .select("*")
      .single();
    data = retry.data;
    error = retry.error;
  }
    
  if (error) {
    console.error("updateUserProfile error:", error);
    throw error;
  }
  return { ...profile, ...(data || {}) } as Profile;
}

export interface RegisterUserData {
  fullName: string;
  age: number;
  location: "Bokaro" | "Giridih";
  mobileNumber: string;
  email: string;
  password: string;
  address?: string;
}

export async function saveUserProfile(profileData: {
  id: string;
  full_name: string;
  age?: number;
  location?: string;
  mobile_number?: string;
  address?: string;
  email?: string;
  phone?: string;
  city?: string;
  created_at?: string;
}): Promise<Profile | null> {
  const fullPayload: any = {
    id: profileData.id,
    full_name: profileData.full_name,
    age: profileData.age,
    location: profileData.location,
    mobile_number: profileData.mobile_number,
    address: profileData.address || null,
    email: profileData.email,
    phone: profileData.mobile_number || profileData.phone || null,
    city: profileData.location || profileData.city || "Bokaro",
    created_at: profileData.created_at || new Date().toISOString(),
  };

  const c = client();
  if (!c) throw new Error("Supabase not configured");

  let { data, error } = await c
    .from("profiles")
    .upsert(fullPayload)
    .select("*")
    .single();

  // If new columns (age, location, address, etc.) don't exist yet in the database schema (PGRST204 or 42703),
  // fallback to the core columns known to exist in the database (id, full_name, phone, city)
  if (
    error &&
    (error.code === "PGRST204" ||
      error.code === "42703" ||
      error.message?.includes("column") ||
      error.message?.includes("schema cache"))
  ) {
    const fallbackPayload: any = {
      id: profileData.id,
      full_name: profileData.full_name,
      phone: profileData.mobile_number || profileData.phone || null,
      city: profileData.location || profileData.city || "Bokaro",
      created_at: profileData.created_at || new Date().toISOString(),
    };
    const retry = await c
      .from("profiles")
      .upsert(fallbackPayload)
      .select("*")
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    if (error.code === "42501") {
      console.warn("User profile cannot be upserted yet due to RLS (session pending confirmation):", error.message);
      return fullPayload as Profile;
    }
    console.error("saveUserProfile error:", error);
    throw error;
  }
  return { ...fullPayload, ...(data || {}) } as Profile;
}

export async function signUpWithEmail(params: RegisterUserData) {
  const c = client();
  if (!c) throw new Error("Supabase not configured");
  const { data, error } = await c.auth.signUp({
    email: params.email.trim(),
    password: params.password,
    options: {
      data: {
        full_name: params.fullName.trim(),
        age: Number(params.age),
        location: params.location,
        mobile_number: params.mobileNumber.trim(),
        address: params.address?.trim() || null,
        email: params.email.trim(),
      },
    },
  });

  if (error) throw error;

  // Only attempt direct upsert if session was issued immediately
  // (otherwise user is unauthenticated anon and RLS will prevent upsert until confirmed/logged in)
  if (data.session && data.user) {
    try {
      await saveUserProfile({
        id: data.user.id,
        full_name: params.fullName.trim(),
        age: Number(params.age),
        location: params.location,
        mobile_number: params.mobileNumber.trim(),
        address: params.address?.trim() || "",
        email: params.email.trim(),
        phone: params.mobileNumber.trim(),
        city: params.location,
        created_at: new Date().toISOString(),
      });
    } catch (saveErr) {
      console.warn("Could not persist initial profile into public.profiles:", saveErr);
    }
  }

  return data;
}

export async function signInWithEmail(email: string, password: string) {
  const c = client();
  if (!c) throw new Error("Supabase not configured");
  const { data, error } = await c.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
  return data;
}

export async function sendPasswordResetEmail(email: string) {
  const c = client();
  if (!c) throw new Error("Supabase not configured");
  const { data, error } = await c.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}`,
  });
  if (error) throw error;
  return data;
}

// Notifications
export interface Notification {
  id: string;
  user_id: string;
  type: "new_message" | "liked" | "commented" | "saved" | "price_drop";
  content: string;
  is_read: boolean;
  target_type?: "property" | "reel" | "chat";
  target_id?: string;
  created_at: string;
}

export async function fetchNotifications(userId: string, limit = 20): Promise<Notification[]> {
  const c = client();
  if (!c) return [];
  const { data, error } = await c
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.warn("fetchNotifications error:", error.message);
    return [];
  }
  return (data || []) as Notification[];
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const c = client();
  if (!c) return 0;
  const { count, error } = await c
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  if (error) return 0;
  return count || 0;
}

export async function markNotificationRead(notificationId: string): Promise<boolean> {
  const c = client();
  if (!c) return false;
  const { error } = await c
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);
  return !error;
}

export async function markAllNotificationsRead(userId: string): Promise<boolean> {
  const c = client();
  if (!c) return false;
  const { error } = await c
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  return !error;
}

