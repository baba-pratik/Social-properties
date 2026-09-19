-- 1. Enable Row Level Security (RLS) on the properties table
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- 2. Policy 1: Anyone (anon or authenticated) can SELECT (read) active properties
-- We use status = 'active' to ensure only active properties are visible to the public.
CREATE POLICY "Anyone can view active properties" 
ON properties 
FOR SELECT 
USING (status = 'active');

-- 3. Policy 2: Only the authenticated author can UPDATE or 'Soft Delete' their own property
-- We allow users to update their own properties, including setting status to 'archived' (soft delete).
CREATE POLICY "Authors can update their own properties" 
ON properties 
FOR UPDATE 
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);

-- Note: You might also want a policy allowing authors to insert their own properties
CREATE POLICY "Authors can insert their own properties" 
ON properties 
FOR INSERT 
WITH CHECK (auth.uid() = author_id);

-- Optional: Allow authors to see their own archived properties
CREATE POLICY "Authors can view all their own properties" 
ON properties 
FOR SELECT 
USING (auth.uid() = author_id);
