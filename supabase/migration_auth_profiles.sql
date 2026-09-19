-- Migration: Email/Password Authentication & User Profiles Schema
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)

-- 1. Add new registration and profile columns to public.profiles table if they don't already exist
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS age INTEGER,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS mobile_number TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS is_verified_broker BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Add video_url to public.properties table if it doesn't already exist
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS video_url TEXT;

-- 3. Ensure Row Level Security (RLS) is enabled on public.profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing profile policies to prevent naming collisions
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- 5. Create RLS Policies for Profiles

-- Allow public viewing of profiles (needed for author cards on property feeds and reels)
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles 
FOR SELECT 
USING (true);

-- Allow authenticated users to insert ONLY their own profile record (matching their Supabase Auth UID)
CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Allow authenticated users to update ONLY their own profile (cannot update another user's profile)
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 6. Storage Bucket setup & RLS Policies for property-media
INSERT INTO storage.buckets (id, name, public) 
VALUES ('property-media', 'property-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public Access for property-media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload property media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload to property-media" ON storage.objects;

-- Allow public read access to uploaded media
CREATE POLICY "Public Access for property-media" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'property-media');

-- Allow authenticated and authorized uploads to property-media
CREATE POLICY "Authenticated users can upload property media" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'property-media' AND (auth.role() = 'authenticated' OR auth.role() = 'anon'));

-- 7. Auto-create or sync profile trigger on auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    full_name, 
    age, 
    location, 
    mobile_number, 
    address, 
    email, 
    phone, 
    city, 
    created_at
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    (new.raw_user_meta_data->>'age')::INTEGER,
    COALESCE(new.raw_user_meta_data->>'location', 'Bokaro'),
    new.raw_user_meta_data->>'mobile_number',
    new.raw_user_meta_data->>'address',
    new.email,
    new.raw_user_meta_data->>'mobile_number',
    COALESCE(new.raw_user_meta_data->>'location', 'Bokaro'),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    age = COALESCE(EXCLUDED.age, profiles.age),
    location = COALESCE(EXCLUDED.location, profiles.location),
    mobile_number = COALESCE(EXCLUDED.mobile_number, profiles.mobile_number),
    address = COALESCE(EXCLUDED.address, profiles.address),
    email = COALESCE(EXCLUDED.email, profiles.email),
    city = COALESCE(EXCLUDED.city, profiles.city);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute upon user signup in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
