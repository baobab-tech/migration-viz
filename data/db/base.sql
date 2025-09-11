
-- Base table setup
DROP TABLE IF EXISTS migration_flows CASCADE; -- careful this will drop materialized views too
CREATE TABLE migration_flows (
    id SERIAL PRIMARY KEY,
    country_from VARCHAR(2),
    country_to VARCHAR(2),
    migration_month DATE,
    num_migrants INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Regional mappings table
DROP TABLE IF EXISTS m49_regions CASCADE; -- careful this will drop materialized views too
CREATE TABLE m49_regions (
    iso2_code VARCHAR(2) PRIMARY KEY,
    country_name TEXT,
    region_code INTEGER,
    region_name TEXT,
    subregion_code INTEGER,
    subregion_name TEXT,
    intermediate_region_code INTEGER,
    intermediate_region_name TEXT
);