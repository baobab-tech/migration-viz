#!/usr/bin/env python3
"""
Convert migration month values to database-compatible date format.

This script reads the original migration flow CSV and converts the migration_month
column from "YYYY-MM" format to proper datetime "YYYY-MM-01" format for database compatibility.

Usage:
    python scripts/convert_dates_for_db.py
"""

import pandas as pd
from pathlib import Path
import sys
from datetime import datetime

def convert_migration_dates():
    """Convert migration month values to proper date format."""
    
    # Define paths
    script_dir = Path(__file__)
    project_root = script_dir.parent
    original_file = project_root / "original" / "international_migration_flow.csv"
    output_file = project_root / "processed" / "international_migration_flow_db_ready.csv"
    
    # Check if original file exists
    if not original_file.exists():
        print(f"Error: Original file not found at {original_file}")
        print("Please download the original data from:")
        print("https://data.humdata.org/dataset/e09595bd-f4c5-4a66-8130-5a05f14d5e64/resource/67b2d6fc-ff4f-4d04-a75e-80e3de81b072/download/international_migration_flow.csv")
        return False
    
    try:
        print(f"Reading original data from: {original_file}")
        print("This may take a moment for large files...")
        
        # Read the CSV file
        df = pd.read_csv(original_file)
        
        print(f"Loaded {len(df):,} records")
        print(f"Original columns: {list(df.columns)}")
        
        # Check if migration_month column exists
        if 'migration_month' not in df.columns:
            print("Error: 'migration_month' column not found in the data")
            return False
        
        # Display sample of original data
        print("\nSample of original data:")
        print(df[['country_from', 'country_to', 'migration_month', 'num_migrants']].head())
        
        # Convert migration_month from "YYYY-MM" to "YYYY-MM-01" format
        print("\nConverting migration_month to date format...")
        
        # Add "-01" to make it the first day of each month
        df['migration_month'] = df['migration_month'].astype(str) + '-01'
        
        # Convert to proper datetime format
        df['migration_month'] = pd.to_datetime(df['migration_month'], format='%Y-%m-%d')
        
        # Verify the conversion
        print("\nSample of converted data:")
        print(df[['country_from', 'country_to', 'migration_month', 'num_migrants']].head())
        
        # Use the dataframe with converted migration_month column
        df_output = df.copy()
        
        # Ensure output directory exists
        output_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Save to processed directory
        print(f"\nSaving processed data to: {output_file}")
        df_output.to_csv(output_file, index=False)
        
        print(f"✅ Successfully converted {len(df_output):,} records")
        print(f"✅ Output saved to: {output_file}")
        
        # Display final sample
        print("\nFinal output sample:")
        print(df_output.head())
        
        # Display date range
        min_date = df_output['migration_month'].min()
        max_date = df_output['migration_month'].max()
        print(f"\nDate range: {min_date.strftime('%Y-%m-%d')} to {max_date.strftime('%Y-%m-%d')}")
        
        return True
        
    except Exception as e:
        print(f"Error processing data: {str(e)}")
        return False

def main():
    """Main function to run the conversion."""
    print("Migration Data - Date Conversion for Database Import")
    print("=" * 55)
    
    success = convert_migration_dates()
    
    if success:
        print("\n🎉 Date conversion completed successfully!")
        print("\nThe processed file is ready for database import with proper date columns.")
    else:
        print("\n❌ Date conversion failed. Please check the errors above.")
        sys.exit(1)

if __name__ == "__main__":
    main()
