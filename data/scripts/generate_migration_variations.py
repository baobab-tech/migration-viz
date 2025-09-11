#!/usr/bin/env python3
"""
Migration Data Transformation Script
Generates all spatial, temporal, and flow calculation variations from raw migration data
using UN M49 regional classification system.
"""

import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

class MigrationDataProcessor:
    def __init__(self, data_dir="../"):
        self.data_dir = Path(data_dir)
        self.output_dir = self.data_dir / "processed"
        self.output_dir.mkdir(exist_ok=True)
        
        # Load and process regional mappings
        self.load_regional_mappings()
        
        # Load migration data
        self.load_migration_data()
        
        print(f"Loaded {len(self.df):,} migration records")
        print(f"Date range: {self.df['date'].min()} to {self.df['date'].max()}")
        print(f"Countries: {self.df['country_from'].nunique()} origins, {self.df['country_to'].nunique()} destinations")

    def load_regional_mappings(self):
        """Load and process M49 regional classification data"""
        m49_path = self.data_dir / "m49.csv"
        
        # Read M49 data
        m49 = pd.read_csv(m49_path, delimiter=';')
        
        # Create mapping dictionaries
        self.country_to_region = {}
        self.country_to_subregion = {}
        self.country_to_intermediate = {}
        self.region_names = {}
        self.subregion_names = {}
        self.intermediate_names = {}
        
        for _, row in m49.iterrows():
            iso2 = row['ISO-alpha2 Code']
            if pd.isna(iso2):
                continue
                
            # Map country to regions
            self.country_to_region[iso2] = row['Region Code']
            self.country_to_subregion[iso2] = row['Sub-region Code']
            self.country_to_intermediate[iso2] = row.get('Intermediate Region Code', None)
            
            # Store region names
            if not pd.isna(row['Region Code']):
                self.region_names[row['Region Code']] = row['Region Name']
            if not pd.isna(row['Sub-region Code']):
                self.subregion_names[row['Sub-region Code']] = row['Sub-region Name']
            if not pd.isna(row.get('Intermediate Region Code', None)):
                self.intermediate_names[row['Intermediate Region Code']] = row['Intermediate Region Name']
        
        print(f"Loaded regional mappings for {len(self.country_to_region)} countries")
        print(f"Regions: {len(self.region_names)}, Sub-regions: {len(self.subregion_names)}, Intermediate: {len(self.intermediate_names)}")

    def load_migration_data(self):
        """Load and preprocess migration data"""
        data_path = self.data_dir / "original" / "international_migration_flow.csv"
        
        # Load data
        self.df = pd.read_csv(data_path)
        
        # Convert date
        self.df['date'] = pd.to_datetime(self.df['migration_month'])
        self.df['year'] = self.df['date'].dt.year
        self.df['month'] = self.df['date'].dt.month
        self.df['quarter'] = self.df['date'].dt.quarter
        
        # Add regional classifications
        self.df['region_from'] = self.df['country_from'].map(self.country_to_region)
        self.df['region_to'] = self.df['country_to'].map(self.country_to_region)
        self.df['subregion_from'] = self.df['country_from'].map(self.country_to_subregion)
        self.df['subregion_to'] = self.df['country_to'].map(self.country_to_subregion)
        self.df['intermediate_from'] = self.df['country_from'].map(self.country_to_intermediate)
        self.df['intermediate_to'] = self.df['country_to'].map(self.country_to_intermediate)
        
        # Add seasonal classifications (quarters)
        
        # Add season
        season_map = {12: 'Winter', 1: 'Winter', 2: 'Winter',
                     3: 'Spring', 4: 'Spring', 5: 'Spring',
                     6: 'Summer', 7: 'Summer', 8: 'Summer',
                     9: 'Fall', 10: 'Fall', 11: 'Fall'}
        self.df['season'] = self.df['month'].map(season_map)

    # SPATIAL AGGREGATIONS
    def generate_country_to_country(self):
        """Generate country-to-country bilateral flows (monthly raw data)"""
        print("Generating country-to-country flows...")
        output_path = self.output_dir / "flows_country_to_country_monthly.json"
        self.df[['country_from', 'country_to', 'migration_month', 'num_migrants']].to_json(
            output_path, orient='records', date_format='iso')
        return output_path

    def generate_region_to_country(self):
        """Generate region-to-country flows"""
        print("Generating region-to-country flows...")
        
        # Group by region_from, country_to, date
        agg_data = []
        for (region_from, country_to, date), group in self.df.groupby(['region_from', 'country_to', 'migration_month']):
            if pd.isna(region_from):
                continue
            region_name = self.region_names.get(region_from, f"Region_{region_from}")
            agg_data.append({
                'region_from': region_name,
                'country_to': country_to,
                'migration_month': date,
                'num_migrants': group['num_migrants'].sum()
            })
        
        result_df = pd.DataFrame(agg_data)
        output_path = self.output_dir / "flows_region_to_country_monthly.json"
        result_df.to_json(output_path, orient='records', date_format='iso')
        return output_path

    def generate_country_to_region(self):
        """Generate country-to-region flows"""
        print("Generating country-to-region flows...")
        
        agg_data = []
        for (country_from, region_to, date), group in self.df.groupby(['country_from', 'region_to', 'migration_month']):
            if pd.isna(region_to):
                continue
            region_name = self.region_names.get(region_to, f"Region_{region_to}")
            agg_data.append({
                'country_from': country_from,
                'region_to': region_name,
                'migration_month': date,
                'num_migrants': group['num_migrants'].sum()
            })
        
        result_df = pd.DataFrame(agg_data)
        output_path = self.output_dir / "flows_country_to_region_monthly.json"
        result_df.to_json(output_path, orient='records', date_format='iso')
        return output_path

    def generate_region_to_region(self):
        """Generate region-to-region flows"""
        print("Generating region-to-region flows...")
        
        agg_data = []
        for (region_from, region_to, date), group in self.df.groupby(['region_from', 'region_to', 'migration_month']):
            if pd.isna(region_from) or pd.isna(region_to):
                continue
            region_from_name = self.region_names.get(region_from, f"Region_{region_from}")
            region_to_name = self.region_names.get(region_to, f"Region_{region_to}")
            agg_data.append({
                'region_from': region_from_name,
                'region_to': region_to_name,
                'migration_month': date,
                'num_migrants': group['num_migrants'].sum()
            })
        
        result_df = pd.DataFrame(agg_data)
        output_path = self.output_dir / "flows_region_to_region_monthly.json"
        result_df.to_json(output_path, orient='records', date_format='iso')
        return output_path

    def generate_subregional_clustering(self):
        """Generate subregional clustering flows"""
        print("Generating subregional flows...")
        
        # Subregion to subregion
        agg_data = []
        for (subregion_from, subregion_to, date), group in self.df.groupby(['subregion_from', 'subregion_to', 'migration_month']):
            if pd.isna(subregion_from) or pd.isna(subregion_to):
                continue
            subregion_from_name = self.subregion_names.get(subregion_from, f"Subregion_{subregion_from}")
            subregion_to_name = self.subregion_names.get(subregion_to, f"Subregion_{subregion_to}")
            agg_data.append({
                'subregion_from': subregion_from_name,
                'subregion_to': subregion_to_name,
                'migration_month': date,
                'num_migrants': group['num_migrants'].sum()
            })
        
        result_df = pd.DataFrame(agg_data)
        output_path = self.output_dir / "flows_subregion_to_subregion_monthly.json"
        result_df.to_json(output_path, orient='records', date_format='iso')
        
        # Also generate intermediate region flows
        if self.intermediate_names:
            agg_data_inter = []
            for (inter_from, inter_to, date), group in self.df.groupby(['intermediate_from', 'intermediate_to', 'migration_month']):
                if pd.isna(inter_from) or pd.isna(inter_to):
                    continue
                inter_from_name = self.intermediate_names.get(inter_from, f"Intermediate_{inter_from}")
                inter_to_name = self.intermediate_names.get(inter_to, f"Intermediate_{inter_to}")
                agg_data_inter.append({
                    'intermediate_from': inter_from_name,
                    'intermediate_to': inter_to_name,
                    'migration_month': date,
                    'num_migrants': group['num_migrants'].sum()
                })
            
            result_df_inter = pd.DataFrame(agg_data_inter)
            output_path_inter = self.output_dir / "flows_intermediate_to_intermediate_monthly.json"
            result_df_inter.to_json(output_path_inter, orient='records', date_format='iso')
        
        return output_path

    # TEMPORAL AGGREGATIONS
    def generate_quarterly_averages(self):
        """Generate quarterly averages"""
        print("Generating quarterly aggregations...")
        
        # Country-to-country quarterly
        quarterly = self.df.groupby(['country_from', 'country_to', 'year', 'quarter'])['num_migrants'].mean().reset_index()
        quarterly['quarter_year'] = quarterly['year'].astype(str) + '-Q' + quarterly['quarter'].astype(str)
        quarterly = quarterly[['country_from', 'country_to', 'quarter_year', 'num_migrants']]
        quarterly.to_json(self.output_dir / "flows_country_to_country_quarterly.json", orient='records')
        
        return self.output_dir / "flows_country_to_country_quarterly.json"

    def generate_annual_totals(self):
        """Generate annual totals"""
        print("Generating annual aggregations...")
        
        # Country-to-country annual
        annual = self.df.groupby(['country_from', 'country_to', 'year'])['num_migrants'].sum().reset_index()
        annual.to_json(self.output_dir / "flows_country_to_country_annual.json", orient='records')
        
        # Region-to-region annual
        annual_region = self.df.dropna(subset=['region_from', 'region_to']).groupby(['region_from', 'region_to', 'year'])['num_migrants'].sum().reset_index()
        annual_region['region_from'] = annual_region['region_from'].map(lambda x: self.region_names.get(x, f"Region_{x}"))
        annual_region['region_to'] = annual_region['region_to'].map(lambda x: self.region_names.get(x, f"Region_{x}"))
        annual_region.to_json(self.output_dir / "flows_region_to_region_annual.json", orient='records')
        
        return self.output_dir / "flows_country_to_country_annual.json"


    def generate_seasonal_patterns(self):
        """Generate seasonal pattern analysis"""
        print("Generating seasonal patterns...")
        
        # Country-to-country by season
        seasonal = self.df.groupby(['country_from', 'country_to', 'season'])['num_migrants'].mean().reset_index()
        seasonal_pivot = seasonal.pivot(index=['country_from', 'country_to'], columns='season', values='num_migrants').reset_index()
        seasonal_pivot = seasonal_pivot.fillna(0)
        
        seasonal_pivot.to_json(self.output_dir / "flows_seasonal_patterns_country.json", orient='records')
        
        return self.output_dir / "flows_seasonal_patterns_country.json"

    def generate_rolling_averages(self):
        """Generate rolling averages and trend calculations"""
        print("Generating rolling averages...")
        
        # 3-month and 6-month rolling averages for major corridors
        corridor_data = []
        
        # Find top corridors first
        top_corridors = self.df.groupby(['country_from', 'country_to'])['num_migrants'].sum().nlargest(100).index
        
        for from_country, to_country in top_corridors:
            corridor_df = self.df[(self.df['country_from'] == from_country) & 
                                 (self.df['country_to'] == to_country)].sort_values('date')
            
            if len(corridor_df) >= 6:  # Need at least 6 months for 6-month rolling
                corridor_df['rolling_3m'] = corridor_df['num_migrants'].rolling(3).mean()
                corridor_df['rolling_6m'] = corridor_df['num_migrants'].rolling(6).mean()
                
                # Calculate trend (simple linear regression slope over last 12 months)
                if len(corridor_df) >= 12:
                    recent_data = corridor_df.tail(12)['num_migrants'].values
                    x = np.arange(len(recent_data))
                    slope = np.polyfit(x, recent_data, 1)[0]
                    corridor_df['trend_slope'] = slope
                else:
                    corridor_df['trend_slope'] = np.nan
                
                corridor_data.append(corridor_df[['country_from', 'country_to', 'migration_month', 
                                                'num_migrants', 'rolling_3m', 'rolling_6m', 'trend_slope']])
        
        if corridor_data:
            rolling_df = pd.concat(corridor_data, ignore_index=True)
            rolling_df.to_json(self.output_dir / "flows_rolling_averages_top100.json", orient='records', date_format='iso')
        
        return self.output_dir / "flows_rolling_averages_top100.json"

    # FLOW CALCULATIONS
    def generate_gross_flows(self):
        """Generate gross flows (total movement)"""
        print("Generating gross flow calculations...")
        
        # Already have gross flows in base data, but aggregate by different levels
        gross_annual = self.df.groupby(['country_from', 'country_to', 'year'])['num_migrants'].sum().reset_index()
        gross_annual.rename(columns={'num_migrants': 'gross_flow'}, inplace=True)
        gross_annual.to_json(self.output_dir / "flows_gross_annual_country.json", orient='records')
        
        return self.output_dir / "flows_gross_annual_country.json"

    def generate_net_flows(self):
        """Generate net flows (inbound minus outbound)"""
        print("Generating net flow calculations...")
        
        # Calculate net flows by swapping from/to and taking difference
        outbound = self.df.groupby(['country_from', 'country_to', 'year'])['num_migrants'].sum().reset_index()
        inbound = self.df.groupby(['country_to', 'country_from', 'year'])['num_migrants'].sum().reset_index()
        inbound.rename(columns={'country_to': 'country_from', 'country_from': 'country_to'}, inplace=True)
        
        # Merge and calculate net
        net_flows = outbound.merge(inbound, on=['country_from', 'country_to', 'year'], 
                                  how='outer', suffixes=('_out', '_in')).fillna(0)
        net_flows['net_flow'] = net_flows['num_migrants_in'] - net_flows['num_migrants_out']
        net_flows['gross_flow'] = net_flows['num_migrants_in'] + net_flows['num_migrants_out']
        
        result = net_flows[['country_from', 'country_to', 'year', 'net_flow', 'gross_flow']]
        result.to_json(self.output_dir / "flows_net_annual_country.json", orient='records')
        
        return self.output_dir / "flows_net_annual_country.json"

    def generate_corridor_rankings(self):
        """Generate corridor rankings and percentile distributions"""
        print("Generating corridor rankings...")
        
        # Annual corridor rankings
        annual_totals = self.df.groupby(['country_from', 'country_to', 'year'])['num_migrants'].sum().reset_index()
        
        rankings = []
        for year in annual_totals['year'].unique():
            year_data = annual_totals[annual_totals['year'] == year].copy()
            year_data['rank'] = year_data['num_migrants'].rank(method='dense', ascending=False)
            year_data['percentile'] = year_data['num_migrants'].rank(pct=True) * 100
            rankings.append(year_data)
        
        rankings_df = pd.concat(rankings, ignore_index=True)
        rankings_df.to_json(self.output_dir / "flows_corridor_rankings_annual.json", orient='records')
        
        return self.output_dir / "flows_corridor_rankings_annual.json"

    def generate_growth_rates(self):
        """Generate growth rates and velocity changes"""
        print("Generating growth rate calculations...")
        
        # Calculate year-over-year growth rates
        annual_flows = self.df.groupby(['country_from', 'country_to', 'year'])['num_migrants'].sum().reset_index()
        annual_flows = annual_flows.sort_values(['country_from', 'country_to', 'year'])
        
        # Calculate growth rates
        annual_flows['prev_year_flow'] = annual_flows.groupby(['country_from', 'country_to'])['num_migrants'].shift(1)
        annual_flows['growth_rate'] = ((annual_flows['num_migrants'] - annual_flows['prev_year_flow']) / 
                                      annual_flows['prev_year_flow'].replace(0, np.nan)) * 100
        
        # Calculate velocity (acceleration of growth rate)
        annual_flows['prev_growth_rate'] = annual_flows.groupby(['country_from', 'country_to'])['growth_rate'].shift(1)
        annual_flows['growth_velocity'] = annual_flows['growth_rate'] - annual_flows['prev_growth_rate']
        
        result = annual_flows[['country_from', 'country_to', 'year', 'num_migrants', 
                              'growth_rate', 'growth_velocity']].dropna(subset=['growth_rate'])
        result.to_json(self.output_dir / "flows_growth_rates_annual.json", orient='records')
        
        return self.output_dir / "flows_growth_rates_annual.json"

    def generate_all_variations(self):
        """Generate all data variations"""
        print("=" * 60)
        print("MIGRATION DATA TRANSFORMATION - GENERATING ALL VARIATIONS")
        print("=" * 60)
        
        generated_files = []
        
        # Spatial Aggregations
        print("\n1. SPATIAL AGGREGATIONS")
        print("-" * 25)
        generated_files.append(self.generate_country_to_country())
        generated_files.append(self.generate_region_to_country())
        generated_files.append(self.generate_country_to_region())
        generated_files.append(self.generate_region_to_region())
        generated_files.append(self.generate_subregional_clustering())
        
        # Temporal Aggregations
        print("\n2. TEMPORAL AGGREGATIONS")
        print("-" * 25)
        generated_files.append(self.generate_quarterly_averages())
        generated_files.append(self.generate_annual_totals())
        generated_files.append(self.generate_seasonal_patterns())
        generated_files.append(self.generate_rolling_averages())
        
        # Flow Calculations
        print("\n3. FLOW CALCULATIONS")
        print("-" * 20)
        generated_files.append(self.generate_gross_flows())
        generated_files.append(self.generate_net_flows())
        generated_files.append(self.generate_corridor_rankings())
        generated_files.append(self.generate_growth_rates())
        
        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        print(f"Generated {len(generated_files)} variation files:")
        for i, file_path in enumerate(generated_files, 1):
            file_size = file_path.stat().st_size / 1024  # KB
            print(f"{i:2d}. {file_path.name} ({file_size:.1f} KB)")
        
        print(f"\nAll files saved to: {self.output_dir}")
        print("=" * 60)

if __name__ == "__main__":
    # Initialize processor
    processor = MigrationDataProcessor()
    
    # Generate all variations
    processor.generate_all_variations()
