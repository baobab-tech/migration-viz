import { createClient } from '@/utils/supabase/server'
import type { MigrationFilters } from '@/lib/types'
import { normalizeDate } from './utils'

// Cache for country names to avoid repeated DB calls
let countryNameCache: Map<string, string> | null = null

/**
 * Server-side function to get country name mapping
 */
async function getCountryNameMapping(): Promise<Map<string, string>> {
    if (countryNameCache) {
        return countryNameCache
    }

    try {
        const regions = await getM49RegionsServer()
        countryNameCache = new Map()
        
        regions.forEach(region => {
            if (countryNameCache) {
                countryNameCache.set(region.iso2_code, region.country_name)
            }
        })
        
        return countryNameCache
    } catch (error) {
        console.error('Error loading country name mapping:', error)
        
        return new Map()
    }
}



/**
 * Server-side function to get country name mappings for labels
 */
export async function getCountryNameMappingsServer(): Promise<Record<string, string>> {
    try {
        const supabase = await createClient()
        const { data, error } = await supabase
            .from('m49_regions')
            .select('iso2_code, country_name')
            .not('iso2_code', 'is', null)
            .order('iso2_code')

        if (error) {
            console.error('Error fetching country name mappings:', error)
            throw new Error(`Failed to fetch country names: ${error.message}`)
        }

        if (!data) return {}

        // Convert array to object for fast lookups
        return data.reduce((acc: Record<string, string>, row) => {
            if (row.iso2_code && row.country_name) {
                acc[row.iso2_code] = row.country_name
            }

            return acc
        }, {})

    } catch (error) {
        console.error('Error in getCountryNameMappingsServer:', error)
        
        return {}
    }
}

/**
 * Server-side function to get M49 regions data
 */
export async function getM49RegionsServer(): Promise<Array<{
    iso2_code: string
    country_name: string
    region_name: string
    subregion_name: string
    intermediate_region_name: string
}>> {
    try {
        const supabase = await createClient()
        const { data, error } = await supabase
            .from('m49_regions')
            .select('iso2_code, country_name, region_name, subregion_name, intermediate_region_name')

        if (error) {
            console.error('Error fetching M49 regions:', error)
            throw new Error(`Failed to fetch M49 regions: ${error.message}`)
        }

        return data || []
    } catch (error) {
        console.error('Error in getM49RegionsServer:', error)

        return []
    }
}

/**
 * Server-side function to get totals using efficient RPC function (supports monthly, quarterly, yearly)
 */
export async function getMonthlyTotalsServer(filters: MigrationFilters = {}): Promise<{ month: string; total: number }[]> {
    try {
        const supabase = await createClient()
        const startDate = filters.dateRange?.[0] ? normalizeDate(filters.dateRange[0]) : '2019-01-01'
        const endDate = filters.dateRange?.[1] ? normalizeDate(filters.dateRange[1], true) : '2022-12-31'

        const { data, error } = await supabase.rpc('get_monthly_migration_totals', {
            p_start_date: startDate,
            p_end_date: endDate,
            p_regions: filters.selectedRegions?.length ? filters.selectedRegions : null,
            p_countries: filters.selectedCountries?.length ? filters.selectedCountries : null,
            p_excluded_countries: filters.excludedCountries?.length ? filters.excludedCountries : null,
            p_excluded_regions: filters.excludedRegions?.length ? filters.excludedRegions : null,
            p_min_flow: filters.minFlowSize ?? 0,
            p_max_flow: filters.maxFlowSize ?? null,
            p_period: filters.period === 'all' ? 'all' : (filters.period ?? 'all'),
            p_time_aggregation: filters.timeAggregation ?? 'monthly'
        })

        if (error) {
            console.error('Error calling get_monthly_migration_totals RPC:', error)
            throw new Error(`RPC call failed: ${error.message}`)
        }

        if (!data) return []

        return data.map((row: { month: string; total_migrants: number }) => ({
            month: row.month,
            total: Number(row.total_migrants)
        }))
    } catch (error) {
        console.error('Error in getMonthlyTotalsServer:', error)

        return []
    }
}

/**
 * Server-side function to get dashboard summary statistics
 */
export async function getDashboardSummaryServer(filters: MigrationFilters = {}): Promise<{
    totalFlows: number
    uniqueCorridors: number
    activeMonths: number
    avgPeriodFlow: number
}> {
    try {
        const supabase = await createClient()
        const startDate = filters.dateRange?.[0] ? normalizeDate(filters.dateRange[0]) : '2019-01-01'
        const endDate = filters.dateRange?.[1] ? normalizeDate(filters.dateRange[1], true) : '2022-12-31'

        const { data, error } = await supabase.rpc('get_dashboard_summary', {
            p_start_date: startDate,
            p_end_date: endDate,
            p_regions: filters.selectedRegions?.length ? filters.selectedRegions : null,
            p_countries: filters.selectedCountries?.length ? filters.selectedCountries : null,
            p_excluded_countries: filters.excludedCountries?.length ? filters.excludedCountries : null,
            p_excluded_regions: filters.excludedRegions?.length ? filters.excludedRegions : null,
            p_min_flow: filters.minFlowSize ?? 0,
            p_max_flow: filters.maxFlowSize ?? null,
            p_period: filters.period === 'all' ? 'all' : (filters.period ?? 'all'),
            p_time_aggregation: filters.timeAggregation ?? 'monthly'
        })

        if (error) {
            console.error('Error calling get_dashboard_summary RPC:', error)
            throw new Error(`RPC call failed: ${error.message}`)
        }

        if (!data || data.length === 0) {
            return { totalFlows: 0, uniqueCorridors: 0, activeMonths: 0, avgPeriodFlow: 0 }
        }

        const summary = data[0]

        return {
            totalFlows: Number(summary.total_flows) || 0,
            uniqueCorridors: Number(summary.unique_corridors) || 0,
            activeMonths: Number(summary.active_periods) || 0,
            avgPeriodFlow: Number(summary.avg_period_flow) || 0
        }
    } catch (error) {
        console.error('Error in getDashboardSummaryServer:', error)

        return { totalFlows: 0, uniqueCorridors: 0, activeMonths: 0, avgPeriodFlow: 0 }
    }
}

/**
 * Server-side function to get top corridors
 */
export async function getTopCorridorsServer(filters: MigrationFilters = {}, limit: number = 10): Promise<{ corridor: string; total: number; countryA: string; countryB: string; displayName: string }[]> {
    try {
        const supabase = await createClient()
        const startDate = filters.dateRange?.[0] ? normalizeDate(filters.dateRange[0]) : '2019-01-01'
        const endDate = filters.dateRange?.[1] ? normalizeDate(filters.dateRange[1], true) : '2022-12-31'

        const { data, error } = await supabase.rpc('get_filtered_top_corridors', {
            p_start_date: startDate,
            p_end_date: endDate,
            p_regions: filters.selectedRegions?.length ? filters.selectedRegions : null,
            p_countries: filters.selectedCountries?.length ? filters.selectedCountries : null,
            p_excluded_countries: filters.excludedCountries?.length ? filters.excludedCountries : null,
            p_excluded_regions: filters.excludedRegions?.length ? filters.excludedRegions : null,
            p_min_flow: filters.minFlowSize ?? 0,
            p_max_flow: filters.maxFlowSize ?? null,
            p_period: filters.period === 'all' ? 'all' : (filters.period ?? 'all'),
            p_limit: limit
        })

        if (error) {
            console.error('Error calling get_filtered_top_corridors RPC:', error)
            throw new Error(`RPC call failed: ${error.message}`)
        }

        if (!data) return []

        // Get country name mapping for display names
        const mapping = await getCountryNameMapping()
        
        const result = data.map((row: { corridor: string; total_migrants: number; country_from: string; country_to: string }) => {
            const fromName = mapping.get(row.country_from) || row.country_from
            const toName = mapping.get(row.country_to) || row.country_to
            const displayName = `${fromName} → ${toName}`

            return {
                corridor: row.corridor,
                total: Number(row.total_migrants),
                countryA: row.country_from,
                countryB: row.country_to,
                displayName
            }
        })
        
        return result
    } catch (error) {
        console.error('Error in getTopCorridorsServer:', error)

        return []
    }
}

/**
 * Server-side function to get corridor time series data
 */
export async function getCorridorTimeSeriesServer(
    corridors: string[], 
    filters: MigrationFilters = {}
): Promise<{ corridor: string; countryA: string; countryB: string; month: string; migrants: number }[]> {
    try {
        const supabase = await createClient()
        const startDate = filters.dateRange?.[0] ? normalizeDate(filters.dateRange[0]) : '2019-01-01'
        const endDate = filters.dateRange?.[1] ? normalizeDate(filters.dateRange[1], true) : '2022-12-31'
        
        const { data, error } = await supabase.rpc('get_corridor_time_series', {
            p_corridors: corridors.length > 0 ? corridors : null,
            p_start_date: startDate,
            p_end_date: endDate,
            p_regions: filters.selectedRegions?.length ? filters.selectedRegions : null,
            p_countries: filters.selectedCountries?.length ? filters.selectedCountries : null,
            p_excluded_countries: filters.excludedCountries?.length ? filters.excludedCountries : null,
            p_excluded_regions: filters.excludedRegions?.length ? filters.excludedRegions : null,
            p_min_flow: filters.minFlowSize ?? 0,
            p_max_flow: filters.maxFlowSize ?? null,
            p_period: filters.period === 'all' ? 'all' : (filters.period ?? 'all'),
            p_time_aggregation: filters.timeAggregation ?? 'monthly'
        })

        if (error) {
            console.error('Error calling get_corridor_time_series RPC:', error)
            throw new Error(`RPC call failed: ${error.message}`)
        }

        if (!data) return []

        return data.map((row: { corridor: string; country_from: string; country_to: string; month: string; migrants: number }) => ({
            corridor: row.corridor,
            countryA: row.country_from,
            countryB: row.country_to,
            month: row.month,
            migrants: Number(row.migrants)
        }))
    } catch (error) {
        console.error('Error in getCorridorTimeSeriesServer:', error)
        
        return []
    }
}

/**
 * Convert URL search parameters to MigrationFilters
 */
export function searchParamsToFilters(searchParams: URLSearchParams): MigrationFilters {
    const filters: MigrationFilters = {}

    // Date range
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    if (startDate && endDate) {
        filters.dateRange = [startDate, endDate]
    }

    // Regions
    const regions = searchParams.get('regions')
    if (regions) {
        filters.selectedRegions = regions.split(',').filter(Boolean)
    }

    // Countries
    const countries = searchParams.get('countries')
    if (countries) {
        filters.selectedCountries = countries.split(',').filter(Boolean)
    }

    // Flow size limits
    const minFlow = searchParams.get('min_flow')
    if (minFlow) {
        filters.minFlowSize = Number(minFlow)
    }

    const maxFlow = searchParams.get('max_flow')
    if (maxFlow) {
        filters.maxFlowSize = Number(maxFlow)
    }

    // Excluded countries/regions
    const excludedCountries = searchParams.get('excluded_countries')
    if (excludedCountries) {
        filters.excludedCountries = excludedCountries.split(',').filter(Boolean)
    }

    const excludedRegions = searchParams.get('excluded_regions')
    if (excludedRegions) {
        filters.excludedRegions = excludedRegions.split(',').filter(Boolean)
    }

    // Flow direction
    const flowDirection = searchParams.get('flow_direction')
    if (flowDirection === 'inbound' || flowDirection === 'outbound') {
        filters.flowDirection = flowDirection
    }

    // Time aggregation
    const timeAggregation = searchParams.get('time_aggregation')
    if (timeAggregation === 'monthly' || timeAggregation === 'quarterly' || timeAggregation === 'yearly') {
        filters.timeAggregation = timeAggregation
    }

    return filters
}

/**
 * Server-side function to get quarterly migration data
 */
export async function getQuarterlyDataServer(filters: MigrationFilters = {}): Promise<{ month: string; total: number; season: string; quarter: number }[]> {
    try {
        const supabase = await createClient()
        const startDate = filters.dateRange?.[0] ? normalizeDate(filters.dateRange[0]) : '2019-01-01'
        const endDate = filters.dateRange?.[1] ? normalizeDate(filters.dateRange[1], true) : '2022-12-31'
        
        const { data, error } = await supabase.rpc('get_quarterly_migration_data', {
            p_start_date: startDate,
            p_end_date: endDate,
            p_regions: filters.selectedRegions?.length ? filters.selectedRegions : null,
            p_countries: filters.selectedCountries?.length ? filters.selectedCountries : null,
            p_excluded_countries: filters.excludedCountries?.length ? filters.excludedCountries : null,
            p_excluded_regions: filters.excludedRegions?.length ? filters.excludedRegions : null,
            p_min_flow: filters.minFlowSize ?? 0,
            p_max_flow: filters.maxFlowSize ?? null,
            p_time_aggregation: filters.timeAggregation ?? 'monthly'
        })

        if (error) {
            console.error('Error calling get_quarterly_migration_data RPC:', error)
            throw new Error(`RPC call failed: ${error.message}`)
        }

        if (!data) return []

        return data.map((row: { month: string; total: number; season: string; quarter: number }) => ({
            month: row.month,
            total: Number(row.total) || 0,
            season: row.season,
            quarter: Number(row.quarter) || 1
        }))
    } catch (error) {
        console.error('Error in getQuarterlyDataServer:', error)
        
        return []
    }
}

/**
 * Server-side function to get seasonal patterns data
 */
export async function getSeasonalPatternsServer(filters: MigrationFilters = {}): Promise<{ month: string; average: number; max: number; min: number }[]> {
    try {
        const supabase = await createClient()
        const startDate = filters.dateRange?.[0] ? normalizeDate(filters.dateRange[0]) : '2019-01-01'
        const endDate = filters.dateRange?.[1] ? normalizeDate(filters.dateRange[1], true) : '2022-12-31'
        
        const { data, error } = await supabase.rpc('get_seasonal_migration_patterns', {
            p_start_date: startDate,
            p_end_date: endDate,
            p_regions: filters.selectedRegions?.length ? filters.selectedRegions : null,
            p_countries: filters.selectedCountries?.length ? filters.selectedCountries : null,
            p_excluded_countries: filters.excludedCountries?.length ? filters.excludedCountries : null,
            p_excluded_regions: filters.excludedRegions?.length ? filters.excludedRegions : null,
            p_min_flow: filters.minFlowSize ?? 0,
            p_max_flow: filters.maxFlowSize ?? null,
            p_time_aggregation: filters.timeAggregation ?? 'monthly'
        })

        if (error) {
            console.error('Error calling get_seasonal_migration_patterns RPC:', error)
            throw new Error(`RPC call failed: ${error.message}`)
        }

        if (!data) return []

        return data.map((row: { month: string; average: number; max_value: number; min_value: number }) => ({
            month: row.month,
            average: Number(row.average) || 0,
            max: Number(row.max_value) || 0,
            min: Number(row.min_value) || 0
        }))
    } catch (error) {
        console.error('Error in getSeasonalPatternsServer:', error)
        
        return []
    }
}

/**
 * Server-side function to get available countries for corridor selection
 */
export async function getCorridorCountriesServer(): Promise<{
    iso2Code: string;
    countryName: string;
    regionName: string;
    hasOutboundFlows: boolean;
    hasInboundFlows: boolean;
    totalFlowVolume: number;
}[]> {
    try {
        const supabase = await createClient()
        
        const { data, error } = await supabase.rpc('get_corridor_countries')

        if (error) {
            console.error('Error calling get_corridor_countries RPC:', error)
            throw new Error(`RPC call failed: ${error.message}`)
        }

        if (!data) return []

        return data.map((row: { 
            iso2_code: string;
            country_name: string;
            region_name: string;
            has_outbound_flows: boolean;
            has_inbound_flows: boolean;
            total_flow_volume: number;
        }) => ({
            iso2Code: row.iso2_code,
            countryName: row.country_name,
            regionName: row.region_name,
            hasOutboundFlows: row.has_outbound_flows,
            hasInboundFlows: row.has_inbound_flows,
            totalFlowVolume: Number(row.total_flow_volume) || 0
        }))
    } catch (error) {
        console.error('Error in getCorridorCountriesServer:', error)
        
        return []
    }
}

/**
 * Server-side function to get enhanced corridor sankey data supporting multiple origins/destinations and regions
 */
export async function getEnhancedCorridorSankeyDataServer(
    fromCountries: string[] = [],
    toCountries: string[] = [],
    fromRegions: string[] = [],
    toRegions: string[] = [],
    dateRange: [string, string] = ['2019-01', '2022-12'],
    limit: number = 20
): Promise<{ countryFrom: string; countryTo: string; countryFromName: string; countryToName: string; totalMigrants: number }[]> {
    try {
        // If no selections made, return empty array (let UI show empty state)
        const hasSelections = fromCountries.length > 0 || toCountries.length > 0 || fromRegions.length > 0 || toRegions.length > 0
        if (!hasSelections) {
            return []
        }

        const supabase = await createClient()
        const startDate = normalizeDate(dateRange[0])
        const endDate = normalizeDate(dateRange[1], true)
        
        // Use the new enhanced corridor sankey function that handles separate FROM and TO arrays
        const { data, error } = await supabase.rpc('get_enhanced_corridor_sankey_data', {
            p_from_countries: fromCountries.length > 0 ? fromCountries : null,
            p_to_countries: toCountries.length > 0 ? toCountries : null,
            p_from_regions: fromRegions.length > 0 ? fromRegions : null,
            p_to_regions: toRegions.length > 0 ? toRegions : null,
            p_start_date: startDate,
            p_end_date: endDate,
            p_limit: limit
        })

        if (error) {
            console.error('Error calling get_enhanced_corridor_sankey_data RPC:', error)
            throw new Error(`RPC call failed: ${error.message}`)
        }

        if (!data) return []

        // Data is already properly filtered and includes country names
        return data.map((row: { 
            country_from: string; 
            country_to: string; 
            country_from_name: string;
            country_to_name: string;
            total_migrants: number 
        }) => ({
            countryFrom: row.country_from,
            countryTo: row.country_to,
            countryFromName: row.country_from_name,
            countryToName: row.country_to_name,
            totalMigrants: Number(row.total_migrants) || 0
        }))
    } catch (error) {
        console.error('Error in getEnhancedCorridorSankeyDataServer:', error)
        
        return []
    }
}

/**
 * Server-side function to get enhanced corridor timeline data supporting multiple origins/destinations and regions
 */
export async function getEnhancedCorridorTimelineDataServer(
    fromCountries: string[] = [],
    toCountries: string[] = [],
    fromRegions: string[] = [],
    _toRegions: string[] = [],
    dateRange: [string, string] = ['2019-01', '2022-12'],
    timeAggregation: 'monthly' | 'quarterly' | 'yearly' = 'yearly'
): Promise<{ corridor: string; countryFrom: string; countryTo: string; month: string; migrants: number }[]> {
    try {
        // If no selections made, return empty array (let UI show empty state)
        const hasSelections = fromCountries.length > 0 || toCountries.length > 0 || fromRegions.length > 0
        if (!hasSelections) {
            return []
        }

        const supabase = await createClient()
        const startDate = normalizeDate(dateRange[0])
        const endDate = normalizeDate(dateRange[1], true)
        
        // Use monthly migration totals for timeline data
        const { data, error } = await supabase.rpc('get_monthly_migration_totals', {
            p_start_date: startDate,
            p_end_date: endDate,
            p_regions: fromRegions.length > 0 ? fromRegions : null,
            p_countries: fromCountries.length > 0 || toCountries.length > 0 ? [...fromCountries, ...toCountries].filter(Boolean) : null,
            p_excluded_countries: null,
            p_excluded_regions: null,
            p_min_flow: 0,
            p_max_flow: null,
            p_period: 'all',
            p_time_aggregation: timeAggregation
        })

        if (error) {
            console.error('Error calling get_monthly_migration_totals RPC:', error)
            throw new Error(`RPC call failed: ${error.message}`)
        }

        if (!data) return []

        // Transform the aggregated data into corridor format for the timeline chart
        return data.map((row: { month: string; total_migrants: number }) => ({
            corridor: 'Selected Flow',
            countryFrom: fromCountries.length > 0 ? fromCountries[0] : 'Multiple',
            countryTo: toCountries.length > 0 ? toCountries[0] : 'Multiple',
            month: row.month,
            migrants: Number(row.total_migrants) || 0
        }))
    } catch (error) {
        console.error('Error in getEnhancedCorridorTimelineDataServer:', error)
        
        return []
    }
}
