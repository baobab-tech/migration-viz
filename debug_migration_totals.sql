-- Debug Migration Data Totals Discrepancy
-- Run these queries to identify where data loss is occurring

-- =============================================================================
-- 1. BASE DATA CHECK - What's in the raw migration_flows table?
-- =============================================================================
SELECT 
    'Raw migration_flows table' as source,
    COUNT(*) as record_count,
    SUM(num_migrants) as total_migrants,
    MIN(migration_month) as earliest_date,
    MAX(migration_month) as latest_date
FROM migration_flows 
WHERE migration_month >= '2019-01-01' AND migration_month <= '2022-12-31';

-- =============================================================================
-- 2. MONTHLY VIEW CHECK - What's in the monthly materialized view?
-- =============================================================================
SELECT 
    'Monthly materialized view' as source,
    COUNT(*) as record_count,
    SUM(num_migrants) as total_migrants,
    MIN(migration_month) as earliest_date,
    MAX(migration_month) as latest_date
FROM flows_country_to_country_monthly 
WHERE migration_month >= '2019-01-01' AND migration_month <= '2022-12-31';

-- =============================================================================
-- 3. QUARTERLY VIEW CHECK - What's in the quarterly materialized view?
-- =============================================================================
SELECT 
    'Quarterly materialized view' as source,
    COUNT(*) as record_count,
    SUM(num_migrants) as total_migrants,
    MIN(quarter_date) as earliest_date,
    MAX(quarter_date) as latest_date
FROM flows_country_to_country_quarterly_totals 
WHERE quarter_date >= '2019-01-01' AND quarter_date <= '2022-12-31';

-- =============================================================================
-- 4. YEARLY VIEW CHECK - What's in the yearly materialized view?
-- =============================================================================
SELECT 
    'Yearly materialized view' as source,
    COUNT(*) as record_count,
    SUM(num_migrants) as total_migrants,
    MIN(year_date) as earliest_date,
    MAX(year_date) as latest_date
FROM flows_country_to_country_annual_totals 
WHERE year_date >= '2019-01-01' AND year_date <= '2022-12-31';

-- =============================================================================
-- 5. REGION MAPPING CHECK - Are there NULL regions causing issues?
-- =============================================================================
SELECT 
    'Region mapping analysis' as description,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE region_from IS NULL) as null_region_from,
    COUNT(*) FILTER (WHERE region_to IS NULL) as null_region_to,
    COUNT(*) FILTER (WHERE region_from IS NULL AND region_to IS NULL) as both_regions_null,
    SUM(num_migrants) FILTER (WHERE region_from IS NULL) as migrants_with_null_region_from,
    SUM(num_migrants) FILTER (WHERE region_to IS NULL) as migrants_with_null_region_to
FROM flows_country_to_country_monthly 
WHERE migration_month >= '2019-01-01' AND migration_month <= '2022-12-31';

-- =============================================================================
-- 6. QUARTERLY AGGREGATION TEST - Manual quarterly aggregation from monthly view
-- =============================================================================
SELECT 
    'Manual quarterly aggregation' as source,
    COUNT(DISTINCT DATE_TRUNC('quarter', migration_month)) as quarter_count,
    SUM(num_migrants) as total_migrants
FROM flows_country_to_country_monthly
WHERE migration_month >= '2019-01-01' AND migration_month <= '2022-12-31';

-- =============================================================================
-- 7. YEARLY AGGREGATION TEST - Manual yearly aggregation from monthly view
-- =============================================================================
SELECT 
    'Manual yearly aggregation' as source,
    COUNT(DISTINCT EXTRACT(YEAR FROM migration_month)) as year_count,
    SUM(num_migrants) as total_migrants
FROM flows_country_to_country_monthly
WHERE migration_month >= '2019-01-01' AND migration_month <= '2022-12-31';

-- =============================================================================
-- 8. CORRIDOR DUPLICATION CHECK - Are there duplicate corridors in quarterly view?
-- =============================================================================
SELECT 
    country_from,
    country_to,
    quarter_date,
    COUNT(*) as duplicate_count,
    SUM(num_migrants) as total_migrants
FROM flows_country_to_country_quarterly_totals 
WHERE quarter_date >= '2019-01-01' AND quarter_date <= '2022-12-31'
GROUP BY country_from, country_to, quarter_date
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
LIMIT 10;

-- =============================================================================
-- 9. FUNCTION SIMULATION - Test what get_dashboard_summary would return
-- =============================================================================

-- Monthly totals (what the function uses for monthly)
SELECT 
    'Function monthly simulation' as aggregation,
    SUM(num_migrants) as total_flows,
    COUNT(DISTINCT migration_month) as active_periods
FROM flows_country_to_country_monthly
WHERE migration_month >= '2019-01-01' AND migration_month <= '2022-12-31';

-- Quarterly totals (what the function uses for quarterly)
SELECT 
    'Function quarterly simulation' as aggregation,
    SUM(num_migrants) as total_flows,
    COUNT(DISTINCT quarter_date) as active_periods
FROM flows_country_to_country_quarterly_totals
WHERE quarter_date <= '2022-12-31' 
  AND (quarter_date + INTERVAL '3 months' - INTERVAL '1 day') >= '2019-01-01';

-- Yearly totals (what the function uses for yearly)
SELECT 
    'Function yearly simulation' as aggregation,
    SUM(num_migrants) as total_flows,
    COUNT(DISTINCT year_date) as active_periods
FROM flows_country_to_country_annual_totals
WHERE year_date <= '2022-12-31' 
  AND (year_date + INTERVAL '1 year' - INTERVAL '1 day') >= '2019-01-01';

-- =============================================================================
-- 10. SAMPLE DATA CHECK - Look at actual records to spot patterns
-- =============================================================================
SELECT 
    'Sample quarterly records' as description,
    country_from,
    country_to,
    quarter_date,
    num_migrants,
    region_from,
    region_to
FROM flows_country_to_country_quarterly_totals 
WHERE quarter_date >= '2019-01-01' AND quarter_date <= '2022-12-31'
ORDER BY num_migrants DESC
LIMIT 5;

-- =============================================================================
-- INSTRUCTIONS:
-- 1. Run each query individually and note the results
-- 2. Compare the totals between the different sources
-- 3. Look for NULL region issues or duplicate records
-- 4. Check if the materialized views need to be refreshed
-- =============================================================================
