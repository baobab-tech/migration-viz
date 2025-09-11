# Database Functions and Views

This directory contains optimized PostgreSQL database functions and views designed to support the migration visualization UI with high-performance queries on the migration flow dataset.

## 🏗️ Architecture Overview

The database layer is designed for **performance optimization** when working with 1.2M+ migration flow records. It uses a three-tier approach:

1. **Fast Path**: Pre-computed materialized views for simple queries
2. **Sampling Path**: Statistical sampling (10%) for complex filtered queries  
3. **Fallback Path**: Optimized aggregation for date-range queries

## 📋 Files Overview

- **`base.sql`** - Core table definitions and initial setup
- **`functions.sql`** - Main query functions optimized for UI dashboards
- **`pattern_analysis_functions.sql`** - Advanced pattern analysis and seasonal data functions
- **`views.sql`** - Materialized views for performance optimization
- **`indices.sql`** - Database indices for query performance
- **`policies.sql`** - Row-level security and access policies

## 🚀 Core Functions (functions.sql)

### Dashboard Functions

#### `get_monthly_migration_totals()`
Returns time-series data for monthly migration totals with comprehensive filtering.

**Parameters:**
- `p_start_date`, `p_end_date` - Date range
- `p_regions[]`, `p_countries[]` - Include specific regions/countries
- `p_excluded_countries[]`, `p_excluded_regions[]` - Exclude specific regions/countries  
- `p_min_flow`, `p_max_flow` - Flow volume filters
- `p_period` - Time period grouping

**Returns:** `(month DATE, total_migrants BIGINT)`

#### `get_dashboard_summary()`
Ultra-fast summary statistics using performance-optimized paths:
- **Fast path**: Uses materialized views for unfiltered queries
- **Sampling path**: 10% statistical sampling for complex filters
- **Fallback path**: Yearly summary aggregation for simple date ranges

**Returns:** `(total_flows BIGINT, unique_corridors BIGINT, active_months INTEGER, avg_monthly_flow NUMERIC)`

#### `get_filtered_top_corridors()`
Returns top migration corridors with smart optimization - uses pre-computed views when possible, falls back to live aggregation for filtered queries.

**Returns:** `(country_from VARCHAR(2), country_to VARCHAR(2), total_migrants BIGINT, corridor TEXT)`

### Time Series Functions

#### `get_corridor_time_series()`
Multi-corridor time series data for comparative visualization.

**Parameters:**
- `p_corridors[]` - Array of 'FROM-TO' corridor strings
- Standard filtering parameters

**Returns:** `(corridor TEXT, country_from VARCHAR(2), country_to VARCHAR(2), month DATE, migrants BIGINT)`

#### `get_quarterly_migration_data()`
Flexible temporal aggregation supporting both monthly and quarterly views.

**Parameters:**
- `p_time_aggregation` - 'monthly' or 'quarterly'
- Standard filtering parameters

**Returns:** `(month DATE, total BIGINT, season TEXT, quarter INTEGER)`

#### `get_seasonal_migration_patterns()`
Monthly seasonal pattern analysis with statistical aggregations.

**Returns:** `(month TEXT, average BIGINT, max_value BIGINT, min_value BIGINT)`

## 📊 Pattern Analysis Functions (pattern_analysis_functions.sql)

### `get_migration_patterns()`
Advanced pattern analysis supporting multiple analysis types and aggregation levels.

**Pattern Types:**
- `'seasonal'` - Quarterly seasonal analysis with seasonality index
- `'yoy_growth'` - Year-over-year growth patterns and trends

**Aggregation Levels:**
- `'country'` - Country-to-country analysis
- `'region'` - Regional flow analysis  
- `'subregion'` - Sub-regional flow analysis

**Returns:** `(from_entity TEXT, to_entity TEXT, pattern_data JSONB)`

### `get_regional_flows()`
Regional flow analysis with flexible spatial aggregation.

**Parameters:**
- `p_aggregation_level` - 'region', 'subregion', 'both'
- `p_time_aggregation` - 'monthly', 'annual'

**Returns:** `(from_region TEXT, to_region TEXT, from_subregion TEXT, to_subregion TEXT, time_period TEXT, total_migrants BIGINT)`

## 🗃️ Materialized Views (views.sql)

### Spatial Aggregation Views
- `flows_country_to_country_monthly` - Enhanced base view with regional mappings
- `flows_region_to_country_monthly` - Region-to-country flows
- `flows_country_to_region_monthly` - Country-to-region flows
- `flows_regional_monthly` - Region-to-region flows

### Temporal Aggregation Views
- `flows_country_to_country_quarterly` - Quarterly aggregation
- `flows_country_to_country_annual` - Annual aggregation
- `flows_regional_annual` - Regional annual flows

### Performance Optimization Views
- `flows_corridor_monthly_agg` - Pre-computed corridor data with rolling averages
- `flows_rolling_averages_top100` - Rolling averages for top 100 corridors
- `country_migration_summary` - Country-level summary statistics
- `top_migration_corridors` - Pre-ranked top corridors by period

### Advanced Analytics Views
- `flows_net_annual_country` - Net migration calculations
- `flows_corridor_rankings_annual` - Corridor rankings with percentiles
- `flows_growth_rates_annual` - Year-over-year growth rates

## ⚡ Performance Features

### Query Optimization Strategies
1. **Materialized View Utilization** - Pre-computed aggregations for common queries
2. **Statistical Sampling** - 10% sampling with extrapolation for complex filtered queries
3. **Intelligent Path Selection** - Automatic selection of fastest query path
4. **Index Optimization** - Strategic indices on key columns

### View Refresh Management
- `refresh_migration_views()` function to refresh all materialized views
- Dependency-aware refresh ordering
- Automated refresh scheduling support

## 🔍 Usage Examples

### Time Series Data for Charts
```sql
-- Monthly migration totals with region filtering
SELECT * FROM get_monthly_migration_totals(
    '2020-01-01', '2022-12-31',
    ARRAY['Europe', 'Asia'],  -- regions
    NULL,                     -- countries
    ARRAY['RU'],             -- excluded countries
    NULL,                    -- excluded regions
    1000,                    -- min flow
    NULL                     -- max flow
);
```

### Multi-Corridor Analysis
```sql
-- Time series for specific corridors
SELECT * FROM get_corridor_time_series(
    ARRAY['US-MX', 'DE-FR', 'UK-US'],  -- corridors
    '2019-01-01', '2022-12-31'
);
```

### Pattern Analysis
```sql
-- Seasonal patterns by country
SELECT * FROM get_migration_patterns(
    'seasonal',    -- pattern type
    'country',     -- aggregation level
    '2019-01-01', '2022-12-31',
    NULL,          -- corridors
    ARRAY['Europe'], -- regions
    NULL,          -- countries
    20             -- limit
);
```

### Dashboard Summary
```sql
-- Fast dashboard statistics
SELECT * FROM get_dashboard_summary(
    '2020-01-01', '2022-12-31',
    ARRAY['North America'],  -- regions filter
    NULL,                    -- countries
    NULL,                    -- excluded countries
    NULL,                    -- excluded regions
    5000,                    -- min flow threshold
    NULL                     -- max flow
);
```

## 🎯 Design Principles

1. **Performance First** - All functions optimized for UI responsiveness
2. **Flexible Filtering** - Comprehensive parameter support for diverse queries
3. **Smart Caching** - Materialized views for frequently accessed data
4. **Scalable Architecture** - Designed to handle growing datasets efficiently
5. **UI-Optimized** - Return formats tailored for frontend consumption

## 🔧 Maintenance

### Regular Tasks
- Refresh materialized views after data updates using `refresh_migration_views()`
- Monitor query performance and adjust indices as needed
- Update statistical samples when data patterns change significantly

### Performance Monitoring
- Functions include automatic path selection based on filter complexity
- Sampling rates can be adjusted based on accuracy requirements
- View refresh can be scheduled during low-usage periods

---

These database functions and views provide the foundation for high-performance migration data analysis and visualization, enabling responsive dashboards and complex analytical queries on large-scale migration datasets.