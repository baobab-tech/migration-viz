-- Debug Monthly Function Issue
-- Run these queries to trace exactly what's happening

-- =============================================================================
-- 1. TEST THE UPDATED FUNCTION DIRECTLY
-- =============================================================================
SELECT 'Updated get_dashboard_summary monthly' as test,
       total_flows, unique_corridors, active_periods, avg_period_flow
FROM get_dashboard_summary(
    '2019-01-01'::DATE,
    '2022-12-31'::DATE,
    NULL, NULL, NULL, NULL, 0, NULL, 'all', 'monthly'
);

-- =============================================================================
-- 2. TEST THE CTE LOGIC THAT SHOULD BE IN THE FUNCTION
-- =============================================================================
WITH monthly_totals AS (
    SELECT 
        migration_month,
        SUM(num_migrants) as month_total
    FROM flows_country_to_country_monthly
    WHERE migration_month >= '2019-01-01'
      AND migration_month <= '2022-12-31'
    GROUP BY migration_month
)
SELECT 
    'CTE monthly totals test' as test,
    SUM(month_total) as total_flows,
    COUNT(DISTINCT migration_month) as active_periods
FROM monthly_totals;

-- =============================================================================
-- 3. COMPARE OLD VS NEW LOGIC SIDE BY SIDE
-- =============================================================================

-- Old logic (what was causing the bug)
SELECT 
    'OLD LOGIC (broken)' as method,
    SUM(num_migrants) as total_flows,
    COUNT(DISTINCT migration_month) as active_periods
FROM flows_country_to_country_monthly
WHERE migration_month >= '2019-01-01' 
  AND migration_month <= '2022-12-31';

-- New logic (what should be fixed)
WITH monthly_totals AS (
    SELECT 
        migration_month,
        SUM(num_migrants) as month_total
    FROM flows_country_to_country_monthly
    WHERE migration_month >= '2019-01-01'
      AND migration_month <= '2022-12-31'
    GROUP BY migration_month
)
SELECT 
    'NEW LOGIC (fixed)' as method,
    SUM(month_total) as total_flows,
    COUNT(DISTINCT migration_month) as active_periods
FROM monthly_totals;

-- =============================================================================
-- 4. CHECK IF FUNCTION IS REALLY UPDATED - View the actual function definition
-- =============================================================================
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'get_dashboard_summary'
  AND specific_schema = CURRENT_SCHEMA();

-- =============================================================================
-- 5. TEST ALL THREE AGGREGATIONS TO COMPARE
-- =============================================================================
SELECT 'MONTHLY' as aggregation, * FROM get_dashboard_summary('2019-01-01'::DATE, '2022-12-31'::DATE, NULL, NULL, NULL, NULL, 0, NULL, 'all', 'monthly');
SELECT 'QUARTERLY' as aggregation, * FROM get_dashboard_summary('2019-01-01'::DATE, '2022-12-31'::DATE, NULL, NULL, NULL, NULL, 0, NULL, 'all', 'quarterly');  
SELECT 'YEARLY' as aggregation, * FROM get_dashboard_summary('2019-01-01'::DATE, '2022-12-31'::DATE, NULL, NULL, NULL, NULL, 0, NULL, 'all', 'yearly');

-- =============================================================================
-- 6. CHECK FOR MULTIPLE FUNCTION VERSIONS (if function wasn't replaced properly)
-- =============================================================================
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'get_dashboard_summary'
  AND n.nspname = CURRENT_SCHEMA();

-- =============================================================================
-- 7. MANUAL STEP-BY-STEP SIMULATION OF WHAT THE FUNCTION SHOULD DO
-- =============================================================================

-- Step 1: Get the basic monthly aggregation (this should match get_monthly_migration_totals)
WITH debug_monthly AS (
    SELECT 
        migration_month,
        SUM(num_migrants) as month_total,
        COUNT(*) as corridor_count_for_month
    FROM flows_country_to_country_monthly
    WHERE migration_month >= '2019-01-01'
      AND migration_month <= '2022-12-31'
    GROUP BY migration_month
    ORDER BY migration_month
)
SELECT 
    'Step-by-step monthly debug' as test,
    SUM(month_total) as total_flows,
    COUNT(*) as active_periods,
    MIN(migration_month) as earliest_month,
    MAX(migration_month) as latest_month,
    AVG(month_total) as avg_monthly_flow
FROM debug_monthly;

-- =============================================================================
-- INSTRUCTIONS:
-- 1. Run queries 1, 2, 3 first to see if the function was updated correctly
-- 2. If query 1 still shows 237M, the function wasn't updated - check query 4
-- 3. If query 2 shows 118M but query 1 shows 237M, there's a function definition issue
-- 4. Query 5 will show if all three aggregations are now consistent
-- =============================================================================
