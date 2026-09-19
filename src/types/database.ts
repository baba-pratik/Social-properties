/**
 * Database Schema and Data Models for Social Properties (सोशल प्रॉपर्टीज)
 * Focus regions: बोकारो (Bokaro) & गिरिडीह (Giridih), झारखंड
 */

export type ListingType = "rent" | "sale";

export type PropertyType = 
  | "flat" 
  | "house" 
  | "villa" 
  | "pg" 
  | "commercial" 
  | "office"
  | "shop"
  | "warehouse"
  | "land" 
  | "agricultural_land"
  | "other";

export type PropertyStatus = "active" | "sold" | "rented" | "closed";

export interface Profile {
  id: string; // UUID, Supabase Auth user ID
  user_id?: string;
  full_name: string;
  age?: number;
  location?: string;
  locality?: string;
  mobile_number?: string;
  address?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  city?: string; // बोकारो / गिरिडीह / अन्य
  role?: string;
  user_type?: "owner" | "broker" | "buyer" | string;
  is_verified?: boolean;
  is_verified_broker?: boolean;
  bio?: string;
  followers_count?: number;
  following_count?: number;
  created_at: string;
}

export interface Property {
  id: string; // UUID
  author_id: string; // UUID -> profiles.id
  author?: Profile;
  title: string;
  description: string;
  price: number;
  listing_type: ListingType; // rent, sale
  property_type: PropertyType;
  bedrooms: number;
  bathrooms: number;
  furnishing?: string; // Furnished, Semi-Furnished, Unfurnished
  address: string;
  locality: string; // जैसे सेक्टर 4 बोकारो, टॉवर चौक गिरिडीह
  city: string; // बोकारो / गिरिडीह / अन्य
  lat: number;
  lng: number;
  video_url?: string; // Vertical video support
  media_urls: string[]; // तस्वीरों के लिए URLs
  status: PropertyStatus; // active, sold, rented
  views_count?: number;
  likes_count?: number;
  comments_count?: number;
  // Extended fields for dynamic property forms
  balconies?: number;
  carpet_area?: number;
  built_up_area?: number;
  floor_number?: number;
  total_floors?: number;
  parking?: string;
  property_age?: string;
  facing?: string;
  plot_area?: number;
  area_unit?: string;
  road_width?: number;
  boundary_wall?: boolean;
  land_use?: string;
  corner_plot?: boolean;
  ownership_status?: string;
  commercial_category?: string;
  washroom?: boolean;
  power_backup?: boolean;
  negotiable?: boolean;
  landmark?: string;
  contact_preference?: string;
  created_at: string;
  updated_at?: string;
}

// Social Models
export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface Like {
  id: string;
  user_id: string;
  property_id?: string;
  post_id?: string;
  created_at: string;
}

export interface CommunityPost {
  id: string;
  author_id: string;
  author?: Profile;
  content: string;
  media_urls?: string[];
  video_url?: string;
  city: string; // बोकारो / गिरिडीह / अन्य
  locality?: string;
  likes_count?: number;
  comments_count?: number;
  created_at: string;
}

export interface Conversation {
  id: string;
  property_id: string;
  property?: Property;
  participant_1: string; // buyer UUID
  participant_2: string; // owner/broker UUID
  participant_1_profile?: Profile;
  participant_2_profile?: Profile;
  last_message_at: string;
  created_at: string;
  last_message?: string;
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender?: Profile;
  text: string;
  media_url?: string;
  is_read: boolean;
  created_at: string;
}

export interface SavedProperty {
  id: string;
  user_id: string;
  property_id: string;
  property?: Property;
  created_at: string;
}

export interface PropertyComment {
  id: string;
  property_id: string;
  author_id: string;
  author?: Profile;
  content: string;
  created_at: string;
}

export interface PropertyFilterState {
  city: string; // "all" | "बोकारो" | "गिरिडीह" | "अन्य"
  locality: string;
  listing_type: string; // "all" | "rent" | "sale" | "lease"
  property_type: string;
  bedrooms: number | null;
  min_price: number;
  max_price: number;
  min_area?: number | null;
  max_area?: number | null;
  furnishing?: string;
  verified_only?: boolean;
  search_query: string;
  author_id?: string;
  status?: string;
  sort_by: "newest" | "oldest" | "price_asc" | "price_desc" | "popular" | "views" | "likes";
}
