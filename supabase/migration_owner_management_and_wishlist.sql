-- ==============================================================================
-- SOCIAL PROPERTIES (सोशल प्रॉपर्टीज)
-- MIGRATION: Post/Reel Owner Management & Wishlist/Saved Properties RLS
-- ==============================================================================

-- 1. Ensure 'closed' value is available in property_status_enum
DO $$ BEGIN
    ALTER TYPE property_status_enum ADD VALUE IF NOT EXISTS 'closed';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Ensure Row Level Security (RLS) is enabled
ALTER TABLE IF EXISTS public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.saved_properties ENABLE ROW LEVEL SECURITY;

-- 3. PROPERTIES TABLE POLICIES

-- Policy 1: Public Read - Anyone can view active properties
DROP POLICY IF EXISTS "Anyone can view properties" ON public.properties;
DROP POLICY IF EXISTS "Anyone can view active properties" ON public.properties;
CREATE POLICY "Anyone can view active properties" 
ON public.properties 
FOR SELECT 
USING (status = 'active');

-- Policy 2: Owner Read - Authors can view all their own properties regardless of status (active, sold, rented, closed)
DROP POLICY IF EXISTS "Authors can view all their own properties" ON public.properties;
CREATE POLICY "Authors can view all their own properties" 
ON public.properties 
FOR SELECT 
USING (auth.uid() = author_id);

-- Policy 3: Owner Insert - Authenticated users can insert their own properties
DROP POLICY IF EXISTS "Authenticated users can insert properties" ON public.properties;
DROP POLICY IF EXISTS "Authors can insert their own properties" ON public.properties;
CREATE POLICY "Authors can insert their own properties" 
ON public.properties 
FOR INSERT 
WITH CHECK (auth.uid() = author_id);

-- Policy 4: Owner Update - Authors can update, close, or reopen only their own properties
DROP POLICY IF EXISTS "Authors can update their own properties" ON public.properties;
CREATE POLICY "Authors can update their own properties" 
ON public.properties 
FOR UPDATE 
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);

-- Policy 5: Owner Delete - Authors can delete only their own properties
DROP POLICY IF EXISTS "Authors can delete their own properties" ON public.properties;
CREATE POLICY "Authors can delete their own properties" 
ON public.properties 
FOR DELETE 
USING (auth.uid() = author_id);

-- 4. SAVED_PROPERTIES (WISHLIST) POLICIES & CONSTRAINTS

-- Ensure unique constraint exists so duplicate rows cannot be created
DO $$ BEGIN
    ALTER TABLE public.saved_properties 
    ADD CONSTRAINT saved_properties_user_property_unique UNIQUE (user_id, property_id);
EXCEPTION
    WHEN duplicate_table OR duplicate_object THEN null;
END $$;

-- Policy 1: Select own saved properties
DROP POLICY IF EXISTS "Users can view their saved properties" ON public.saved_properties;
CREATE POLICY "Users can view their saved properties" 
ON public.saved_properties 
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy 2: Insert own saved properties (tied strictly to authenticated user's ID)
DROP POLICY IF EXISTS "Users can insert to their saved properties" ON public.saved_properties;
CREATE POLICY "Users can insert to their saved properties" 
ON public.saved_properties 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy 3: Remove own saved properties (cannot delete another user's saved items)
DROP POLICY IF EXISTS "Users can remove from their saved properties" ON public.saved_properties;
CREATE POLICY "Users can remove from their saved properties" 
ON public.saved_properties 
FOR DELETE 
USING (auth.uid() = user_id);

-- 5. STORAGE BUCKET POLICIES FOR PROPERTY MEDIA CLEANUP
-- Allows authenticated owners to delete media from property-media bucket
DO $$ BEGIN
    CREATE POLICY "Authenticated users can delete own property media" 
    ON storage.objects 
    FOR DELETE 
    USING (bucket_id = 'property-media' AND auth.role() = 'authenticated');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
