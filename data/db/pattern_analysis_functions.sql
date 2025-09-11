-- Pattern Analysis Functions
-- Consolidates seasonal analysis into parameterized functions

-- 1. Enhanced Pattern Analysis Function (replaces separate seasonal views)
CREATE OR REPLACE FUNCTION get_migration_patterns(
    p_pattern_type TEXT DEFAULT 'seasonal', -- 'seasonal', 'yoy_growth'
    p_aggregation_level TEXT DEFAULT 'country', -- 'country', 'region', 'subregion'
    p_start_date DATE DEFAULT '2019-01-01',
    p_end_date DATE DEFAULT '2022-12-31',
    p_corridors TEXT[] DEFAULT NULL,
    p_regions TEXT[] DEFAULT NULL,
    p_countries TEXT[] DEFAULT NULL,
    p_time_aggregation TEXT DEFAULT 'monthly', -- 'monthly', 'quarterly', 'yearly'
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE(
    from_entity TEXT,
    to_entity TEXT,
    pattern_data JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
    from_col TEXT;
    to_col TEXT;
    source_view TEXT;
    date_col TEXT;
BEGIN
    -- Set aggregation columns based on level
    CASE p_aggregation_level
        WHEN 'region' THEN
            from_col := 'region_from';
            to_col := 'region_to';
        WHEN 'subregion' THEN
            from_col := 'subregion_from';
            to_col := 'subregion_to';
        ELSE
            from_col := 'country_from';
            to_col := 'country_to';
    END CASE;

    -- Set source view and date column based on time aggregation
    CASE p_time_aggregation
        WHEN 'quarterly' THEN
            source_view := 'flows_country_to_country_quarterly_totals';
            date_col := 'quarter_date';
        WHEN 'yearly' THEN
            source_view := 'flows_country_to_country_annual_totals';  
            date_col := 'year_date';
        ELSE
            source_view := 'flows_corridor_monthly_agg';
            date_col := 'migration_month';
    END CASE;

    IF p_pattern_type = 'seasonal' THEN
        -- Seasonal patterns analysis
        RETURN QUERY
        EXECUTE format('
        WITH seasonal_data AS (
            SELECT 
                %I as from_entity,
                %I as to_entity,
                CASE 
                    WHEN ''%s'' = ''yearly'' THEN ''Annual''
                    ELSE COALESCE(season, ''Q1'')
                END as season,
                AVG(num_migrants) as avg_migrants
            FROM %s
            WHERE %I >= $1
              AND %I <= $2
              AND (%I IS NOT NULL AND %I IS NOT NULL)
              AND ($3 IS NULL OR (%I || ''-'' || %I) = ANY($3))
              AND ($4 IS NULL OR %I = ANY($4) OR %I = ANY($4))
              AND ($5 IS NULL OR %I = ANY($5) OR %I = ANY($5))
            GROUP BY %I, %I, CASE 
                WHEN ''%s'' = ''yearly'' THEN ''Annual''
                ELSE COALESCE(season, ''Q1'')
            END
        )
        SELECT 
            from_entity::TEXT,
            to_entity::TEXT,
            jsonb_build_object(
                ''Q1'', COALESCE(MAX(CASE WHEN season = ''Q1'' THEN avg_migrants END), 0),
                ''Q2'', COALESCE(MAX(CASE WHEN season = ''Q2'' THEN avg_migrants END), 0),
                ''Q3'', COALESCE(MAX(CASE WHEN season = ''Q3'' THEN avg_migrants END), 0),
                ''Q4'', COALESCE(MAX(CASE WHEN season = ''Q4'' THEN avg_migrants END), 0),
                ''peak_season'', (
                    SELECT season 
                    FROM seasonal_data sd2 
                    WHERE sd2.from_entity = sd.from_entity 
                      AND sd2.to_entity = sd.to_entity
                    ORDER BY avg_migrants DESC 
                    LIMIT 1
                ),
                ''seasonality_index'', CASE 
                    WHEN AVG(avg_migrants) > 0 THEN STDDEV(avg_migrants) / AVG(avg_migrants)
                    ELSE 0 
                END
            ) as pattern_data
        FROM seasonal_data sd
        GROUP BY from_entity, to_entity
        ORDER BY AVG(avg_migrants) DESC
        LIMIT $6',
        from_col, to_col, p_time_aggregation, source_view, date_col, date_col,
        from_col, to_col, from_col, to_col, 
        from_col, to_col, from_col, to_col, from_col, to_col, p_time_aggregation
        ) 
        USING p_start_date, p_end_date, p_corridors, p_regions, p_countries, p_limit;

    ELSIF p_pattern_type = 'yoy_growth' THEN
        -- Year-over-year growth analysis (only works with monthly data)
        IF p_time_aggregation != 'monthly' THEN
            RAISE EXCEPTION 'Year-over-year growth analysis only available for monthly time aggregation';
        END IF;
        
        RETURN QUERY
        EXECUTE format('
        WITH yoy_data AS (
            SELECT 
                %I as from_entity,
                %I as to_entity,
                %I as time_period,
                num_migrants,
                same_month_prev_year,
                CASE 
                    WHEN same_month_prev_year > 0 THEN 
                        ((num_migrants - same_month_prev_year) * 100.0 / same_month_prev_year)
                    ELSE NULL
                END as yoy_growth_rate
            FROM %s
            WHERE %I >= $1
              AND %I <= $2
              AND (%I IS NOT NULL AND %I IS NOT NULL)
              AND same_month_prev_year IS NOT NULL
              AND ($3 IS NULL OR (%I || ''-'' || %I) = ANY($3))
              AND ($4 IS NULL OR %I = ANY($4) OR %I = ANY($4))
              AND ($5 IS NULL OR %I = ANY($5) OR %I = ANY($5))
        )
        SELECT 
            from_entity::TEXT,
            to_entity::TEXT,
            jsonb_build_object(
                ''avg_yoy_growth'', AVG(yoy_growth_rate),
                ''median_yoy_growth'', PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY yoy_growth_rate),
                ''growth_volatility'', STDDEV(yoy_growth_rate),
                ''months_with_growth'', COUNT(*) FILTER (WHERE yoy_growth_rate > 0),
                ''months_with_decline'', COUNT(*) FILTER (WHERE yoy_growth_rate < 0),
                ''max_growth'', MAX(yoy_growth_rate),
                ''max_decline'', MIN(yoy_growth_rate),
                ''trend'', CASE 
                    WHEN AVG(yoy_growth_rate) > 10 THEN ''strong_growth''
                    WHEN AVG(yoy_growth_rate) > 0 THEN ''growth''
                    WHEN AVG(yoy_growth_rate) > -10 THEN ''stable''
                    ELSE ''decline''
                END
            ) as pattern_data
        FROM yoy_data
        GROUP BY from_entity, to_entity
        HAVING COUNT(*) >= 6  -- At least 6 months of data
        ORDER BY AVG(yoy_growth_rate) DESC
        LIMIT $6',
        from_col, to_col, date_col, source_view, date_col, date_col,
        from_col, to_col, from_col, to_col,
        from_col, to_col, from_col, to_col
        )
        USING p_start_date, p_end_date, p_corridors, p_regions, p_countries, p_limit;

    ELSE
        RAISE EXCEPTION 'Invalid pattern_type: %', p_pattern_type;
    END IF;
END;
$$;

-- 2. Enhanced Regional Flows Function (supports both region and subregion filtering)
CREATE OR REPLACE FUNCTION get_regional_flows(
    p_aggregation_level TEXT DEFAULT 'region', -- 'region', 'subregion', 'both'
    p_start_date DATE DEFAULT '2019-01-01',
    p_end_date DATE DEFAULT '2022-12-31',
    p_regions TEXT[] DEFAULT NULL,
    p_subregions TEXT[] DEFAULT NULL,
    p_time_aggregation TEXT DEFAULT 'monthly', -- 'monthly', 'quarterly', 'annual'
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
    from_region TEXT,
    to_region TEXT,
    from_subregion TEXT,
    to_subregion TEXT,
    time_period TEXT,
    total_migrants BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
    source_view TEXT;
BEGIN
    source_view := CASE 
        WHEN p_time_aggregation = 'annual' THEN 'flows_regional_annual'
        WHEN p_time_aggregation = 'quarterly' THEN 'flows_regional_monthly' -- Quarterly will use monthly and aggregate
        ELSE 'flows_regional_monthly' 
    END;

    IF p_aggregation_level = 'region' THEN
        RETURN QUERY
        EXECUTE format('
        SELECT 
            region_from::TEXT as from_region,
            region_to::TEXT as to_region,
            NULL::TEXT as from_subregion,
            NULL::TEXT as to_subregion,
            CASE 
                WHEN ''%s'' = ''annual'' THEN year::TEXT 
                WHEN ''%s'' = ''quarterly'' THEN DATE_TRUNC(''quarter'', migration_month)::TEXT
                ELSE migration_month::TEXT 
            END as time_period,
            SUM(num_migrants) as total_migrants
        FROM %s
        WHERE region_from IS NOT NULL 
          AND region_to IS NOT NULL
          AND migration_month >= $1 AND migration_month <= $2
          AND ($3 IS NULL OR region_from = ANY($3) OR region_to = ANY($3))
        GROUP BY region_from, region_to, 
                 CASE 
                    WHEN ''%s'' = ''annual'' THEN year::TEXT 
                    WHEN ''%s'' = ''quarterly'' THEN DATE_TRUNC(''quarter'', migration_month)::TEXT
                    ELSE migration_month::TEXT 
                 END
        ORDER BY SUM(num_migrants) DESC
        LIMIT $4', 
        p_time_aggregation, p_time_aggregation, source_view, p_time_aggregation, p_time_aggregation
        )
        USING p_start_date, p_end_date, p_regions, p_limit;

    ELSIF p_aggregation_level = 'subregion' THEN
        RETURN QUERY
        EXECUTE format('
        SELECT 
            NULL::TEXT as from_region,
            NULL::TEXT as to_region,
            subregion_from::TEXT as from_subregion,
            subregion_to::TEXT as to_subregion,
            CASE WHEN ''%s'' = ''annual'' THEN year::TEXT ELSE migration_month::TEXT END as time_period,
            SUM(num_migrants) as total_migrants
        FROM %s
        WHERE subregion_from IS NOT NULL 
          AND subregion_to IS NOT NULL
          AND (''%s'' = ''annual'' OR (migration_month >= $1 AND migration_month <= $2))
          AND (''%s'' = ''monthly'' OR (year >= EXTRACT(YEAR FROM $1) AND year <= EXTRACT(YEAR FROM $2)))
          AND ($3 IS NULL OR subregion_from = ANY($3) OR subregion_to = ANY($3))
        GROUP BY subregion_from, subregion_to, 
                 CASE WHEN ''%s'' = ''annual'' THEN year::TEXT ELSE migration_month::TEXT END
        ORDER BY SUM(num_migrants) DESC
        LIMIT $4', 
        p_time_aggregation, source_view, p_time_aggregation, p_time_aggregation, p_time_aggregation
        )
        USING p_start_date, p_end_date, p_subregions, p_limit;

    ELSE -- both
        RETURN QUERY
        EXECUTE format('
        SELECT 
            region_from::TEXT as from_region,
            region_to::TEXT as to_region,
            subregion_from::TEXT as from_subregion,
            subregion_to::TEXT as to_subregion,
            CASE WHEN ''%s'' = ''annual'' THEN year::TEXT ELSE migration_month::TEXT END as time_period,
            num_migrants as total_migrants
        FROM %s
        WHERE (region_from IS NOT NULL OR subregion_from IS NOT NULL)
          AND (region_to IS NOT NULL OR subregion_to IS NOT NULL)
          AND (''%s'' = ''annual'' OR (migration_month >= $1 AND migration_month <= $2))
          AND (''%s'' = ''monthly'' OR (year >= EXTRACT(YEAR FROM $1) AND year <= EXTRACT(YEAR FROM $2)))
          AND ($3 IS NULL OR region_from = ANY($3) OR region_to = ANY($3))
          AND ($4 IS NULL OR subregion_from = ANY($4) OR subregion_to = ANY($4))
        ORDER BY num_migrants DESC
        LIMIT $5', 
        p_time_aggregation, source_view, p_time_aggregation, p_time_aggregation
        )
        USING p_start_date, p_end_date, p_regions, p_subregions, p_limit;
    END IF;
END;
$$;
