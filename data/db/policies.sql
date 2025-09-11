-- =============================================================================
-- SUPABASE ROW LEVEL SECURITY (RLS) POLICIES FOR MIGRATION DATA
-- Public Read Access Configuration
-- =============================================================================

-- Enable Row Level Security on all tables and views
-- Note: In Supabase, you need to enable RLS for security, then create policies for access

-- =============================================================================
-- BASE TABLES RLS SETUP
-- =============================================================================

-- Enable RLS on base tables
ALTER TABLE migration_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE m49_regions ENABLE ROW LEVEL SECURITY;

-- Public read access policies for base tables
CREATE POLICY "Public read access for migration_flows" 
ON migration_flows FOR SELECT 
USING (true);

CREATE POLICY "Public read access for m49_regions" 
ON m49_regions FOR SELECT 
USING (true);

-- =============================================================================
-- MATERIALIZED VIEWS ACCESS CONFIGURATION
-- =============================================================================

-- Note: PostgreSQL materialized views do NOT support Row Level Security (RLS)
-- Instead, we rely on traditional GRANT permissions and the base table RLS policies
-- Since materialized views query the base tables, access control is handled there

-- Materialized views in this database (no RLS needed, handled by grants):
-- - flows_country_to_country_monthly
-- - flows_region_to_country_monthly  
-- - flows_country_to_region_monthly
-- - flows_regional_monthly (unified regional view)
-- - flows_country_to_country_quarterly
-- - flows_country_to_country_annual
-- - flows_regional_annual (unified regional view)
-- - flows_corridor_monthly_agg (corridor analysis)
-- - flows_rolling_averages_top100
-- - flows_gross_annual_country
-- - flows_net_annual_country  
-- - flows_corridor_rankings_annual
-- - flows_growth_rates_annual
-- - country_migration_summary
-- - top_migration_corridors

-- Access to these views is controlled by:
-- 1. GRANT permissions (see SUPABASE-SPECIFIC CONFIGURATIONS section below)
-- 2. Base table RLS policies (migration_flows, m49_regions)

-- =============================================================================
-- ALTERNATIVE: BULK POLICY CREATION FUNCTION
-- =============================================================================

-- Function to enable RLS and create public read policies for base tables only
-- Note: Materialized views don't support RLS, so they're excluded
CREATE OR REPLACE FUNCTION enable_public_read_access()
RETURNS void AS $$
DECLARE
    table_name text;
    -- Only base tables that support RLS (not materialized views)
    tables_to_enable text[] := ARRAY[
        'migration_flows',
        'm49_regions'
    ];
BEGIN
    FOREACH table_name IN ARRAY tables_to_enable
    LOOP
        -- Enable RLS
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', table_name);
        
        -- Create public read policy
        EXECUTE format(
            'CREATE POLICY "Public read access for %I" ON %I FOR SELECT USING (true);',
            table_name, table_name
        );
        
        RAISE NOTICE 'Enabled public read access for table: %', table_name;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- SUPABASE-SPECIFIC CONFIGURATIONS
-- =============================================================================

-- =============================================================================
-- HOW ACCESS CONTROL WORKS
-- =============================================================================

-- For BASE TABLES (migration_flows, m49_regions):
--   Access controlled by RLS policies defined above

-- For MATERIALIZED VIEWS (all flows_* tables):
--   1. No RLS support - PostgreSQL limitation
--   2. Access controlled by GRANT permissions below
--   3. Data security handled by base table RLS policies
--   4. Since materialized views query base tables, RLS is still enforced

-- Grant usage on schema to anon and authenticated roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant select permissions to anon role (unauthenticated users)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Grant select permissions to authenticated role
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON SEQUENCES TO authenticated;

-- =============================================================================
-- OPTIONAL: RATE LIMITING POLICIES (For production use)
-- =============================================================================

-- Example: Limit queries per minute for anonymous users
-- Note: This requires additional setup with pg_cron or similar

-- CREATE OR REPLACE FUNCTION check_rate_limit()
-- RETURNS boolean AS $$
-- DECLARE
--     current_user_id text := auth.jwt() ->> 'sub';
--     request_count integer;
-- BEGIN
--     -- For anonymous users, use IP-based limiting
--     IF current_user_id IS NULL THEN
--         -- This would require storing request counts in a separate table
--         -- Implementation depends on your specific rate limiting strategy
--         RETURN true; -- Allow for now
--     END IF;
--     
--     RETURN true;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- DATA FILTERING POLICIES (Optional - for future restrictions)
-- =============================================================================

-- Example policies for potential future restrictions
-- These are commented out since you want full public access

-- Policy to restrict access to recent data only
-- CREATE POLICY "Recent data only" 
-- ON flows_country_to_country_monthly FOR SELECT 
-- USING (migration_month >= CURRENT_DATE - INTERVAL '5 years');

-- Policy to restrict access to major corridors only
-- CREATE POLICY "Major corridors only" 
-- ON flows_country_to_country_monthly FOR SELECT 
-- USING (num_migrants >= 100);

-- Policy based on user authentication level
-- CREATE POLICY "Authenticated users get full access" 
-- ON flows_country_to_country_monthly FOR SELECT 
-- USING (
--     CASE 
--         WHEN auth.role() = 'authenticated' THEN true
--         WHEN auth.role() = 'anon' THEN migration_month >= CURRENT_DATE - INTERVAL '2 years'
--         ELSE false
--     END
-- );

-- =============================================================================
-- SUPABASE REALTIME CONFIGURATION
-- =============================================================================

-- Enable realtime for tables that might need live updates
-- Note: Be careful with this for large tables as it can impact performance

-- ALTER publication supabase_realtime ADD TABLE flows_country_to_country_monthly;
-- ALTER publication supabase_realtime ADD TABLE country_migration_summary;
-- ALTER publication supabase_realtime ADD TABLE top_migration_corridors;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Check RLS status for all tables
-- SELECT 
--     schemaname,
--     tablename,
--     rowsecurity,
--     CASE 
--         WHEN rowsecurity THEN 'RLS Enabled'
--         ELSE 'RLS Disabled'
--     END as rls_status
-- FROM pg_tables 
-- WHERE schemaname = 'public'
-- ORDER BY tablename;

-- Check existing policies
-- SELECT 
--     schemaname,
--     tablename,
--     policyname,
--     permissive,
--     roles,
--     cmd,
--     qual
-- FROM pg_policies 
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;

-- Test access as anonymous user
-- SET ROLE anon;
-- SELECT COUNT(*) FROM flows_country_to_country_monthly LIMIT 1;
-- RESET ROLE;

-- =============================================================================
-- DEPLOYMENT INSTRUCTIONS
-- =============================================================================

/*
To deploy these policies in Supabase:

1. Run this script in your Supabase SQL editor
2. Verify policies are created correctly using the verification queries
3. Test access from your React application
4. Monitor performance and adjust as needed

For Supabase CLI deployment:
1. Save this as a migration file: migrations/YYYYMMDDHHMMSS_enable_public_migration_access.sql
2. Run: supabase db push
3. Verify in Supabase dashboard under Authentication > Policies

Security Notes:
- All migration data will be publicly readable
- No authentication required for SELECT operations
- Consider adding rate limiting in production
- Monitor usage and costs in Supabase dashboard
*/