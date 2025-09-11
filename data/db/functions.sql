-- Include pattern analysis functions
\i pattern_analysis_functions.sql

-- Clean up ALL function versions to avoid PostgreSQL function signature conflicts
-- This ensures we only have one version of each function with the exact signature we want
DROP FUNCTION IF EXISTS get_monthly_migration_totals CASCADE;
DROP FUNCTION IF EXISTS get_monthly_migration_totals(DATE, DATE, TEXT[], TEXT[], TEXT[], TEXT[], INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_monthly_migration_totals(DATE, DATE, TEXT[], TEXT[], TEXT[], TEXT[], INTEGER, INTEGER, TEXT);
DROP FUNCTION IF EXISTS get_monthly_migration_totals(DATE, DATE, TEXT[], TEXT[], TEXT[], TEXT[], INTEGER, INTEGER, TEXT, TEXT);

DROP FUNCTION IF EXISTS get_dashboard_summary CASCADE;
DROP FUNCTION IF EXISTS get_dashboard_summary(DATE, DATE, TEXT[], TEXT[], TEXT[], TEXT[], INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_dashboard_summary(DATE, DATE, TEXT[], TEXT[], TEXT[], TEXT[], INTEGER, INTEGER, TEXT);

DROP FUNCTION IF EXISTS get_corridor_time_series CASCADE;
DROP FUNCTION IF EXISTS get_corridor_time_series(TEXT[], DATE, DATE, TEXT[], TEXT[], TEXT[], TEXT[], INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_corridor_time_series(TEXT[], DATE, DATE, TEXT[], TEXT[], TEXT[], TEXT[], INTEGER, INTEGER, TEXT);
DROP FUNCTION IF EXISTS get_corridor_time_series(TEXT[], DATE, DATE, TEXT[], TEXT[], TEXT[], TEXT[], INTEGER, INTEGER, TEXT, TEXT);

DROP FUNCTION IF EXISTS get_filtered_top_corridors CASCADE;
DROP FUNCTION IF EXISTS get_filtered_top_corridors(DATE, DATE, TEXT[], TEXT[], TEXT[], TEXT[], INTEGER, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_filtered_top_corridors(DATE, DATE, TEXT[], TEXT[], TEXT[], TEXT[], INTEGER, INTEGER, TEXT, INTEGER);

DROP FUNCTION IF EXISTS get_quarterly_migration_data CASCADE;
DROP FUNCTION IF EXISTS get_quarterly_migration_data(DATE, DATE, TEXT[], TEXT[], TEXT[], TEXT[], INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_quarterly_migration_data(DATE, DATE, TEXT[], TEXT[], TEXT[], TEXT[], INTEGER, INTEGER, TEXT);

DROP FUNCTION IF EXISTS get_seasonal_migration_patterns CASCADE;
DROP FUNCTION IF EXISTS get_seasonal_migration_patterns(DATE, DATE, TEXT[], TEXT[], TEXT[], TEXT[], INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_seasonal_migration_patterns(DATE, DATE, TEXT[], TEXT[], TEXT[], TEXT[], INTEGER, INTEGER, TEXT);

-- 1. Monthly Totals with Filters (for time series chart)
CREATE OR REPLACE FUNCTION get_monthly_migration_totals(
    p_start_date DATE DEFAULT '2019-01-01',
    p_end_date DATE DEFAULT '2022-12-31',
    p_regions TEXT[] DEFAULT NULL,
    p_countries TEXT[] DEFAULT NULL,
    p_excluded_countries TEXT[] DEFAULT NULL,
    p_excluded_regions TEXT[] DEFAULT NULL,
    p_min_flow INTEGER DEFAULT 0,
    p_max_flow INTEGER DEFAULT NULL,
    p_period TEXT DEFAULT 'all',
    p_time_aggregation TEXT DEFAULT 'monthly'
)
RETURNS TABLE(
    month DATE,
    total_migrants BIGINT
) 
LANGUAGE plpgsql
AS $$
BEGIN
    IF p_time_aggregation = 'quarterly' THEN
        -- Use quarterly totals materialized view
        RETURN QUERY
        SELECT 
            quarter_date as month,
            SUM(num_migrants)::BIGINT as total_migrants
        FROM flows_country_to_country_quarterly_totals
        WHERE quarter_date >= p_start_date
          AND quarter_date <= p_end_date
          AND (p_regions IS NULL OR region_from = ANY(p_regions))
          AND (p_countries IS NULL OR country_from = ANY(p_countries) OR country_to = ANY(p_countries))
          AND (p_excluded_countries IS NULL OR (country_from != ALL(p_excluded_countries) AND country_to != ALL(p_excluded_countries)))
          AND (p_excluded_regions IS NULL OR region_from != ALL(p_excluded_regions))
          AND num_migrants >= p_min_flow
          AND (p_max_flow IS NULL OR num_migrants <= p_max_flow)
        GROUP BY quarter_date
        ORDER BY quarter_date;
    ELSIF p_time_aggregation = 'yearly' THEN
        -- Use annual totals materialized view
        RETURN QUERY
        SELECT 
            year_date as month,
            SUM(num_migrants)::BIGINT as total_migrants
        FROM flows_country_to_country_annual_totals
        WHERE year_date >= p_start_date
          AND year_date <= p_end_date
          AND (p_regions IS NULL OR region_from = ANY(p_regions))
          AND (p_countries IS NULL OR country_from = ANY(p_countries) OR country_to = ANY(p_countries))
          AND (p_excluded_countries IS NULL OR (country_from != ALL(p_excluded_countries) AND country_to != ALL(p_excluded_countries)))
          AND (p_excluded_regions IS NULL OR region_from != ALL(p_excluded_regions))
          AND num_migrants >= p_min_flow
          AND (p_max_flow IS NULL OR num_migrants <= p_max_flow)
        GROUP BY year_date
        ORDER BY year_date;
    ELSE
        -- Use monthly materialized view (default behavior)
        RETURN QUERY
        SELECT 
            migration_month as month,
            SUM(num_migrants)::BIGINT as total_migrants
        FROM flows_country_to_country_monthly
        WHERE migration_month >= p_start_date
          AND migration_month <= p_end_date
          AND (p_regions IS NULL OR region_from = ANY(p_regions))
          AND (p_countries IS NULL OR country_from = ANY(p_countries) OR country_to = ANY(p_countries))
          AND (p_excluded_countries IS NULL OR (country_from != ALL(p_excluded_countries) AND country_to != ALL(p_excluded_countries)))
          AND (p_excluded_regions IS NULL OR region_from != ALL(p_excluded_regions))
          AND num_migrants >= p_min_flow
          AND (p_max_flow IS NULL OR num_migrants <= p_max_flow)
        GROUP BY migration_month
        ORDER BY migration_month;
    END IF;
END;
$$;


-- 1.5. Corridor Time Series Data (for Multi-Corridor Time Series Chart)


CREATE OR REPLACE FUNCTION get_corridor_time_series(
    p_corridors TEXT[] DEFAULT NULL,  -- Array of 'FROM-TO' corridor strings
    p_start_date DATE DEFAULT '2019-01-01',
    p_end_date DATE DEFAULT '2022-12-31',
    p_regions TEXT[] DEFAULT NULL,
    p_countries TEXT[] DEFAULT NULL,
    p_excluded_countries TEXT[] DEFAULT NULL,
    p_excluded_regions TEXT[] DEFAULT NULL,
    p_min_flow INTEGER DEFAULT 0,
    p_max_flow INTEGER DEFAULT NULL,
    p_period TEXT DEFAULT 'all',
    p_time_aggregation TEXT DEFAULT 'monthly'
)
RETURNS TABLE(
    corridor TEXT,
    country_from VARCHAR(2),
    country_to VARCHAR(2),
    month DATE,
    migrants BIGINT
) 
LANGUAGE plpgsql
AS $$
BEGIN
    IF p_time_aggregation = 'quarterly' THEN
        -- Use quarterly totals materialized view
        RETURN QUERY
        SELECT 
            (fcq.country_from || '-' || fcq.country_to) as corridor,
            fcq.country_from,
            fcq.country_to,
            fcq.quarter_date as month,
            SUM(fcq.num_migrants)::BIGINT as migrants
        FROM flows_country_to_country_quarterly_totals fcq
        WHERE fcq.quarter_date >= p_start_date
          AND fcq.quarter_date <= p_end_date
          AND (p_corridors IS NULL OR (fcq.country_from || '-' || fcq.country_to) = ANY(p_corridors))
          AND (p_regions IS NULL OR fcq.region_from = ANY(p_regions))
          AND (p_countries IS NULL OR fcq.country_from = ANY(p_countries) OR fcq.country_to = ANY(p_countries))
          AND (p_excluded_countries IS NULL OR (fcq.country_from != ALL(p_excluded_countries) AND fcq.country_to != ALL(p_excluded_countries)))
          AND (p_excluded_regions IS NULL OR fcq.region_from != ALL(p_excluded_regions))
          AND fcq.num_migrants >= p_min_flow
          AND (p_max_flow IS NULL OR fcq.num_migrants <= p_max_flow)
        GROUP BY fcq.country_from, fcq.country_to, fcq.quarter_date
        ORDER BY fcq.quarter_date, corridor;
    ELSIF p_time_aggregation = 'yearly' THEN
        -- Use annual totals materialized view
        RETURN QUERY
        SELECT 
            (fca.country_from || '-' || fca.country_to) as corridor,
            fca.country_from,
            fca.country_to,
            fca.year_date as month,
            SUM(fca.num_migrants)::BIGINT as migrants
        FROM flows_country_to_country_annual_totals fca
        WHERE fca.year_date >= p_start_date
          AND fca.year_date <= p_end_date
          AND (p_corridors IS NULL OR (fca.country_from || '-' || fca.country_to) = ANY(p_corridors))
          AND (p_regions IS NULL OR fca.region_from = ANY(p_regions))
          AND (p_countries IS NULL OR fca.country_from = ANY(p_countries) OR fca.country_to = ANY(p_countries))
          AND (p_excluded_countries IS NULL OR (fca.country_from != ALL(p_excluded_countries) AND fca.country_to != ALL(p_excluded_countries)))
          AND (p_excluded_regions IS NULL OR fca.region_from != ALL(p_excluded_regions))
          AND fca.num_migrants >= p_min_flow
          AND (p_max_flow IS NULL OR fca.num_migrants <= p_max_flow)
        GROUP BY fca.country_from, fca.country_to, fca.year_date
        ORDER BY fca.year_date, corridor;
    ELSE
        -- Use monthly materialized view (default behavior)
        RETURN QUERY
        SELECT 
            (fcm.country_from || '-' || fcm.country_to) as corridor,
            fcm.country_from,
            fcm.country_to,
            fcm.migration_month as month,
            SUM(fcm.num_migrants)::BIGINT as migrants
        FROM flows_country_to_country_monthly fcm
        WHERE fcm.migration_month >= p_start_date
          AND fcm.migration_month <= p_end_date
          AND (p_corridors IS NULL OR (fcm.country_from || '-' || fcm.country_to) = ANY(p_corridors))
          AND (p_regions IS NULL OR fcm.region_from = ANY(p_regions))
          AND (p_countries IS NULL OR fcm.country_from = ANY(p_countries) OR fcm.country_to = ANY(p_countries))
          AND (p_excluded_countries IS NULL OR (fcm.country_from != ALL(p_excluded_countries) AND fcm.country_to != ALL(p_excluded_countries)))
          AND (p_excluded_regions IS NULL OR fcm.region_from != ALL(p_excluded_regions))
          AND fcm.num_migrants >= p_min_flow
          AND (p_max_flow IS NULL OR fcm.num_migrants <= p_max_flow)
        GROUP BY fcm.country_from, fcm.country_to, fcm.migration_month
        ORDER BY fcm.migration_month, corridor;
    END IF;
END;
$$;


-- 2. Dashboard Summary Statistics (Ultra-Fast with Materialized Views)
CREATE OR REPLACE FUNCTION get_dashboard_summary(
    p_start_date DATE DEFAULT '2019-01-01',
    p_end_date DATE DEFAULT '2022-12-31',
    p_regions TEXT[] DEFAULT NULL,
    p_countries TEXT[] DEFAULT NULL,
    p_excluded_countries TEXT[] DEFAULT NULL,
    p_excluded_regions TEXT[] DEFAULT NULL,
    p_min_flow INTEGER DEFAULT 0,
    p_max_flow INTEGER DEFAULT NULL,
    p_period TEXT DEFAULT 'all'
)
RETURNS TABLE(
    total_flows BIGINT,
    unique_corridors BIGINT,
    active_months INTEGER,
    avg_monthly_flow NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_has_filters BOOLEAN;
    v_total_flows BIGINT;
    v_active_months INTEGER;
    v_unique_corridors BIGINT;
BEGIN
    v_has_filters := (p_regions IS NOT NULL OR p_countries IS NOT NULL OR 
                     p_excluded_countries IS NOT NULL OR p_excluded_regions IS NOT NULL OR
                     p_min_flow > 0 OR p_max_flow IS NOT NULL OR p_period != 'all');
    
    -- Fast path: Use pre-computed summary
    IF NOT v_has_filters AND p_start_date = '2019-01-01' AND p_end_date = '2022-12-31' THEN
        RETURN QUERY
        SELECT 
            COALESCE(SUM(total_inbound + total_outbound), 0)::BIGINT,
            COALESCE(COUNT(DISTINCT country), 0)::BIGINT,
            48::INTEGER,
            COALESCE(SUM(total_inbound + total_outbound), 0)::NUMERIC / 48.0
        FROM country_migration_summary;
    ELSE
        -- Split into two fast queries instead of one slow query
        
        -- Query 1: Get total flows and active months (fast - 133ms)
        SELECT 
            COALESCE(SUM(num_migrants), 0),
            COALESCE(COUNT(DISTINCT migration_month), 0)
        INTO v_total_flows, v_active_months
        FROM flows_country_to_country_monthly
        WHERE migration_month >= p_start_date
          AND migration_month <= p_end_date
          AND (p_regions IS NULL OR region_from = ANY(p_regions))
          AND (p_countries IS NULL OR country_from = ANY(p_countries) OR country_to = ANY(p_countries))
          AND (p_excluded_countries IS NULL OR (country_from != ALL(p_excluded_countries) AND country_to != ALL(p_excluded_countries)))
          AND (p_excluded_regions IS NULL OR region_from != ALL(p_excluded_regions))
          AND num_migrants >= p_min_flow
          AND (p_max_flow IS NULL OR num_migrants <= p_max_flow)
          AND (p_period = 'all' OR period = p_period);
        
        -- Query 2: Get unique corridors using GROUP BY (much faster than DISTINCT)
        SELECT COUNT(*)
        INTO v_unique_corridors
        FROM (
            SELECT 1
            FROM flows_country_to_country_monthly
            WHERE migration_month >= p_start_date
              AND migration_month <= p_end_date
              AND (p_regions IS NULL OR region_from = ANY(p_regions))
              AND (p_countries IS NULL OR country_from = ANY(p_countries) OR country_to = ANY(p_countries))
              AND (p_excluded_countries IS NULL OR (country_from != ALL(p_excluded_countries) AND country_to != ALL(p_excluded_countries)))
              AND (p_excluded_regions IS NULL OR region_from != ALL(p_excluded_regions))
              AND num_migrants >= p_min_flow
              AND (p_max_flow IS NULL OR num_migrants <= p_max_flow)
              AND (p_period = 'all' OR period = p_period)
            GROUP BY country_from, country_to
        ) corridors;
        
        -- Return combined results
        RETURN QUERY
        SELECT 
            v_total_flows,
            v_unique_corridors,
            v_active_months,
            CASE WHEN v_active_months > 0 
                 THEN v_total_flows::NUMERIC / v_active_months
                 ELSE 0::NUMERIC END;
    END IF;
END;
$$;

-- 3. Enhanced Top Corridors Function
CREATE OR REPLACE FUNCTION get_filtered_top_corridors(
    p_start_date DATE DEFAULT '2019-01-01',
    p_end_date DATE DEFAULT '2022-12-31',
    p_regions TEXT[] DEFAULT NULL,
    p_countries TEXT[] DEFAULT NULL,
    p_excluded_countries TEXT[] DEFAULT NULL,
    p_excluded_regions TEXT[] DEFAULT NULL,
    p_min_flow INTEGER DEFAULT 0,
    p_max_flow INTEGER DEFAULT NULL,
    p_period TEXT DEFAULT 'all',
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
    country_from VARCHAR(2),
    country_to VARCHAR(2),
    total_migrants BIGINT,
    corridor TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Use pre-computed view if no complex filters
    IF p_regions IS NULL AND p_countries IS NULL AND p_excluded_countries IS NULL 
       AND p_excluded_regions IS NULL AND p_min_flow = 0 AND p_max_flow IS NULL
       AND p_start_date = '2019-01-01' AND p_end_date = '2022-12-31' THEN
        
        RETURN QUERY
        SELECT 
            tmc.country_from,
            tmc.country_to,
            SUM(tmc.total_migrants)::BIGINT as total_migrants,  -- Cast SUM result to BIGINT to match function signature
            CONCAT(tmc.country_from, ' → ', tmc.country_to) as corridor
        FROM top_migration_corridors tmc
        WHERE 1=1
        GROUP BY tmc.country_from, tmc.country_to  -- Group by corridor to eliminate period duplicates
        ORDER BY SUM(tmc.total_migrants) DESC
        LIMIT p_limit;
    ELSE
        -- Custom aggregation for complex filters
        RETURN QUERY
        SELECT 
            fcm.country_from,
            fcm.country_to,
            SUM(fcm.num_migrants)::BIGINT as total_migrants,
            CONCAT(fcm.country_from, ' → ', fcm.country_to) as corridor
        FROM flows_country_to_country_monthly fcm
        WHERE fcm.migration_month >= p_start_date
          AND fcm.migration_month <= p_end_date
          AND (p_regions IS NULL OR fcm.region_from = ANY(p_regions))
          AND (p_countries IS NULL OR fcm.country_from = ANY(p_countries) OR fcm.country_to = ANY(p_countries))
          AND (p_excluded_countries IS NULL OR (fcm.country_from != ALL(p_excluded_countries) AND fcm.country_to != ALL(p_excluded_countries)))
          AND (p_excluded_regions IS NULL OR fcm.region_from != ALL(p_excluded_regions))
          AND fcm.num_migrants >= p_min_flow
          AND (p_max_flow IS NULL OR fcm.num_migrants <= p_max_flow)
        GROUP BY fcm.country_from, fcm.country_to
        ORDER BY SUM(fcm.num_migrants) DESC
        LIMIT p_limit;
    END IF;
END;
$$;


-- 4. Quarterly Migration Data Function
CREATE OR REPLACE FUNCTION get_quarterly_migration_data(
    p_start_date DATE DEFAULT '2019-01-01',
    p_end_date DATE DEFAULT '2022-12-31',
    p_regions TEXT[] DEFAULT NULL,
    p_countries TEXT[] DEFAULT NULL,
    p_excluded_countries TEXT[] DEFAULT NULL,
    p_excluded_regions TEXT[] DEFAULT NULL,
    p_min_flow INTEGER DEFAULT 0,
    p_max_flow INTEGER DEFAULT NULL,
    p_period TEXT DEFAULT 'all',
    p_time_aggregation TEXT DEFAULT 'monthly'
)
RETURNS TABLE(
    month DATE,
    total BIGINT,
    season TEXT,
    quarter INTEGER
) 
LANGUAGE plpgsql
AS $$
BEGIN
    IF p_time_aggregation = 'quarterly' THEN
        -- Return quarterly aggregated data
        RETURN QUERY
        WITH quarterly_data AS (
            SELECT 
                DATE_TRUNC('quarter', fcm.migration_month)::DATE as quarter_start,
                SUM(fcm.num_migrants)::BIGINT as total_migrants,
                CASE 
                    WHEN EXTRACT(QUARTER FROM fcm.migration_month) = 1 THEN 'Q1'
                    WHEN EXTRACT(QUARTER FROM fcm.migration_month) = 2 THEN 'Q2'
                    WHEN EXTRACT(QUARTER FROM fcm.migration_month) = 3 THEN 'Q3'
                    WHEN EXTRACT(QUARTER FROM fcm.migration_month) = 4 THEN 'Q4'
                END as season,
                EXTRACT(QUARTER FROM fcm.migration_month)::INTEGER as quarter_num
            FROM flows_country_to_country_monthly fcm
            WHERE fcm.migration_month >= p_start_date
              AND fcm.migration_month <= p_end_date
              AND (p_regions IS NULL OR fcm.region_from = ANY(p_regions))
              AND (p_countries IS NULL OR fcm.country_from = ANY(p_countries) OR fcm.country_to = ANY(p_countries))
              AND (p_excluded_countries IS NULL OR (fcm.country_from != ALL(p_excluded_countries) AND fcm.country_to != ALL(p_excluded_countries)))
              AND (p_excluded_regions IS NULL OR fcm.region_from != ALL(p_excluded_regions))
              AND fcm.num_migrants >= p_min_flow
              AND (p_max_flow IS NULL OR fcm.num_migrants <= p_max_flow)
            GROUP BY DATE_TRUNC('quarter', fcm.migration_month), EXTRACT(QUARTER FROM fcm.migration_month)
        )
        SELECT 
            quarterly_data.quarter_start as month,
            quarterly_data.total_migrants as total,
            quarterly_data.season,
            quarterly_data.quarter_num as quarter
        FROM quarterly_data
        ORDER BY quarter_start;
    ELSE
        -- Return monthly data (default behavior)
        RETURN QUERY
        SELECT 
            fcm.migration_month as month,
            SUM(fcm.num_migrants)::BIGINT as total,
            CASE 
                WHEN EXTRACT(MONTH FROM fcm.migration_month) IN (1, 2, 3) THEN 'Q1'
                WHEN EXTRACT(MONTH FROM fcm.migration_month) IN (4, 5, 6) THEN 'Q2'
                WHEN EXTRACT(MONTH FROM fcm.migration_month) IN (7, 8, 9) THEN 'Q3'
                WHEN EXTRACT(MONTH FROM fcm.migration_month) IN (10, 11, 12) THEN 'Q4'
            END as season,
            EXTRACT(QUARTER FROM fcm.migration_month)::INTEGER as quarter
        FROM flows_country_to_country_monthly fcm
        WHERE fcm.migration_month >= p_start_date
          AND fcm.migration_month <= p_end_date
          AND (p_regions IS NULL OR fcm.region_from = ANY(p_regions))
          AND (p_countries IS NULL OR fcm.country_from = ANY(p_countries) OR fcm.country_to = ANY(p_countries))
          AND (p_excluded_countries IS NULL OR (fcm.country_from != ALL(p_excluded_countries) AND fcm.country_to != ALL(p_excluded_countries)))
          AND (p_excluded_regions IS NULL OR fcm.region_from != ALL(p_excluded_regions))
          AND fcm.num_migrants >= p_min_flow
          AND (p_max_flow IS NULL OR fcm.num_migrants <= p_max_flow)
        GROUP BY fcm.migration_month
        ORDER BY fcm.migration_month;
    END IF;
END;
$$;

-- 5. Seasonal Patterns Migration Data Function (Using Materialized View)
CREATE OR REPLACE FUNCTION get_seasonal_migration_patterns(
    p_start_date DATE DEFAULT '2019-01-01',
    p_end_date DATE DEFAULT '2022-12-31',
    p_regions TEXT[] DEFAULT NULL,
    p_countries TEXT[] DEFAULT NULL,
    p_excluded_countries TEXT[] DEFAULT NULL,
    p_excluded_regions TEXT[] DEFAULT NULL,
    p_min_flow INTEGER DEFAULT 0,
    p_max_flow INTEGER DEFAULT NULL,
    p_period TEXT DEFAULT 'all',
    p_time_aggregation TEXT DEFAULT 'monthly'
)
RETURNS TABLE(
    month TEXT,
    average BIGINT,
    max_value BIGINT,
    min_value BIGINT
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH monthly_totals AS (
        SELECT 
            fcm.migration_month,
            SUM(fcm.num_migrants) as monthly_total,
            CASE 
                WHEN p_time_aggregation = 'quarterly' THEN fcm.quarter
                WHEN p_time_aggregation = 'yearly' THEN fcm.year
                ELSE fcm.month
            END as period_num
        FROM flows_country_to_country_monthly fcm
        WHERE fcm.migration_month >= p_start_date
          AND fcm.migration_month <= p_end_date
          AND (p_regions IS NULL OR fcm.region_from = ANY(p_regions))
          AND (p_countries IS NULL OR fcm.country_from = ANY(p_countries) OR fcm.country_to = ANY(p_countries))
          AND (p_excluded_countries IS NULL OR (fcm.country_from != ALL(p_excluded_countries) AND fcm.country_to != ALL(p_excluded_countries)))
          AND (p_excluded_regions IS NULL OR fcm.region_from != ALL(p_excluded_regions))
          AND fcm.num_migrants >= p_min_flow
          AND (p_max_flow IS NULL OR fcm.num_migrants <= p_max_flow)
        GROUP BY fcm.migration_month, period_num
    ),
    seasonal_stats AS (
        SELECT 
            period_num,
            AVG(monthly_total) as avg_total,
            MAX(monthly_total) as max_total,
            MIN(monthly_total) as min_total
        FROM monthly_totals
        GROUP BY period_num
    )
    SELECT 
        CASE 
            WHEN p_time_aggregation = 'quarterly' THEN
                CASE period_num::INTEGER
                    WHEN 1 THEN 'Q1'
                    WHEN 2 THEN 'Q2'
                    WHEN 3 THEN 'Q3'
                    WHEN 4 THEN 'Q4'
                END
            WHEN p_time_aggregation = 'yearly' THEN period_num::TEXT
            ELSE
                CASE period_num::INTEGER
                    WHEN 1 THEN 'Jan' WHEN 2 THEN 'Feb' WHEN 3 THEN 'Mar'
                    WHEN 4 THEN 'Apr' WHEN 5 THEN 'May' WHEN 6 THEN 'Jun'
                    WHEN 7 THEN 'Jul' WHEN 8 THEN 'Aug' WHEN 9 THEN 'Sep'
                    WHEN 10 THEN 'Oct' WHEN 11 THEN 'Nov' WHEN 12 THEN 'Dec'
                END
        END as month,
        ROUND(avg_total)::BIGINT as average,
        max_total as max_value,
        min_total as min_value
    FROM seasonal_stats
    ORDER BY period_num;
END;
$$;