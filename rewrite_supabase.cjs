const fs = require('fs');
const content = `import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Profile, Property, Conversation, Message, PropertyComment, SavedProperty, UserRole } from "../types/database";

const STORAGE_KEYS = {
  SUPABASE_CONFIG: "sp_supabase_config_v1",
};

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function getSupabaseConfig(): SupabaseConfig {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || "";
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || "";
  
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

export const supabase = createClient(
  getSupabaseConfig().url, 
  getSupabaseConfig().anonKey
);

let supabaseInstance: SupabaseClient | null = supabase;

export function isSupabaseConfigured(): boolean {
  const config = getSupabaseConfig();
  return Boolean(config.url && config.anonKey && config.url.startsWith("http"));
}

export function getSupabaseClient(): SupabaseClient | null {
  return supabaseInstance;
}

function initSupabaseClient(): void {
  const config = getSupabaseConfig();
  if (config.url && config.anonKey && config.url.startsWith("http")) {
    try {
      supabaseInstance = createClient(config.url, config.anonKey);
    } catch (err) {
      console.warn("Failed to initialize Supabase client:", err);
      supabaseInstance = null;
    }
  }
}

// Global Custom Event Emitter for legacy calls
const emitRealtimeEvent = (eventName: string, detail: any) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("social-properties-realtime", { detail: { event: eventName, ...detail } })
    );
  }
};

export async function fetchProperties(page: number = 1, limit: number = 10): Promise<Property[]> {
  const { data, error } = await supabase
    .from("properties")
    .select("*, author:profiles(*)")
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);
    
  if (error) {
    console.error("fetchProperties error:", error);
    return [];
  }
  return data as Property[];
}

export async function createProperty(propertyData: any): Promise<Property | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  
  const { data, error } = await supabase
    .from("properties")
    .insert([{ ...propertyData, author_id: session.user.id }])
    .select("*, author:profiles(*)")
    .single();
    
  if (error) {
    console.error("createProperty error:", error);
    throw error;
  }
  return data as Property;
}

export async function fetchUserConversations(userId: string): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("*, property:properties(*), participant_1_profile:profiles!participant_1(*), participant_2_profile:profiles!participant_2(*)")
    .or(\`participant_1.eq.\${userId},participant_2.eq.\${userId}\`)
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
    .update({ last_message_at: new Date().toISOString(), last_message: text })
    .eq("id", conversationId);
    
  return data as Message;
}

export async function getOrCreateConversation(propertyId: string, buyerId: string, ownerId: string): Promise<Conversation | null> {
  const { data: existing, error: findError } = await supabase
    .from("conversations")
    .select("*")
    .eq("property_id", propertyId)
    .or(\`and(participant_1.eq.\${buyerId},participant_2.eq.\${ownerId}),and(participant_1.eq.\${ownerId},participant_2.eq.\${buyerId})\`)
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

export async function getSavedPropertyIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("saved_properties")
    .select("property_id")
    .eq("user_id", userId);
    
  if (error) return [];
  return data.map(d => d.property_id);
}

export async function toggleSaveProperty(userId: string, propertyId: string): Promise<boolean> {
  const { data: existing } = await supabase
    .from("saved_properties")
    .select("id")
    .eq("user_id", userId)
    .eq("property_id", propertyId)
    .single();
    
  if (existing) {
    await supabase.from("saved_properties").delete().eq("id", existing.id);
    return false;
  } else {
    await supabase.from("saved_properties").insert([{ user_id: userId, property_id: propertyId }]);
    return true;
  }
}

export async function fetchStories(): Promise<any[]> {
  const { data, error } = await supabase
    .from("stories")
    .select("*, author:profiles(*)")
    .gte("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });
    
  if (error) return [];
  return data;
}

export async function fetchCommunityPosts(): Promise<any[]> {
  const { data, error } = await supabase
    .from("community_posts")
    .select("*, author:profiles(*)")
    .order("created_at", { ascending: false });
    
  if (error) return [];
  return data;
}

export async function toggleLike(userId: string, targetId: string, type: "property" | "post"): Promise<boolean> {
  const key = type === "property" ? "property_id" : "post_id";
  const { data: existing } = await supabase
    .from("likes")
    .select("id")
    .eq("user_id", userId)
    .eq(key, targetId)
    .single();
    
  if (existing) {
    await supabase.from("likes").delete().eq("id", existing.id);
    return false;
  } else {
    await supabase.from("likes").insert([{ user_id: userId, [key]: targetId }]);
    return true;
  }
}

export async function getLikes(targetId: string, type: "property" | "post"): Promise<any[]> {
  const key = type === "property" ? "property_id" : "post_id";
  const { data, error } = await supabase
    .from("likes")
    .select("*")
    .eq(key, targetId);
    
  if (error) return [];
  return data;
}

export async function toggleFollow(followerId: string, followingId: string): Promise<boolean> {
  const { data: existing } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .single();
    
  if (existing) {
    await supabase.from("follows").delete().eq("id", existing.id);
    return false;
  } else {
    await supabase.from("follows").insert([{ follower_id: followerId, following_id: followingId }]);
    return true;
  }
}

export async function getFollowers(userId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from("follows")
    .select("*, follower:profiles!follower_id(*)")
    .eq("following_id", userId);
  if (error) return [];
  return data;
}

export async function getFollowing(userId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from("follows")
    .select("*, following:profiles!following_id(*)")
    .eq("follower_id", userId);
  if (error) return [];
  return data;
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
  return data as Property[];
}
`;
fs.writeFileSync('src/lib/supabase.ts', content);
