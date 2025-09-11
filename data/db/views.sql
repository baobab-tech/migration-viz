-- Migration Data Materialized Views
-- Replicates all transformations from the Python script

-- Base table setup
-- CREATE TABLE migration_flows (
--     id SERIAL PRIMARY KEY,
--     country_from VARCHAR(2),
--     country_to VARCHAR(2),
--     migration_month DATE,
--     num_migrants INTEGER,
--     created_at TIMESTAMP DEFAULT NOW()
-- );

-- Regional mappings table
-- CREATE TABLE m49_regions (
--     iso2_code VARCHAR(2) PRIMARY KEY,
--     region_code INTEGER,
--     region_name VARCHAR(255),
--     subregion_code INTEGER,
--     subregion_name VARCHAR(255),
--     intermediate_region_code INTEGER,
--     intermediate_region_name VARCHAR(255)
-- );

set statement_timeout = '10min';
-- =============================================================================
-- DROP ALL MATERIALIZED VIEWS (in reverse dependency order)
-- =============================================================================

-- Drop all views first to avoid dependency issues
DROP MATERIALIZED VIEW IF EXISTS top_migration_corridors CASCADE;
DROP MATERIALIZED VIEW IF EXISTS country_migration_summary CASCADE; 
DROP MATERIALIZED VIEW IF EXISTS flows_growth_rates_annual CASCADE;
DROP MATERIALIZED VIEW IF EXISTS flows_corridor_rankings_annual CASCADE;
DROP MATERIALIZED VIEW IF EXISTS flows_net_annual_country CASCADE;
DROP MATERIALIZED VIEW IF EXISTS flows_gross_annual_country CASCADE;
DROP MATERIALIZED VIEW IF EXISTS flows_rolling_averages_top100 CASCADE;
DROP MATERIALIZED VIEW IF EXISTS flows_corridor_monthly_agg CASCADE;
DROP MATERIALIZED VIEW IF EXISTS flows_regional_annual CASCADE;
DROP MATERIALIZED VIEW IF EXISTS flows_country_to_country_annual_totals CASCADE;
DROP MATERIALIZED VIEW IF EXISTS flows_country_to_country_annual CASCADE;
DROP MATERIALIZED VIEW IF EXISTS flows_country_to_country_quarterly_totals CASCADE;
DROP MATERIALIZED VIEW IF EXISTS flows_country_to_country_quarterly CASCADE;
DROP MATERIALIZED VIEW IF EXISTS flows_regional_monthly CASCADE;
DROP MATERIALIZED VIEW IF EXISTS flows_country_to_region_monthly CASCADE;
DROP MATERIALIZED VIEW IF EXISTS flows_region_to_country_monthly CASCADE;
DROP MATERIALIZED VIEW IF EXISTS flows_country_to_country_monthly CASCADE;

-- =============================================================================
-- SPATIAL AGGREGATION VIEWS
-- =============================================================================

-- 1. Country-to-Country Monthly (Enhanced base view)

CREATE MATERIALIZED VIEW flows_country_to_country_monthly
AS
SELECT 
    mf.country_from,
    mf.country_to,
    mf.migration_month,
    mf.num_migrants,
    EXTRACT(YEAR FROM mf.migration_month) as year,
    EXTRACT(MONTH FROM mf.migration_month) as month,
    EXTRACT(QUARTER FROM mf.migration_month) as quarter,
    CASE 
        WHEN EXTRACT(MONTH FROM mf.migration_month) IN (1, 2, 3) THEN 'Q1'
        WHEN EXTRACT(MONTH FROM mf.migration_month) IN (4, 5, 6) THEN 'Q2'
        WHEN EXTRACT(MONTH FROM mf.migration_month) IN (7, 8, 9) THEN 'Q3'
        WHEN EXTRACT(MONTH FROM mf.migration_month) IN (10, 11, 12) THEN 'Q4'
    END as season,
    CASE 
        WHEN EXTRACT(YEAR FROM mf.migration_month) = 2019 THEN '2019'
        WHEN EXTRACT(YEAR FROM mf.migration_month) = 2020 THEN '2020'
        WHEN EXTRACT(YEAR FROM mf.migration_month) = 2021 THEN '2021'
        WHEN EXTRACT(YEAR FROM mf.migration_month) = 2022 THEN '2022'
        ELSE 'other'
    END as period,
    r_from.region_name as region_from,
    r_to.region_name as region_to,
    r_from.subregion_name as subregion_from,
    r_to.subregion_name as subregion_to,
    r_from.intermediate_region_name as intermediate_from,
    r_to.intermediate_region_name as intermediate_to
FROM migration_flows mf
LEFT JOIN m49_regions r_from ON mf.country_from = r_from.iso2_code
LEFT JOIN m49_regions r_to ON mf.country_to = r_to.iso2_code;

CREATE INDEX idx_flows_country_monthly_from_to ON flows_country_to_country_monthly(country_from, country_to);
CREATE INDEX idx_flows_country_monthly_date ON flows_country_to_country_monthly(migration_month);
CREATE INDEX idx_flows_country_monthly_year ON flows_country_to_country_monthly(year);

-- 2. Region-to-Country Monthly
CREATE MATERIALIZED VIEW flows_region_to_country_monthly
AS
SELECT 
    region_from,
    country_to,
    migration_month,
    SUM(num_migrants) as num_migrants
FROM flows_country_to_country_monthly
WHERE region_from IS NOT NULL
GROUP BY region_from, country_to, migration_month;

CREATE INDEX idx_flows_region_country_monthly ON flows_region_to_country_monthly(region_from, country_to, migration_month);

-- 3. Country-to-Region Monthly  
CREATE MATERIALIZED VIEW flows_country_to_region_monthly
AS
SELECT 
    country_from,
    region_to,
    migration_month,
    SUM(num_migrants) as num_migrants
FROM flows_country_to_country_monthly
WHERE region_to IS NOT NULL
GROUP BY country_from, region_to, migration_month;

CREATE INDEX idx_flows_country_region_monthly ON flows_country_to_region_monthly(country_from, region_to, migration_month);

-- 4. Unified Regional Flows Monthly (supports both region and subregion filtering)
CREATE MATERIALIZED VIEW flows_regional_monthly
AS
SELECT 
    region_from,
    region_to,
    subregion_from,
    subregion_to,
    migration_month,
    SUM(num_migrants) as num_migrants
FROM flows_country_to_country_monthly
WHERE (region_from IS NOT NULL AND region_to IS NOT NULL) 
   OR (subregion_from IS NOT NULL AND subregion_to IS NOT NULL)
GROUP BY region_from, region_to, subregion_from, subregion_to, migration_month;

CREATE INDEX idx_flows_regional_monthly_region ON flows_regional_monthly(region_from, region_to, migration_month);
CREATE INDEX idx_flows_regional_monthly_subregion ON flows_regional_monthly(subregion_from, subregion_to, migration_month);
CREATE INDEX idx_flows_regional_monthly_combined ON flows_regional_monthly(region_from, subregion_from, migration_month);


-- =============================================================================
-- TEMPORAL AGGREGATION VIEWS  
-- =============================================================================

-- 7. Country-to-Country Quarterly (legacy, dropped)

-- 7a. Country-to-Country Quarterly Totals (with full metadata for filtering)
CREATE MATERIALIZED VIEW flows_country_to_country_quarterly_totals
AS
SELECT 
    country_from,
    country_to,
    year,
    quarter,
    DATE_TRUNC('quarter', migration_month)::DATE as quarter_date,
    year || '-Q' || quarter as quarter_year,
    SUM(num_migrants) as num_migrants,
    region_from,
    region_to,
    subregion_from,
    subregion_to,
    intermediate_from,
    intermediate_to
FROM flows_country_to_country_monthly
GROUP BY country_from, country_to, year, quarter, DATE_TRUNC('quarter', migration_month), region_from, region_to, subregion_from, subregion_to, intermediate_from, intermediate_to;

CREATE INDEX idx_flows_country_quarterly_totals ON flows_country_to_country_quarterly_totals(country_from, country_to, year, quarter);
CREATE INDEX idx_flows_country_quarterly_totals_region ON flows_country_to_country_quarterly_totals(region_from, region_to, year, quarter);
CREATE INDEX idx_flows_country_quarterly_totals_date ON flows_country_to_country_quarterly_totals(quarter_date);

-- 8. Country-to-Country Annual (legacy, dropped)

-- 8a. Country-to-Country Annual Totals (with full metadata for filtering)
CREATE MATERIALIZED VIEW flows_country_to_country_annual_totals
AS
SELECT 
    country_from,
    country_to,
    year,
    DATE_TRUNC('year', migration_month)::DATE as year_date,
    SUM(num_migrants) as num_migrants,
    region_from,
    region_to,
    subregion_from,
    subregion_to,
    intermediate_from,
    intermediate_to
FROM flows_country_to_country_monthly
GROUP BY country_from, country_to, year, DATE_TRUNC('year', migration_month), region_from, region_to, subregion_from, subregion_to, intermediate_from, intermediate_to;

CREATE INDEX idx_flows_country_annual_totals ON flows_country_to_country_annual_totals(country_from, country_to, year);
CREATE INDEX idx_flows_country_annual_totals_region ON flows_country_to_country_annual_totals(region_from, region_to, year);
CREATE INDEX idx_flows_country_annual_totals_date ON flows_country_to_country_annual_totals(year_date);

-- 9. Regional Annual (unified for regions and subregions)
CREATE MATERIALIZED VIEW flows_regional_annual
AS
SELECT 
    region_from,
    region_to,
    subregion_from,
    subregion_to,
    year,
    SUM(num_migrants) as num_migrants
FROM flows_country_to_country_monthly
WHERE (region_from IS NOT NULL AND region_to IS NOT NULL) 
   OR (subregion_from IS NOT NULL AND subregion_to IS NOT NULL)
GROUP BY region_from, region_to, subregion_from, subregion_to, year;

CREATE INDEX idx_flows_regional_annual_region ON flows_regional_annual(region_from, region_to, year);
CREATE INDEX idx_flows_regional_annual_subregion ON flows_regional_annual(subregion_from, subregion_to, year);

-- 10. Corridor-Specific Monthly Aggregation (for TimeSeriesCharts)
CREATE MATERIALIZED VIEW flows_corridor_monthly_agg
AS
SELECT 
    country_from,
    country_to,
    region_from,
    region_to,
    subregion_from,
    subregion_to,
    migration_month,
    year,
    quarter,
    season,
    period,
    num_migrants,
    -- Rolling averages for trend analysis
    AVG(num_migrants) OVER (
        PARTITION BY country_from, country_to 
        ORDER BY migration_month 
        ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    ) as rolling_3m,
    -- Year-over-year comparison
    LAG(num_migrants, 12) OVER (
        PARTITION BY country_from, country_to 
        ORDER BY migration_month
    ) as same_month_prev_year
FROM flows_country_to_country_monthly;

CREATE INDEX idx_flows_corridor_monthly_agg_corridor ON flows_corridor_monthly_agg(country_from, country_to, migration_month);
CREATE INDEX idx_flows_corridor_monthly_agg_region ON flows_corridor_monthly_agg(region_from, region_to, migration_month);
CREATE INDEX idx_flows_corridor_monthly_agg_subregion ON flows_corridor_monthly_agg(subregion_from, subregion_to, migration_month);

-- 12. Rolling Averages for Top 100 Corridors
CREATE MATERIALIZED VIEW flows_rolling_averages_top100
AS
WITH top_corridors AS (
    SELECT country_from, country_to
    FROM flows_country_to_country_monthly
    GROUP BY country_from, country_to
    ORDER BY SUM(num_migrants) DESC
    LIMIT 100
),
rolling_data AS (
    SELECT 
        f.country_from,
        f.country_to,
        f.migration_month,
        f.num_migrants,
        AVG(f.num_migrants) OVER (
            PARTITION BY f.country_from, f.country_to 
            ORDER BY f.migration_month 
            ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
        ) as rolling_3m,
        AVG(f.num_migrants) OVER (
            PARTITION BY f.country_from, f.country_to 
            ORDER BY f.migration_month 
            ROWS BETWEEN 5 PRECEDING AND CURRENT ROW
        ) as rolling_6m,
        ROW_NUMBER() OVER (PARTITION BY f.country_from, f.country_to ORDER BY f.migration_month) as row_num
    FROM flows_country_to_country_monthly f
    INNER JOIN top_corridors tc ON f.country_from = tc.country_from AND f.country_to = tc.country_to
),
trend_data AS (
    SELECT 
        country_from,
        country_to,
        migration_month,
        num_migrants,
        rolling_3m,
        rolling_6m,
        CASE 
            WHEN row_num >= 12 THEN
                -- Simple linear regression slope for last 12 months
                REGR_SLOPE(num_migrants, row_num) OVER (
                    PARTITION BY country_from, country_to 
                    ORDER BY migration_month 
                    ROWS BETWEEN 11 PRECEDING AND CURRENT ROW
                )
            ELSE NULL
        END as trend_slope
    FROM rolling_data
)
SELECT * FROM trend_data;

CREATE INDEX idx_flows_rolling_top100 ON flows_rolling_averages_top100(country_from, country_to, migration_month);

-- =============================================================================
-- FLOW CALCULATION VIEWS
-- =============================================================================

-- 13. Gross Flows Annual (Country-to-Country)
CREATE MATERIALIZED VIEW flows_gross_annual_country
AS
SELECT 
    country_from,
    country_to,
    year,
    SUM(num_migrants) as gross_flow
FROM flows_country_to_country_monthly
GROUP BY country_from, country_to, year;

-- 14. Net Flows Annual (Country-to-Country)  
CREATE MATERIALIZED VIEW flows_net_annual_country
AS
WITH outbound AS (
    SELECT country_from, country_to, year, SUM(num_migrants) as outbound_flow
    FROM flows_country_to_country_monthly
    GROUP BY country_from, country_to, year
),
inbound AS (
    SELECT country_to as country_from, country_from as country_to, year, SUM(num_migrants) as inbound_flow
    FROM flows_country_to_country_monthly
    GROUP BY country_to, country_from, year
)
SELECT 
    COALESCE(o.country_from, i.country_from) as country_from,
    COALESCE(o.country_to, i.country_to) as country_to,
    COALESCE(o.year, i.year) as year,
    COALESCE(i.inbound_flow, 0) - COALESCE(o.outbound_flow, 0) as net_flow,
    COALESCE(i.inbound_flow, 0) + COALESCE(o.outbound_flow, 0) as gross_flow
FROM outbound o
FULL OUTER JOIN inbound i ON o.country_from = i.country_from 
    AND o.country_to = i.country_to 
    AND o.year = i.year;

CREATE INDEX idx_flows_net_annual ON flows_net_annual_country(country_from, country_to, year);

-- 15. Corridor Rankings Annual
CREATE MATERIALIZED VIEW flows_corridor_rankings_annual
AS
WITH annual_flows AS (
    SELECT 
        country_from,
        country_to,
        year,
        SUM(num_migrants) as num_migrants
    FROM flows_country_to_country_monthly
    GROUP BY country_from, country_to, year
)
SELECT 
    country_from,
    country_to,
    year,
    num_migrants,
    DENSE_RANK() OVER (PARTITION BY year ORDER BY num_migrants DESC) as rank,
    PERCENT_RANK() OVER (PARTITION BY year ORDER BY num_migrants) * 100 as percentile
FROM annual_flows;

CREATE INDEX idx_flows_corridor_rankings ON flows_corridor_rankings_annual(year, rank);
CREATE INDEX idx_flows_corridor_rankings_country ON flows_corridor_rankings_annual(country_from, country_to, year);

-- 16. Growth Rates Annual
CREATE MATERIALIZED VIEW flows_growth_rates_annual
AS
WITH annual_flows AS (
    SELECT 
        country_from,
        country_to,
        year,
        SUM(num_migrants) as num_migrants
    FROM flows_country_to_country_monthly
    GROUP BY country_from, country_to, year
),
with_prev AS (
    SELECT 
        country_from,
        country_to,
        year,
        num_migrants,
        LAG(num_migrants) OVER (PARTITION BY country_from, country_to ORDER BY year) as prev_year_flow
    FROM annual_flows
),
with_growth AS (
    SELECT 
        country_from,
        country_to,
        year,
        num_migrants,
        CASE 
            WHEN prev_year_flow > 0 THEN 
                ((num_migrants - prev_year_flow) * 100.0 / prev_year_flow)
            ELSE NULL
        END as growth_rate
    FROM with_prev
),
with_velocity AS (
    SELECT 
        country_from,
        country_to,
        year,
        num_migrants,
        growth_rate,
        growth_rate - LAG(growth_rate) OVER (PARTITION BY country_from, country_to ORDER BY year) as growth_velocity
    FROM with_growth
)
SELECT * FROM with_velocity
WHERE growth_rate IS NOT NULL;

CREATE INDEX idx_flows_growth_rates ON flows_growth_rates_annual(country_from, country_to, year);

-- =============================================================================
-- AGGREGATE SUMMARY VIEWS FOR QUICK LOOKUPS
-- =============================================================================

-- Country-level summary statistics
CREATE MATERIALIZED VIEW country_migration_summary
AS
WITH outbound AS (
    SELECT 
        country_from as country,
        year,
        SUM(num_migrants) as total_outbound,
        COUNT(DISTINCT country_to) as destination_count
    FROM flows_country_to_country_monthly
    GROUP BY country_from, year
),
inbound AS (
    SELECT 
        country_to as country,
        year,
        SUM(num_migrants) as total_inbound,
        COUNT(DISTINCT country_from) as origin_count
    FROM flows_country_to_country_monthly
    GROUP BY country_to, year
)
SELECT 
    COALESCE(o.country, i.country) as country,
    COALESCE(o.year, i.year) as year,
    COALESCE(o.total_outbound, 0) as total_outbound,
    COALESCE(i.total_inbound, 0) as total_inbound,
    COALESCE(i.total_inbound, 0) - COALESCE(o.total_outbound, 0) as net_migration,
    COALESCE(o.destination_count, 0) as destination_count,
    COALESCE(i.origin_count, 0) as origin_count
FROM outbound o
FULL OUTER JOIN inbound i ON o.country = i.country AND o.year = i.year;

CREATE INDEX idx_country_migration_summary ON country_migration_summary(country, year);

-- Top corridors by period
CREATE MATERIALIZED VIEW top_migration_corridors
AS
WITH corridor_totals AS (
    SELECT 
        country_from,
        country_to,
        period,
        SUM(num_migrants) as total_migrants
    FROM flows_country_to_country_monthly
    GROUP BY country_from, country_to, period
),
ranked_corridors AS (
    SELECT 
        *,
        ROW_NUMBER() OVER (PARTITION BY period ORDER BY total_migrants DESC) as rank
    FROM corridor_totals
)
SELECT * FROM ranked_corridors WHERE rank <= 50;

-- =============================================================================
-- REFRESH FUNCTIONS
-- =============================================================================

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_migration_views()
RETURNS void AS $$
BEGIN
    -- Refresh in dependency order / this might hit limits
    REFRESH MATERIALIZED VIEW flows_country_to_country_monthly;
    REFRESH MATERIALIZED VIEW flows_region_to_country_monthly;
    REFRESH MATERIALIZED VIEW flows_country_to_region_monthly;
    REFRESH MATERIALIZED VIEW flows_regional_monthly;
    REFRESH MATERIALIZED VIEW flows_country_to_country_quarterly_totals;
    REFRESH MATERIALIZED VIEW flows_country_to_country_annual_totals;
    REFRESH MATERIALIZED VIEW flows_regional_annual;
    REFRESH MATERIALIZED VIEW flows_corridor_monthly_agg;
    REFRESH MATERIALIZED VIEW flows_rolling_averages_top100;
    REFRESH MATERIALIZED VIEW flows_gross_annual_country;
    REFRESH MATERIALIZED VIEW flows_net_annual_country;
    REFRESH MATERIALIZED VIEW flows_corridor_rankings_annual;
    REFRESH MATERIALIZED VIEW flows_growth_rates_annual;
    REFRESH MATERIALIZED VIEW country_migration_summary;
    REFRESH MATERIALIZED VIEW top_migration_corridors;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- USAGE EXAMPLES
-- =============================================================================

-- Example queries:

-- 1. Top 10 migration corridors in 2022
-- SELECT country_from, country_to, num_migrants 
-- FROM flows_country_to_country_annual 
-- WHERE year = 2022 
-- ORDER BY num_migrants DESC 
-- LIMIT 10;

-- 2. Net migration for USA by year
-- SELECT year, net_migration 
-- FROM country_migration_summary 
-- WHERE country = 'US' 
-- ORDER BY year;

-- 3. Seasonal patterns for top corridors

-- 4. Quarterly patterns for top corridors
-- SELECT f.country_from, f.country_to, s.*
-- FROM flows_corridor_rankings_annual f
-- Use get_migration_patterns('seasonal', 'country') function for seasonal analysis
-- WHERE f.year = 2022 AND f.rank <= 10;

-- Set up automatic refresh (run daily at 2 AM)
-- SELECT cron.schedule('refresh-migration-views', '0 2 * * *', 'SELECT refresh_migration_views();');