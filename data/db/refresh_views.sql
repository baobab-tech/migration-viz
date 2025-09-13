-- Refresh the materialized views that were updated
REFRESH MATERIALIZED VIEW flows_country_to_country_quarterly_totals;
REFRESH MATERIALIZED VIEW flows_country_to_country_annual_totals;

-- Check if refresh completed successfully
SELECT 
    schemaname,
    matviewname,
    hasindexes,
    ispopulated,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||matviewname)) as size
FROM pg_matviews 
WHERE matviewname IN ('flows_country_to_country_quarterly_totals', 'flows_country_to_country_annual_totals');
