import { createClient } from '@/utils/supabase/server'
import type { MigrationFilters } from '@/lib/queries'

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
 * Convert partial dates (YYYY-MM) to full dates (YYYY-MM-01)
 * Since monthly data is stored with 1st day of month
 */
function normalizeDate(dateStr: string): string {
    if (!dateStr) return dateStr

    // If already a full date (YYYY-MM-DD), return as is
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateStr
    }

    // If partial date (YYYY-MM), add -01 for first day of month
    if (dateStr.match(/^\d{4}-\d{2}$/)) {
        return `${dateStr}-01`
    }

    // Return as-is for other formats
    return dateStr
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
 * Server-side function to get monthly totals using efficient RPC function
 */
export async function getMonthlyTotalsServer(filters: MigrationFilters = {}): Promise<{ month: string; total: number }[]> {
    try {
        const supabase = await createClient()
        const startDate = filters.dateRange?.[0] ? normalizeDate(filters.dateRange[0]) : '2019-01-01'
        const endDate = filters.dateRange?.[1] ? normalizeDate(filters.dateRange[1]) : '2022-12-31'

        const { data, error } = await supabase.rpc('get_monthly_migration_totals', {
            p_start_date: startDate,
            p_end_date: endDate,
            p_regions: filters.selectedRegions?.length ? filters.selectedRegions : null,
            p_countries: filters.selectedCountries?.length ? filters.selectedCountries : null,
            p_excluded_countries: filters.excludedCountries?.length ? filters.excludedCountries : null,
            p_excluded_regions: filters.excludedRegions?.length ? filters.excludedRegions : null,
            p_min_flow: filters.minFlowSize ?? 0,
            p_max_flow: filters.maxFlowSize ?? null,
            p_period: filters.period === 'all' ? 'all' : (filters.period ?? 'all')
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
    avgMonthlyFlow: number
}> {
    try {
        const supabase = await createClient()
        const startDate = filters.dateRange?.[0] ? normalizeDate(filters.dateRange[0]) : '2019-01-01'
        const endDate = filters.dateRange?.[1] ? normalizeDate(filters.dateRange[1]) : '2022-12-31'

        const { data, error } = await supabase.rpc('get_dashboard_summary', {
            p_start_date: startDate,
            p_end_date: endDate,
            p_regions: filters.selectedRegions?.length ? filters.selectedRegions : null,
            p_countries: filters.selectedCountries?.length ? filters.selectedCountries : null,
            p_excluded_countries: filters.excludedCountries?.length ? filters.excludedCountries : null,
            p_excluded_regions: filters.excludedRegions?.length ? filters.excludedRegions : null,
            p_min_flow: filters.minFlowSize ?? 0,
            p_max_flow: filters.maxFlowSize ?? null,
            p_period: filters.period === 'all' ? 'all' : (filters.period ?? 'all')
        })

        if (error) {
            console.error('Error calling get_dashboard_summary RPC:', error)
            throw new Error(`RPC call failed: ${error.message}`)
        }

        if (!data || data.length === 0) {
            return { totalFlows: 0, uniqueCorridors: 0, activeMonths: 0, avgMonthlyFlow: 0 }
        }

        const summary = data[0]

        return {
            totalFlows: Number(summary.total_flows) || 0,
            uniqueCorridors: Number(summary.unique_corridors) || 0,
            activeMonths: Number(summary.active_months) || 0,
            avgMonthlyFlow: Number(summary.avg_monthly_flow) || 0
        }
    } catch (error) {
        console.error('Error in getDashboardSummaryServer:', error)

        return { totalFlows: 0, uniqueCorridors: 0, activeMonths: 0, avgMonthlyFlow: 0 }
    }
}

/**
 * Server-side function to get top corridors
 */
export async function getTopCorridorsServer(filters: MigrationFilters = {}, limit: number = 10): Promise<{ corridor: string; total: number; countryA: string; countryB: string; displayName: string }[]> {
    try {
        const supabase = await createClient()
        const startDate = filters.dateRange?.[0] ? normalizeDate(filters.dateRange[0]) : '2019-01-01'
        const endDate = filters.dateRange?.[1] ? normalizeDate(filters.dateRange[1]) : '2022-12-31'

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
        
        return data.map((row: { corridor: string; total_migrants: number; country_from: string; country_to: string }) => {
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
        const endDate = filters.dateRange?.[1] ? normalizeDate(filters.dateRange[1]) : '2022-12-31'
        
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
            p_period: filters.period === 'all' ? 'all' : (filters.period ?? 'all')
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

    // Period
    const period = searchParams.get('period')
    if (period === 'pre_pandemic' || period === 'pandemic') {
        filters.period = period
    }

    return filters
}
