-- ==============================================================================
-- SOCIAL PROPERTIES — LIVE DATABASE VERIFICATION SCRIPT
-- Run in Supabase Dashboard → SQL Editor (READ-ONLY)
-- ==============================================================================

-- 1. ALL PUBLIC TABLES AND COLUMNS
SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    c.is_nullable,
    c.column_default,
    c.ordinal_position
FROM information_schema.tables t
JOIN information_schema.columns c ON c.table_name = t.table_name AND c.table_schema = t.table_schema
WHERE t.table_schema = 'public' 
  AND t.table_type = 'BASE TABLE'
  AND t.table_name NOT LIKE 'pg_%'
  AND t.table_name NOT LIKE 'sql_%'
ORDER BY t.table_name, c.ordinal_position;

-- 2. ALL ENUM TYPES AND VALUES
SELECT 
    t.typname AS enum_name,
    e.enumlabel AS enum_value,
    e.enumsortorder AS sort_order
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
ORDER BY t.typname, e.enumsortorder;

-- 3. PRIMARY KEYS AND FOREIGN KEYS
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name 
    AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name 
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public'
  AND tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE')
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

-- 4. RLS-ENABLED TABLES
SELECT 
    c.relname AS table_name,
    CASE WHEN c.relrowsecurity THEN 'ENABLED' ELSE 'DISABLED' END AS rls_status,
    CASE WHEN c.relforcerowsecurity THEN 'FORCED' ELSE 'NOT_FORCED' END AS rls_force
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
ORDER BY c.relname;

-- 5. ALL RLS POLICIES
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 6. ALL INDEXES
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 7. REALTIME PUBLICATION TABLES
SELECT 
    pubname,
    schemaname,
    tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY schemaname, tablename;

-- 8. STORAGE BUCKETS AND POLICIES
-- 8a. Buckets
SELECT 
    id,
    name,
    owner,
    public,
    file_size_limit,
    allowed_mime_types,
    created_at
FROM storage.buckets
ORDER BY name;

-- 8b. Storage Policies (via pg_policies on storage schema)
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'storage'
ORDER BY tablename, policyname;

-- 9. TRIGGERS AND FUNCTIONS (RELEVANT TO CORE TABLES)
-- 9a. Triggers
SELECT 
    tgname AS trigger_name,
    c.relname AS table_name,
    proname AS function_name,
    tgenabled AS enabled
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_proc p ON p.oid = t.tgfoid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('profiles', 'properties', 'conversations', 'messages', 'saved_properties', 'comments', 'property_media')
  AND NOT tgname LIKE 'RI_ConstraintTrigger%'
ORDER BY c.relname, tgname;

-- 9b. Relevant Functions
SELECT 
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments,
    pg_get_function_result(p.oid) AS return_type,
    pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'handle_new_user',
    'update_updated_at',
    'create_or_get_conversation',
    'cleanup_stories',
    'media_cleanup_on_property_delete'
  )
ORDER BY p.proname;

-- 10. ROW COUNTS FOR CORE TABLES (SAFE - handles missing optional tables)
DO $$
DECLARE
    t name;
    cnt bigint;
    tables_to_check name[] := ARRAY[
        'profiles', 'properties', 'conversations', 'messages', 
        'saved_properties', 'comments', 'property_media',
        'likes', 'follows', 'community_posts', 'notifications'
    ];
BEGIN
    RAISE NOTICE '=== ROW COUNTS ===';
    FOREACH t IN ARRAY tables_to_check LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = t
        ) THEN
            EXECUTE format('SELECT COUNT(*) FROM public.%I', t) INTO cnt;
            RAISE NOTICE '%: %', t, cnt;
        ELSE
            RAISE NOTICE '%: TABLE DOES NOT EXIST', t;
        END IF;
    END LOOP;
END $$;

-- ==============================================================================
-- END OF VERIFICATION SCRIPT
-- ==============================================================================