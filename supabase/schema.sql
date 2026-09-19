-- ==============================================================================
-- SOCIAL PROPERTIES (सोशल प्रॉपर्टीज) - DATABASE SCHEMA & RLS POLICIES
-- Target Regions: बोकारो (Bokaro) & गिरिडीह (Giridih), झारखंड
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. Custom ENUM Types
// UserRole enum removed
// DO $$ BEGIN
//    CREATE TYPE user_role AS ENUM ('buyer', 'owner', 'broker');
// EXCEPTION
//    WHEN duplicate_object THEN null;
// END $$;

DO $$ BEGIN
    CREATE TYPE listing_type_enum AS ENUM ('rent', 'sale');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE property_type_enum AS ENUM ('flat', 'house', 'pg', 'commercial');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE property_status_enum AS ENUM ('active', 'sold', 'rented');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Profiles Table (संबद्ध प्रोफाइल)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    age INTEGER,
    location TEXT,
    mobile_number TEXT,
    address TEXT,
    email TEXT,
    phone TEXT,
    avatar_url TEXT,
    bio TEXT,
    city TEXT DEFAULT 'Bokaro',
    is_verified_broker BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Properties Table (प्रॉपर्टी लिस्टिंग्स)
CREATE TABLE IF NOT EXISTS public.properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price NUMERIC NOT NULL,
    listing_type listing_type_enum NOT NULL,
    property_type property_type_enum NOT NULL,
    bedrooms INTEGER DEFAULT 1,
    bathrooms INTEGER DEFAULT 1,
    furnishing TEXT DEFAULT 'Semi-Furnished',
    address TEXT NOT NULL,
    locality TEXT NOT NULL, -- जैसे सेक्टर 4 बोकारो, टॉवर चौक गिरिडीह
    city TEXT NOT NULL,     -- बोकारो / गिरिडीह / अन्य
    lat NUMERIC,
    lng NUMERIC,
    media_urls TEXT[] DEFAULT '{}'::TEXT[],
    status property_status_enum DEFAULT 'active'::property_status_enum NOT NULL,
    views_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Saved Properties / Wishlist (पसंदीदा प्रॉपर्टीज)
CREATE TABLE IF NOT EXISTS public.saved_properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, property_id)
);

-- 6. Comments Table (सार्वजनिक टिप्पणियाँ व पूछताछ)
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
    author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. Conversations Table (चैट रूम)
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
    participant_1 UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    participant_2 UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    last_message_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(property_id, participant_1, participant_2)
);

-- 8. Messages Table (रियल-टाइम संदेश)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    text TEXT NOT NULL,
    media_url TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 9. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 10. RLS Policies
-- Profiles: Any authenticated or anonymous user can read public profiles; users can update their own
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Properties: Anyone can view active properties; Authors can create, update, delete their properties
CREATE POLICY "Anyone can view properties" 
ON public.properties FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert properties" 
ON public.properties FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authors can update their own properties" 
ON public.properties FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete their own properties" 
ON public.properties FOR DELETE USING (auth.uid() = author_id);

-- Saved Properties: Users can view and manage their wishlist
CREATE POLICY "Users can view their saved properties" 
ON public.saved_properties FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert to their saved properties" 
ON public.saved_properties FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from their saved properties" 
ON public.saved_properties FOR DELETE USING (auth.uid() = user_id);

-- Comments: Viewable by all, insertable by authenticated users
CREATE POLICY "Comments are viewable by everyone" 
ON public.comments FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert comments" 
ON public.comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authors can delete their own comments" 
ON public.comments FOR DELETE USING (auth.uid() = author_id);

-- Conversations & Messages: Only participants can view or chat
CREATE POLICY "Users can view their conversations" 
ON public.conversations FOR SELECT 
USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

CREATE POLICY "Users can create conversations they participate in" 
ON public.conversations FOR INSERT 
WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);

CREATE POLICY "Participants can view conversation messages" 
ON public.messages FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.conversations c 
        WHERE c.id = messages.conversation_id 
        AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
    )
);

CREATE POLICY "Participants can send messages" 
ON public.messages FOR INSERT 
WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
        SELECT 1 FROM public.conversations c 
        WHERE c.id = messages.conversation_id 
        AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
    )
);

-- 11. Storage Bucket setup for property-media
INSERT INTO storage.buckets (id, name, public) 
VALUES ('property-media', 'property-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access for property-media" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'property-media');

CREATE POLICY "Authenticated users can upload property media" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'property-media' AND auth.role() = 'authenticated');
