import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Profile, Property, PropertyStatus, Conversation, Message, PropertyComment, SavedProperty, PropertyFilterState } from "../types/database";

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

const configUrl = getSupabaseConfig().url;
const validUrl = configUrl.startsWith("http") ? configUrl : "https://placeholder.supabase.co";

export const supabase = createClient(
  validUrl, 
  getSupabaseConfig().anonKey || "placeholder"
);

let supabaseInstance: SupabaseClient | null = supabase;

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
  return supabaseInstance;
}

function initSupabaseClient(): void {
  const config = getSupabaseConfig();
  if (config.url && config.anonKey && config.url.startsWith("http") && !config.url.includes("placeholder")) {
    try {
      supabaseInstance = createClient(config.url, config.anonKey);
    } catch (err) {
      console.warn("Failed to initialize Supabase client:", err);
      supabaseInstance = null;
    }
  }
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
    let query = supabase.from("properties").select("*, author:profiles(*)");

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
const KNOWN_DB_PROPERTY_TYPES = ["flat", "house", "pg", "commercial", "land"];
function mapToSafeDbPropertyType(rawType: string): string {
  if (KNOWN_DB_PROPERTY_TYPES.includes(rawType)) return rawType;
  if (rawType === "villa") return "house";
  if (["office", "shop", "warehouse"].includes(rawType)) return "commercial";
  if (["agricultural_land"].includes(rawType)) return "land";
  return "commercial";
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

  // First attempt: insert payload with mapped DB property type
  const safeDbPropType = mapToSafeDbPropertyType(payload.property_type);
  const attemptedPayload = { ...payload, property_type: safeDbPropType };

  if (isSupabaseConfigured()) {
    try {
      let { data, error } = await supabase
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

        const retry = await supabase
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
    lat: payload.lat,
    lng: payload.lng,
    media_urls: payload.media_urls || [],
    video_url: payload.video_url,
    status: payload.status || "active",
    carpet_area: payload.carpet_area,
    built_up_area: payload.built_up_area,
    plot_area: payload.plot_area,
    balconies: payload.balconies,
    floor_number: payload.floor_number,
    total_floors: payload.total_floors,
    parking: payload.parking,
    property_age: payload.property_age,
    facing: payload.facing,
    boundary_wall: payload.boundary_wall,
    corner_plot: payload.corner_plot,
    commercial_category: payload.commercial_category,
    washroom: payload.washroom,
    power_backup: payload.power_backup,
    negotiable: payload.negotiable,
    landmark: payload.landmark,
    contact_preference: payload.contact_preference,
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

  if (payload.property_type) {
    payload.property_type = mapToSafeDbPropertyType(payload.property_type);
  }
  if (payload.listing_type === "lease") {
    payload.listing_type = "rent";
  }

  if (isSupabaseConfigured()) {
    try {
      let { data, error } = await supabase
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

        const retry = await supabase
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
    try {
      let { data, error } = await supabase
        .from("properties")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("author_id", authorId)
        .select("*, author:profiles(*)")
        .single();

      // If 'closed' is not supported in the database enum, fall back to domain status
      if (error && (error.message?.includes("invalid input value for enum") || error.code === "22P02") && newStatus === "closed") {
        const fallbackStatus = updatedLocal?.listing_type === "rent" ? "rented" : "sold";
        const retry = await supabase
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
    try {
      // Step 1: Verify ownership and inspect media
      const { data: propData, error: fetchErr } = await supabase
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
          await supabase.storage.from("property-media").remove(filesToRemove);
        } catch (e) {
          console.warn("Storage cleanup note:", e);
        }
      }

      // Step 3: Remove saved property rows
      try {
        await supabase.from("saved_properties").delete().eq("property_id", id);
      } catch (e) {
        console.warn("saved_properties delete note:", e);
      }

      // Step 4: Delete the property record (enforcing author_id if provided)
      let delQuery = supabase.from("properties").delete().eq("id", id);
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
  const { data, error } = await supabase
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
  const { data, error } = await supabase
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
  const newMessage = {
    conversation_id: conversationId,
    sender_id: senderId,
    text,
    media_url: mediaUrl,
  };
  
  const { data, error } = await supabase
    .from("messages")
    .insert([newMessage])
    .select("*, sender:profiles(*)")
    .single();
    
  if (error) {
    console.error("sendMessage error:", error);
    return null;
  }
  
  // Update last_message_at
  await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);
    
  return data as Message;
}

export async function getOrCreateConversation(propertyId: string, buyerId: string, ownerId: string): Promise<Conversation | null> {
  const { data: existing, error: findError } = await supabase
    .from("conversations")
    .select("*")
    .eq("property_id", propertyId)
    .or(`and(participant_1.eq.${buyerId},participant_2.eq.${ownerId}),and(participant_1.eq.${ownerId},participant_2.eq.${buyerId})`)
    .single();
    
  if (existing) {
    return existing as Conversation;
  }
  
  const { data: newConv, error: createError } = await supabase
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
  const { data, error } = await supabase
    .from("comments")
    .select("*, author:profiles(*)")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: true });
    
  if (error) return [];
  return data as PropertyComment[];
}

export async function addPropertyComment(propertyId: string, authorId: string, content: string): Promise<PropertyComment | null> {
  const { data, error } = await supabase
    .from("comments")
    .insert([{ property_id: propertyId, author_id: authorId, content }])
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

  try {
    const { data, error } = await supabase
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

  try {
    const { data, error } = await supabase
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
    try {
      const { error } = await supabase
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
    try {
      const { error } = await supabase
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

export async function fetchCommunityPosts(): Promise<any[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase
      .from("community_posts")
      .select("*, author:profiles(*)")
      .order("created_at", { ascending: false });
      
    if (error) {
      // Table may not be created in schema yet (e.g. PGRST205) - return empty array without logging uncaught error
      return [];
    }
    return data || [];
  } catch {
    return [];
  }
}

export async function toggleLike(userId: string, targetId: string, type: "property" | "post"): Promise<boolean> {
  const key = type === "property" ? "property_id" : "post_id";
  try {
    const { data: existing, error } = await supabase
      .from("likes")
      .select("id")
      .eq("user_id", userId)
      .eq(key, targetId)
      .maybeSingle();
      
    if (error) {
      // Fallback to local storage if likes table does not exist
      const storageKey = `sp_likes_${type}_${userId}`;
      const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
      if (saved.includes(targetId)) {
        localStorage.setItem(storageKey, JSON.stringify(saved.filter((id: string) => id !== targetId)));
        return false;
      } else {
        localStorage.setItem(storageKey, JSON.stringify([...saved, targetId]));
        return true;
      }
    }
    
    if (existing) {
      await supabase.from("likes").delete().eq("id", existing.id);
      return false;
    } else {
      await supabase.from("likes").insert([{ user_id: userId, [key]: targetId }]);
      return true;
    }
  } catch {
    return false;
  }
}

export async function getLikes(targetId: string, type: "property" | "post"): Promise<any[]> {
  const key = type === "property" ? "property_id" : "post_id";
  try {
    const { data, error } = await supabase
      .from("likes")
      .select("*")
      .eq(key, targetId);
      
    if (error) {
      return [];
    }
    return data || [];
  } catch {
    return [];
  }
}

export async function toggleFollow(followerId: string, followingId: string): Promise<boolean> {
  try {
    const { data: existing, error } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", followerId)
      .eq("following_id", followingId)
      .maybeSingle();
      
    if (error) {
      const storageKey = `sp_follows_${followerId}`;
      const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
      if (saved.includes(followingId)) {
        localStorage.setItem(storageKey, JSON.stringify(saved.filter((id: string) => id !== followingId)));
        return false;
      } else {
        localStorage.setItem(storageKey, JSON.stringify([...saved, followingId]));
        return true;
      }
    }
    
    if (existing) {
      await supabase.from("follows").delete().eq("id", existing.id);
      return false;
    } else {
      await supabase.from("follows").insert([{ follower_id: followerId, following_id: followingId }]);
      return true;
    }
  } catch {
    return false;
  }
}

export async function getFollowers(userId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from("follows")
      .select("*, follower:profiles!follower_id(*)")
      .eq("following_id", userId);
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

export async function getFollowing(userId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from("follows")
      .select("*, following:profiles!following_id(*)")
      .eq("follower_id", userId);
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

export async function fetchPublicProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
    
  if (error) return null;
  return data as Profile;
}

export async function fetchUserProperties(userId: string): Promise<Property[]> {
  const { data, error } = await supabase
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
  const rawExt = file.name.split(".").pop();
  const fileExt =
    rawExt && /^[a-zA-Z0-9]+$/.test(rawExt)
      ? rawExt.toLowerCase()
      : file.type.startsWith("video/")
      ? "mp4"
      : "jpg";
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  const filePath = `properties/${fileName}`;

  // 1. If Supabase is configured with real credentials (not placeholder), try Supabase Storage first
  if (isSupabaseConfigured()) {
    try {
      const { error: uploadError } = await supabase.storage
        .from("property-media")
        .upload(filePath, file, {
          contentType: file.type || (fileExt === "mp4" ? "video/mp4" : "image/jpeg"),
          cacheControl: "3600",
          upsert: false,
        });

      if (!uploadError) {
        const { data } = supabase.storage.from("property-media").getPublicUrl(filePath);
        if (data?.publicUrl) {
          return data.publicUrl;
        }
      } else {
        console.warn("Supabase storage upload error:", uploadError.message);
      }
    } catch (supabaseErr: any) {
      console.warn("Supabase storage upload request failed, falling back:", supabaseErr?.message || supabaseErr);
    }
  }

  // 2. Primary local/server upload: use /api/upload endpoint (supports videos & images up to 100MB)
  try {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
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
    console.warn("Server /api/upload fetch failed, falling back to local object/data URL:", serverErr?.message || serverErr);
  }

  // 3. Guaranteed client fallback: base64 Data URL or Object URL (never throws "Failed to fetch")
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

export async function uploadProfileImage(file: File): Promise<string> {
  const rawExt = file.name.split(".").pop();
  const fileExt =
    rawExt && /^[a-zA-Z0-9]+$/.test(rawExt)
      ? rawExt.toLowerCase()
      : "jpg";
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  const filePath = `profiles/${fileName}`;

  if (isSupabaseConfigured()) {
    try {
      const { error: uploadError } = await supabase.storage
        .from("property-media")
        .upload(filePath, file, {
          contentType: file.type || `image/${fileExt === "jpg" ? "jpeg" : fileExt}`,
          cacheControl: "3600",
          upsert: false,
        });

      if (!uploadError) {
        const { data } = supabase.storage.from("property-media").getPublicUrl(filePath);
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

  // Server upload
  try {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
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

  let { data, error } = await supabase
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

    const retry = await supabase
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

  let { data, error } = await supabase
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
    const retry = await supabase
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
  const { data, error } = await supabase.auth.signUp({
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
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
  return data;
}

export async function sendPasswordResetEmail(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}`,
  });
  if (error) throw error;
  return data;
}

