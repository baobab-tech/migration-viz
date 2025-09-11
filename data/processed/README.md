# Migration Data Variations - Generated Files

This directory contains all the migration data transformations generated from the original `international_migration_flow.csv` using UN M49 regional classification system.

## File Organization

### Spatial Aggregations

**Country-level flows:**
- `flows_country_to_country_monthly.csv` - Raw monthly bilateral country flows (25.6MB)
- `flows_country_to_country_quarterly.csv` - Quarterly averages by country pairs (13.9MB)  
- `flows_country_to_country_annual.csv` - Annual totals by country pairs (1.8MB)

**Regional aggregations:**
- `flows_region_to_country_monthly.csv` - Major regions to individual countries (965KB)
- `flows_country_to_region_monthly.csv` - Individual countries to major regions (967KB)
- `flows_region_to_region_monthly.csv` - Major region to major region flows (34KB)
- `flows_region_to_region_annual.csv` - Annual region-to-region totals (3KB)

**Subregional clustering:**
- `flows_subregion_to_subregion_monthly.csv` - UN M49 subregion flows (622KB)
- `flows_intermediate_to_intermediate_monthly.csv` - Intermediate region flows (97KB)

### Temporal Analysis

**Period comparisons:**
- `flows_pandemic_comparison_country.csv` - Pre-pandemic vs pandemic period analysis (1.3MB)
- `flows_seasonal_patterns_country.csv` - Average flows by season (Spring/Summer/Fall/Winter) (2.0MB)

**Trend analysis:**
- `flows_rolling_averages_top100.csv` - 3-month and 6-month rolling averages for top 100 corridors (316KB)

### Flow Calculations

**Flow types:**
- `flows_gross_annual_country.csv` - Total movement (gross flows) by corridor (1.8MB)
- `flows_net_annual_country.csv` - Net flows (inbound minus outbound) with gross totals (2.8MB)

**Analytics:**
- `flows_corridor_rankings_annual.csv` - Annual rankings and percentiles for all corridors (5.1MB)
- `flows_growth_rates_annual.csv` - Year-over-year growth rates and velocity changes (4.2MB)

## Data Schema

### Core Fields
- `country_from/country_to` - ISO2 country codes (AD, AE, etc.)
- `region_from/region_to` - UN M49 region names (Africa, Americas, Asia, Europe, Oceania)
- `subregion_from/subregion_to` - UN M49 subregion names (Sub-Saharan Africa, Northern Europe, etc.)
- `migration_month` - YYYY-MM format for monthly data
- `year` - Calendar year for annual aggregations
- `quarter_year` - YYYY-QN format for quarterly data
- `num_migrants` - Migration flow count

### Regional Classification (UN M49)

**Major Regions (5):**
- Africa (002)
- Americas (019) 
- Asia (142)
- Europe (150)
- Oceania (009)

**Sub-regions (17):** Northern Africa, Sub-Saharan Africa, Northern America, Latin America and the Caribbean, Central Asia, Eastern Asia, South-eastern Asia, Southern Asia, Western Asia, Eastern Europe, Northern Europe, Southern Europe, Western Europe, Australia and New Zealand, Melanesia, Micronesia, Polynesia

**Intermediate Regions (7):** Eastern Africa, Middle Africa, Southern Africa, Western Africa, Caribbean, Central America, South America

## Usage Examples

### Loading data in Python:
```python
import pandas as pd

# Load country-to-country annual flows
df = pd.read_csv('flows_country_to_country_annual.csv')

# Load pandemic comparison
pandemic_df = pd.read_csv('flows_pandemic_comparison_country.csv')

# Load regional flows
regional_df = pd.read_csv('flows_region_to_region_monthly.csv')
```

### Key Analysis Files:

1. **For corridor analysis:** `flows_corridor_rankings_annual.csv`
2. **For pandemic impact:** `flows_pandemic_comparison_country.csv`  
3. **For trend analysis:** `flows_growth_rates_annual.csv`
4. **For regional patterns:** `flows_region_to_region_monthly.csv`
5. **For seasonal effects:** `flows_seasonal_patterns_country.csv`

## Data Coverage

- **Temporal range:** 2019-01-01 to 2022-12-01 (4 years monthly data)
- **Geographic coverage:** 180 countries/territories
- **Total records processed:** 1,563,154 migration flow observations
- **Pre-pandemic period:** 2019-2019 (12 months)
- **Pandemic period:** 2020-2022 (36 months)

## Generation Script

All files generated using: `scripts/generate_migration_variations.py`

To regenerate all variations:
```bash
python scripts/generate_migration_variations.py
```

---
*Generated on: September 11, 2025*  
*Total processed data size: ~61MB across 16 variation files*
