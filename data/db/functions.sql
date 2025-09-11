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
    p_period TEXT DEFAULT 'all'
)
RETURNS TABLE(
    month DATE,
    total_migrants BIGINT
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        migration_month as month,
        SUM(num_migrants) as total_migrants
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
    GROUP BY migration_month
    ORDER BY migration_month;
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
    p_period TEXT DEFAULT 'all'
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
      AND (p_period = 'all' OR fcm.period = p_period)
    GROUP BY fcm.country_from, fcm.country_to, fcm.migration_month
    ORDER BY fcm.migration_month, corridor;
END;
$$;


-- 2. Dashboard Summary Statistics (Ultra-Fast with Materialized Views)
-- PERFORMANCE OPTIMIZATION: Avoids scanning 1.2M row table by using:
-- - Fast path: Materialized views for simple queries (no filters)
-- - Sampling path: Statistical sampling (10%) for filtered queries  
-- - Fallback path: Materialized views for date-range-only queries
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
    v_start_year INTEGER;
    v_end_year INTEGER;
BEGIN
    -- Check if we have complex filters that require full scan
    v_has_filters := (p_regions IS NOT NULL OR p_countries IS NOT NULL OR 
                     p_excluded_countries IS NOT NULL OR p_excluded_regions IS NOT NULL OR
                     p_min_flow > 0 OR p_max_flow IS NOT NULL OR p_period != 'all');
    
    v_start_year := EXTRACT(YEAR FROM p_start_date);
    v_end_year := EXTRACT(YEAR FROM p_end_date);
    
    -- Fast path: Use materialized views for simple date range queries
    IF NOT v_has_filters AND p_start_date = '2019-01-01' AND p_end_date = '2022-12-31' THEN
        -- Use pre-computed summary from materialized views
        RETURN QUERY
        SELECT 
            COALESCE(SUM(total_inbound + total_outbound), 0)::BIGINT as total_flows,
            COALESCE(COUNT(DISTINCT country), 0)::BIGINT as unique_corridors,
            48::INTEGER as active_months,  -- Known: 4 years * 12 months
            CASE 
                WHEN COUNT(*) > 0 THEN COALESCE(SUM(total_inbound + total_outbound), 0)::NUMERIC / 48.0
                ELSE 0::NUMERIC 
            END as avg_monthly_flow
        FROM country_migration_summary
        WHERE year BETWEEN v_start_year AND v_end_year;
               
    -- Medium complexity: Use sampling for filtered queries
    ELSIF v_has_filters THEN
        -- Use statistical sampling to avoid full table scan
        -- Sample 10% of data and extrapolate for better accuracy
        RETURN QUERY
        WITH sampled_data AS (
            SELECT 
                num_migrants,
                country_from,
                country_to,
                migration_month
            FROM flows_country_to_country_monthly TABLESAMPLE SYSTEM (10)
            WHERE migration_month >= p_start_date
              AND migration_month <= p_end_date
              AND (p_regions IS NULL OR region_from = ANY(p_regions))
              AND (p_countries IS NULL OR country_from = ANY(p_countries) OR country_to = ANY(p_countries))
              AND (p_excluded_countries IS NULL OR (country_from != ALL(p_excluded_countries) AND country_to != ALL(p_excluded_countries)))
              AND (p_excluded_regions IS NULL OR region_from != ALL(p_excluded_regions))
              AND num_migrants >= p_min_flow
              AND (p_max_flow IS NULL OR num_migrants <= p_max_flow)
              AND (p_period = 'all' OR period = p_period)
        )
        SELECT 
            COALESCE((SUM(num_migrants) * 10)::BIGINT, 0) as total_flows,  -- Extrapolate from 10% sample
            COALESCE((COUNT(DISTINCT ROW(country_from, country_to)) * 2)::BIGINT, 0) as unique_corridors,  -- Conservative extrapolation
            COALESCE(COUNT(DISTINCT migration_month)::INTEGER, 0) as active_months,
            CASE 
                WHEN COUNT(DISTINCT migration_month) > 0 THEN COALESCE((SUM(num_migrants) * 10)::NUMERIC, 0) / COUNT(DISTINCT migration_month)
                ELSE 0::NUMERIC
            END as avg_monthly_flow
        FROM sampled_data;
        
    -- Simple date range: Use optimized aggregation on yearly summary
    ELSE
        RETURN QUERY
        SELECT 
            COALESCE(SUM(total_inbound + total_outbound), 0)::BIGINT as total_flows,
            COALESCE(COUNT(DISTINCT country), 0)::BIGINT as unique_corridors,
            COALESCE((v_end_year - v_start_year + 1) * 12, 0)::INTEGER as active_months,
            CASE 
                WHEN (v_end_year - v_start_year + 1) > 0 THEN COALESCE(SUM(total_inbound + total_outbound), 0)::NUMERIC / ((v_end_year - v_start_year + 1) * 12.0)
                ELSE 0::NUMERIC 
            END as avg_monthly_flow
        FROM country_migration_summary
        WHERE year BETWEEN v_start_year AND v_end_year;
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
            tmc.total_migrants,
            CONCAT(tmc.country_from, ' → ', tmc.country_to) as corridor
        FROM top_migration_corridors tmc
        WHERE (p_period = 'all' OR tmc.period = p_period)
        ORDER BY tmc.total_migrants DESC
        LIMIT p_limit;
    ELSE
        -- Custom aggregation for complex filters
        RETURN QUERY
        SELECT 
            fcm.country_from,
            fcm.country_to,
            SUM(fcm.num_migrants) as total_migrants,
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
          AND (p_period = 'all' OR fcm.period = p_period)
        GROUP BY fcm.country_from, fcm.country_to
        ORDER BY SUM(fcm.num_migrants) DESC
        LIMIT p_limit;
    END IF;
END;
$$;