-- =============================================================================
-- OPTIMIZED INDEX SET FOR MIGRATION DATA VIEWS (1.5M rows)
-- =============================================================================
--
-- OPTIMIZATION NOTES:
-- - Removed duplicate indexes already created in views_functions.sql
-- - Eliminated excessive partial indexes and function-based indexes  
-- - Focused on essential compound indexes for core query patterns
-- - Reduced specialized geographic clustering (overkill for 1.5M rows)
-- - Kept minimal set for optimal read/write performance balance
--
-- =============================================================================

-- =============================================================================
-- BASE TABLE INDEXES (Critical for all downstream views)
-- =============================================================================

-- Primary indexes for base migration_flows table
CREATE INDEX idx_migration_flows_countries 
ON migration_flows(country_from, country_to);

CREATE INDEX idx_migration_flows_date_range 
ON migration_flows(migration_month);

CREATE INDEX idx_migration_flows_composite_main 
ON migration_flows(country_from, country_to, migration_month);

CREATE INDEX idx_migration_flows_migrants_desc 
ON migration_flows(num_migrants DESC);

-- Regional lookup optimization
CREATE INDEX idx_m49_regions_iso2 
ON m49_regions(iso2_code);

CREATE INDEX idx_m49_regions_codes 
ON m49_regions(region_code, subregion_code, intermediate_region_code);

-- =============================================================================
-- SPATIAL AGGREGATION VIEW INDEXES
-- =============================================================================

-- flows_country_to_country_monthly (basic indexes in views_functions.sql, adding essential ones only)
CREATE INDEX idx_flows_country_monthly_period 
ON flows_country_to_country_monthly(period, country_from, country_to);

CREATE INDEX idx_flows_country_monthly_regions 
ON flows_country_to_country_monthly(region_from, region_to, migration_month);

CREATE INDEX idx_flows_country_monthly_quarter 
ON flows_country_to_country_monthly(year, quarter, country_from, country_to);

-- flows_region_to_country_monthly
CREATE INDEX idx_flows_region_country_time 
ON flows_region_to_country_monthly(migration_month, region_from);

CREATE INDEX idx_flows_region_country_volume 
ON flows_region_to_country_monthly(num_migrants DESC, region_from);

-- flows_country_to_region_monthly  
CREATE INDEX idx_flows_country_region_time 
ON flows_country_to_region_monthly(migration_month, country_from);

CREATE INDEX idx_flows_country_region_volume 
ON flows_country_to_region_monthly(num_migrants DESC, region_to);

-- flows_region_to_region_monthly
CREATE INDEX idx_flows_region_region_time 
ON flows_region_to_region_monthly(migration_month, region_from, region_to);

CREATE INDEX idx_flows_region_region_volume 
ON flows_region_to_region_monthly(num_migrants DESC);

-- flows_subregion_to_subregion_monthly
CREATE INDEX idx_flows_subregion_time 
ON flows_subregion_to_subregion_monthly(migration_month, subregion_from);

CREATE INDEX idx_flows_subregion_volume 
ON flows_subregion_to_subregion_monthly(num_migrants DESC);

-- =============================================================================
-- TEMPORAL AGGREGATION VIEW INDEXES
-- =============================================================================

-- flows_country_to_country_quarterly
CREATE INDEX idx_flows_quarterly_time_series 
ON flows_country_to_country_quarterly(country_from, country_to, year, quarter);

CREATE INDEX idx_flows_quarterly_year_volume 
ON flows_country_to_country_quarterly(year, num_migrants DESC);

CREATE INDEX idx_flows_quarterly_quarter_lookup 
ON flows_country_to_country_quarterly(quarter_year);

-- flows_country_to_country_annual
CREATE INDEX idx_flows_annual_time_series 
ON flows_country_to_country_annual(country_from, country_to, year);

CREATE INDEX idx_flows_annual_volume_year 
ON flows_country_to_country_annual(year, num_migrants DESC);

CREATE INDEX idx_flows_annual_country_totals 
ON flows_country_to_country_annual(country_from, year, num_migrants);

-- flows_pandemic_comparison_country (basic index already exists in views_functions.sql)
-- Removed excessive partial indexes - basic country pair index is sufficient

-- flows_seasonal_patterns_country
CREATE INDEX idx_flows_seasonal_countries 
ON flows_seasonal_patterns_country(country_from, country_to);
-- Removed seasonal-specific indexes - single country pair index sufficient for small result sets

-- flows_rolling_averages_top100 (basic index already exists in views_functions.sql)
-- Removed trend and partial indexes - basic time series index sufficient for top 100 corridors

-- =============================================================================
-- FLOW CALCULATION VIEW INDEXES
-- =============================================================================

-- flows_net_annual_country (basic index already exists in views_functions.sql)
-- Single volume-based index for performance queries
CREATE INDEX idx_flows_net_flow_volume 
ON flows_net_annual_country(ABS(net_flow) DESC, year);

-- flows_corridor_rankings_annual (basic indexes already exist in views_functions.sql)
-- Single ranking index sufficient
CREATE INDEX idx_flows_rankings_year_rank 
ON flows_corridor_rankings_annual(year, rank);

-- flows_growth_rates_annual (basic index already exists in views_functions.sql)
-- Single growth rate index for performance queries
CREATE INDEX idx_flows_growth_rate_performance 
ON flows_growth_rates_annual(year DESC, growth_rate DESC);

-- =============================================================================
-- SUMMARY VIEW INDEXES
-- =============================================================================

-- country_migration_summary (basic index already exists in views_functions.sql)
-- Single performance index for top countries by net migration
CREATE INDEX idx_country_summary_net_migration 
ON country_migration_summary(ABS(net_migration) DESC, year);

-- top_migration_corridors
CREATE INDEX idx_top_corridors_period_rank 
ON top_migration_corridors(period, rank);
-- Single index sufficient for this summary view

-- =============================================================================
-- ESSENTIAL INDEXES FOR COMMON QUERY PATTERNS (1.5M rows - keep minimal)
-- =============================================================================

-- High-volume flows only (reduces index size significantly)
CREATE INDEX idx_flows_monthly_major_corridors 
ON flows_country_to_country_monthly(migration_month, num_migrants) 
WHERE num_migrants >= 5000;

-- Cross-regional analysis (essential for regional views)
CREATE INDEX idx_flows_monthly_cross_regional 
ON flows_country_to_country_monthly(region_from, region_to, migration_month) 
WHERE region_from IS NOT NULL AND region_to IS NOT NULL AND region_from != region_to;

-- =============================================================================
-- ESSENTIAL API OPTIMIZATION INDEXES
-- =============================================================================

-- Country lookups (for API endpoints) - keeping minimal
CREATE INDEX idx_distinct_countries_from 
ON flows_country_to_country_monthly(country_from);

CREATE INDEX idx_distinct_countries_to 
ON flows_country_to_country_monthly(country_to);

-- Top-N queries (essential for rankings)
CREATE INDEX idx_flows_annual_top_n 
ON flows_country_to_country_annual(year, num_migrants DESC, country_from, country_to);

-- =============================================================================
-- REMOVED: FUNCTION-BASED INDEXES (Excessive for 1.5M rows)
-- =============================================================================
-- Function-based indexes removed to reduce maintenance overhead
-- Basic column indexes in views_functions.sql are sufficient for this dataset size

-- =============================================================================
-- MAINTENANCE AND MONITORING
-- =============================================================================

-- Index usage monitoring (run this periodically to check index effectiveness)
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes 
-- WHERE schemaname = 'public' 
-- ORDER BY idx_scan DESC;

-- Unused indexes detection (run this monthly)
-- SELECT schemaname, tablename, indexname, idx_scan
-- FROM pg_stat_user_indexes 
-- WHERE idx_scan = 0 AND schemaname = 'public'
-- ORDER BY pg_size_pretty(pg_relation_size(indexrelid::regclass)) DESC;

-- =============================================================================
-- INDEX REFRESH FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION analyze_migration_tables()
RETURNS void AS $$
BEGIN
    -- Update table statistics for better query planning
    ANALYZE migration_flows;
    ANALYZE m49_regions;
    
    -- Analyze all materialized views
    ANALYZE flows_country_to_country_monthly;
    ANALYZE flows_region_to_country_monthly;
    ANALYZE flows_country_to_region_monthly;
    ANALYZE flows_region_to_region_monthly;
    ANALYZE flows_subregion_to_subregion_monthly;
    ANALYZE flows_country_to_country_quarterly;
    ANALYZE flows_country_to_country_annual;
    ANALYZE flows_pandemic_comparison_country;
    ANALYZE flows_seasonal_patterns_country;
    ANALYZE flows_rolling_averages_top100;
    ANALYZE flows_net_annual_country;
    ANALYZE flows_corridor_rankings_annual;
    ANALYZE flows_growth_rates_annual;
    ANALYZE country_migration_summary;
    ANALYZE top_migration_corridors;
    
    RAISE NOTICE 'Migration tables analyzed successfully';
END;
$$ LANGUAGE plpgsql;

-- Schedule automatic analysis (run after data updates)
-- SELECT cron.schedule('analyze-migration-tables', '0 3 * * *', 'SELECT analyze_migration_tables();');