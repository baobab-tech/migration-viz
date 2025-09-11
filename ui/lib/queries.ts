import { createClient } from '@/utils/supabase/client'
import { Database, Tables } from '@/lib/db_generated_types'

// Type aliases for better readability
type MigrationFlowMonthly = Tables<'flows_country_to_country_monthly'>
type TopMigrationCorridors = Tables<'top_migration_corridors'>
type CountryMigrationSummary = Tables<'country_migration_summary'>
type PandemicComparison = Tables<'flows_pandemic_comparison_country'>
type SeasonalPatterns = Tables<'flows_seasonal_patterns_country'>
type CorridorRankings = Tables<'flows_corridor_rankings_annual'>

// Compatible interface with existing MigrationFlow
export interface MigrationFlow {
    countryA: string
    countryB: string
    number: number
    month: string
    region: string
}

// Extended filter interface matching the UI
export interface MigrationFilters {
    dateRange?: [string, string]
    selectedRegions?: string[]
    selectedCountries?: string[]
    minFlowSize?: number
    maxFlowSize?: number
    excludedCountries?: string[]
    excludedRegions?: string[]
    flowDirection?: 'all' | 'inbound' | 'outbound'
    period?: 'all' | 'pre_pandemic' | 'pandemic'
    limit?: number
}

// Get Supabase client
const supabase = createClient()

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

// Synchronous countries array for backward compatibility
export const countries: Array<{ code: string; name: string; region: string; lat?: number; lng?: number }> = []

// Cache loading state
let cacheLoaded = false
let loadPromise: Promise<void> | null = null

// Sample coordinates for major countries (same as original)
const countryCoordinates: Record<string, { lat: number; lng: number }> = {
    'GB': { lat: 55.3781, lng: -3.436 },
    'BE': { lat: 50.5039, lng: 4.4699 },
    'DE': { lat: 51.1657, lng: 10.4515 },
    'FR': { lat: 46.2276, lng: 2.2137 },
    'ES': { lat: 40.4637, lng: -3.7492 },
    'IT': { lat: 41.8719, lng: 12.5674 },
    'US': { lat: 37.0902, lng: -95.7129 },
    'CA': { lat: 56.1304, lng: -106.3468 },
    'AU': { lat: -25.2744, lng: 133.7751 },
    'JP': { lat: 36.2048, lng: 138.2529 },
    'CN': { lat: 35.8617, lng: 104.1954 },
    'IN': { lat: 20.5937, lng: 78.9629 },
    'BR': { lat: -14.235, lng: -51.9253 },
    'MX': { lat: 23.6345, lng: -102.5528 },
    'ZA': { lat: -30.5595, lng: 22.9375 },
    'NG': { lat: 9.082, lng: 8.6753 },
    'EG': { lat: 26.0975, lng: 31.2357 },
    'TR': { lat: 38.9637, lng: 35.2433 },
    'RU': { lat: 61.524, lng: 105.3188 },
    'SA': { lat: 23.8859, lng: 45.0792 }
}

// Country names now come directly from the database m49_regions.country_name field

/**
 * Get M49 regions data for country/region mapping
 */
export async function getM49Regions(): Promise<any[]> {
    try {
        const { data, error } = await supabase
            .from('m49_regions')
            .select('iso2_code, country_name, region_name, subregion_name, intermediate_region_name')

        if (error) {
            console.error('Error fetching M49 regions:', error)
            throw new Error(`Failed to fetch M49 regions: ${error.message}`)
        }

        return data || []

    } catch (error) {
        console.error('Error in getM49Regions:', error)

        return []
    }
}

/**
 * Load and cache countries data from M49 regions
 */
export async function loadCountriesData(): Promise<void> {
    if (cacheLoaded) return
    if (loadPromise) {
        await loadPromise

        return
    }

    loadPromise = (async () => {
        try {
            const regions = await getM49Regions()
            countries.length = 0 // Clear existing array
            countries.push(...regions.map(region => {
                const coords = countryCoordinates[region.iso2_code]

                return {
                    code: region.iso2_code,
                    name: region.country_name || region.iso2_code, // Use database country names
                    region: region.region_name || 'Unknown',
                    ...(coords && { lat: coords.lat, lng: coords.lng })
                }
            }))
            cacheLoaded = true
        } catch (error) {
            console.error('Error loading countries data:', error)
            // Fallback to some basic data if needed
        }
    })()

    await loadPromise
}

/**
 * Initialize countries data (should be called early in the app)
 */
export const initializeCountriesData = loadCountriesData

/**
 * Helper function to get country code (just returns the 2-letter code)
 */
export function getCountryName(code: string): string {
    return code
}

/**
 * Get country region
 */
export function getCountryRegion(code: string): string {
    const country = countries.find(c => c.code === code)

    return country ? country.region : 'Unknown'
}

/**
 * Get available regions from loaded countries data
 */
export function getAvailableRegions(): string[] {
    const regions = new Set<string>()
    countries.forEach(country => {
        if (country.region && country.region !== 'Unknown') {
            regions.add(country.region)
        }
    })

    return Array.from(regions).sort()
}

/**
 * Load migration data from Supabase with optional filters
 * Replaces the old generateMigrationData() function
 */
export async function getMigrationFlows(filters: MigrationFilters = {}): Promise<MigrationFlow[]> {
    try {
        let query = supabase
            .from('flows_country_to_country_monthly')
            .select(`
        country_from,
        country_to,
        migration_month,
        num_migrants,
        region_from,
        region_to,
        period,
        year,
        month
      `)

        // Apply filters - ensure dates are in proper format
        if (filters.dateRange && filters.dateRange.length === 2) {
            // Convert partial dates (YYYY-MM) to full dates (YYYY-MM-01)
            const startDate = normalizeDate(filters.dateRange[0])
            const endDate = normalizeDate(filters.dateRange[1])
            
            query = query
                .gte('migration_month', startDate)
                .lte('migration_month', endDate)
        }

        if (filters.selectedRegions && filters.selectedRegions.length > 0) {
            query = query.in('region_from', filters.selectedRegions)
        }

        if (filters.selectedCountries && filters.selectedCountries.length > 0) {
            query = query.or(`country_from.in.(${filters.selectedCountries.join(',')}),country_to.in.(${filters.selectedCountries.join(',')})`)
        }

        if (filters.excludedCountries && filters.excludedCountries.length > 0) {
            query = query
                .not('country_from', 'in', `(${filters.excludedCountries.join(',')})`)
                .not('country_to', 'in', `(${filters.excludedCountries.join(',')})`)
        }

        if (filters.excludedRegions && filters.excludedRegions.length > 0) {
            query = query.not('region_from', 'in', `(${filters.excludedRegions.join(',')})`)
        }

        if (filters.minFlowSize !== undefined) {
            query = query.gte('num_migrants', filters.minFlowSize)
        }

        if (filters.maxFlowSize !== undefined) {
            query = query.lte('num_migrants', filters.maxFlowSize)
        }

        if (filters.period && filters.period !== 'all') {
            query = query.eq('period', filters.period)
        }

        // Apply flow direction filter
        if (filters.flowDirection === 'inbound' && filters.selectedCountries && filters.selectedCountries.length > 0) {
            query = query.in('country_to', filters.selectedCountries)
        } else if (filters.flowDirection === 'outbound' && filters.selectedCountries && filters.selectedCountries.length > 0) {
            query = query.in('country_from', filters.selectedCountries)
        }

        // Apply limit if specified (for performance)
        if (filters.limit) {
            query = query.limit(filters.limit)
        }

        // Order by migration month for consistent results
        query = query.order('migration_month', { ascending: true })

        const { data, error } = await query

        if (error) {
            console.error('Error fetching migration flows:', {
                error,
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            })
            throw new Error(`Failed to fetch migration flows: ${error.message || 'Unknown error'}`)
        }

        if (!data) {
            return []
        }

        // Transform to MigrationFlow interface
        return data
            .filter(row => row.country_from && row.country_to && row.migration_month && row.num_migrants !== null)
            .map(row => ({
                countryA: row.country_from!,
                countryB: row.country_to!,
                number: row.num_migrants!,
                month: row.migration_month!,
                region: row.region_from || 'Unknown'
            }))

    } catch (error) {
        console.error('Error in getMigrationFlows:', error)

        return []
    }
}

/**
 * Get aggregated monthly migration data
 * Can be used directly on filtered data or query the database
 */
export async function getMonthlyAggregatedFlows(filters: MigrationFilters = {}): Promise<{ month: string; total: number }[]> {
    try {
        let query = supabase
            .from('flows_country_to_country_monthly')
            .select('migration_month, num_migrants')

        // Apply same filters as getMigrationFlows
        if (filters.dateRange && filters.dateRange.length === 2) {
            const startDate = normalizeDate(filters.dateRange[0])
            const endDate = normalizeDate(filters.dateRange[1])
            
            query = query
                .gte('migration_month', startDate)
                .lte('migration_month', endDate)
        }

        if (filters.selectedRegions && filters.selectedRegions.length > 0) {
            query = query.in('region_from', filters.selectedRegions)
        }

        if (filters.selectedCountries && filters.selectedCountries.length > 0) {
            query = query.or(`country_from.in.(${filters.selectedCountries.join(',')}),country_to.in.(${filters.selectedCountries.join(',')})`)
        }

        if (filters.excludedCountries && filters.excludedCountries.length > 0) {
            query = query
                .not('country_from', 'in', `(${filters.excludedCountries.join(',')})`)
                .not('country_to', 'in', `(${filters.excludedCountries.join(',')})`)
        }

        if (filters.excludedRegions && filters.excludedRegions.length > 0) {
            query = query.not('region_from', 'in', `(${filters.excludedRegions.join(',')})`)
        }

        if (filters.minFlowSize !== undefined) {
            query = query.gte('num_migrants', filters.minFlowSize)
        }

        if (filters.maxFlowSize !== undefined) {
            query = query.lte('num_migrants', filters.maxFlowSize)
        }

        if (filters.period && filters.period !== 'all') {
            query = query.eq('period', filters.period)
        }

        const { data, error } = await query

        if (error) {
            console.error('Error fetching monthly aggregated flows:', error)
            throw new Error(`Failed to fetch monthly flows: ${error.message}`)
        }

        if (!data) {
            return []
        }

        // Group by month and sum
        const monthlyTotals: Record<string, number> = {}
        data.forEach(row => {
            if (row.migration_month && row.num_migrants !== null) {
                monthlyTotals[row.migration_month] = (monthlyTotals[row.migration_month] || 0) + row.num_migrants
            }
        })

        return Object.entries(monthlyTotals)
            .map(([month, total]) => ({ month, total }))
            .sort((a, b) => a.month.localeCompare(b.month))

    } catch (error) {
        console.error('Error in getMonthlyAggregatedFlows:', error)

        return []
    }
}

/**
 * Get top migration corridors using the materialized view or direct aggregation
 */
export async function getTopCorridors(filters: MigrationFilters = {}, limit: number = 10): Promise<{ corridor: string; total: number; countryA: string; countryB: string }[]> {
    try {
        // Use the pre-computed view if no specific filters are applied
        if (Object.keys(filters).length === 0 || (filters.period && Object.keys(filters).length === 1)) {
            let query = supabase
                .from('top_migration_corridors')
                .select('*')
                .order('total_migrants', { ascending: false })
                .limit(limit)

            if (filters.period && filters.period !== 'all') {
                query = query.eq('period', filters.period)
            }

            const { data, error } = await query

            if (error) {
                console.error('Error fetching top corridors from view:', error)
                throw new Error(`Failed to fetch top corridors: ${error.message}`)
            }

            if (!data) {
                return []
            }

            return data.map(row => ({
                corridor: `${row.country_from || 'Unknown'} → ${row.country_to || 'Unknown'}`,
                total: row.total_migrants || 0,
                countryA: row.country_from || '',
                countryB: row.country_to || ''
            }))
        }

        // For complex filters, aggregate directly
        let query = supabase
            .from('flows_country_to_country_monthly')
            .select('country_from, country_to, num_migrants')

        // Apply filters (same as other functions)
        if (filters.dateRange && filters.dateRange.length === 2) {
            const startDate = normalizeDate(filters.dateRange[0])
            const endDate = normalizeDate(filters.dateRange[1])
            
            query = query
                .gte('migration_month', startDate)
                .lte('migration_month', endDate)
        }

        if (filters.selectedRegions && filters.selectedRegions.length > 0) {
            query = query.in('region_from', filters.selectedRegions)
        }

        if (filters.selectedCountries && filters.selectedCountries.length > 0) {
            query = query.or(`country_from.in.(${filters.selectedCountries.join(',')}),country_to.in.(${filters.selectedCountries.join(',')})`)
        }

        if (filters.excludedCountries && filters.excludedCountries.length > 0) {
            query = query
                .not('country_from', 'in', `(${filters.excludedCountries.join(',')})`)
                .not('country_to', 'in', `(${filters.excludedCountries.join(',')})`)
        }

        if (filters.excludedRegions && filters.excludedRegions.length > 0) {
            query = query.not('region_from', 'in', `(${filters.excludedRegions.join(',')})`)
        }

        if (filters.minFlowSize !== undefined) {
            query = query.gte('num_migrants', filters.minFlowSize)
        }

        if (filters.maxFlowSize !== undefined) {
            query = query.lte('num_migrants', filters.maxFlowSize)
        }

        if (filters.period && filters.period !== 'all') {
            query = query.eq('period', filters.period)
        }

        const { data, error } = await query

        if (error) {
            console.error('Error fetching corridors for aggregation:', error)
            throw new Error(`Failed to fetch corridors: ${error.message}`)
        }

        if (!data) {
            return []
        }

        // Group by corridor and sum
        const corridorTotals: Record<string, { total: number; countryA: string; countryB: string }> = {}
        data.forEach(row => {
            if (row.country_from && row.country_to && row.num_migrants !== null) {
                const key = `${row.country_from}-${row.country_to}`
                if (!corridorTotals[key]) {
                    corridorTotals[key] = {
                        total: 0,
                        countryA: row.country_from,
                        countryB: row.country_to
                    }
                }
                corridorTotals[key].total += row.num_migrants
            }
        })

        return Object.entries(corridorTotals)
            .map(([corridor, { total, countryA, countryB }]) => ({
                corridor: `${countryA} → ${countryB}`,
                total,
                countryA,
                countryB
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, limit)

    } catch (error) {
        console.error('Error in getTopCorridors:', error)

        return []
    }
}

/**
 * Get pandemic comparison data for specific corridors
 */
export async function getPandemicComparison(countryFrom?: string, countryTo?: string): Promise<PandemicComparison[]> {
    try {
        let query = supabase
            .from('flows_pandemic_comparison_country')
            .select('*')

        if (countryFrom) {
            query = query.eq('country_from', countryFrom)
        }

        if (countryTo) {
            query = query.eq('country_to', countryTo)
        }

        const { data, error } = await query

        if (error) {
            console.error('Error fetching pandemic comparison:', error)
            throw new Error(`Failed to fetch pandemic comparison: ${error.message}`)
        }

        return data || []

    } catch (error) {
        console.error('Error in getPandemicComparison:', error)

        return []
    }
}

/**
 * Get seasonal patterns for migration flows
 */
export async function getSeasonalPatterns(countryFrom?: string, countryTo?: string): Promise<SeasonalPatterns[]> {
    try {
        let query = supabase
            .from('flows_seasonal_patterns_country')
            .select('*')

        if (countryFrom) {
            query = query.eq('country_from', countryFrom)
        }

        if (countryTo) {
            query = query.eq('country_to', countryTo)
        }

        const { data, error } = await query

        if (error) {
            console.error('Error fetching seasonal patterns:', error)
            throw new Error(`Failed to fetch seasonal patterns: ${error.message}`)
        }

        return data || []

    } catch (error) {
        console.error('Error in getSeasonalPatterns:', error)

        return []
    }
}

/**
 * Get country migration summary statistics
 */
export async function getCountryMigrationSummary(country?: string, year?: number): Promise<CountryMigrationSummary[]> {
    try {
        let query = supabase
            .from('country_migration_summary')
            .select('*')
            .order('year', { ascending: false })

        if (country) {
            query = query.eq('country', country)
        }

        if (year) {
            query = query.eq('year', year)
        }

        const { data, error } = await query

        if (error) {
            console.error('Error fetching country migration summary:', error)
            throw new Error(`Failed to fetch country summary: ${error.message}`)
        }

        return data || []

    } catch (error) {
        console.error('Error in getCountryMigrationSummary:', error)

        return []
    }
}

/**
 * Get corridor rankings for a specific year
 */
export async function getCorridorRankings(year?: number, limit: number = 50): Promise<CorridorRankings[]> {
    try {
        let query = supabase
            .from('flows_corridor_rankings_annual')
            .select('*')
            .order('rank', { ascending: true })
            .limit(limit)

        if (year) {
            query = query.eq('year', year)
        }

        const { data, error } = await query

        if (error) {
            console.error('Error fetching corridor rankings:', error)
            throw new Error(`Failed to fetch corridor rankings: ${error.message}`)
        }

        return data || []

    } catch (error) {
        console.error('Error in getCorridorRankings:', error)

        return []
    }
}

// Utility functions for data processing (can be used client-side)
export function aggregateByMonth(data: MigrationFlow[]): { month: string; total: number }[] {
    const monthlyTotals = data.reduce(
        (acc, flow) => {
            acc[flow.month] = (acc[flow.month] || 0) + flow.number

            return acc
        },
        {} as Record<string, number>,
    )

    return Object.entries(monthlyTotals)
        .map(([month, total]) => ({ month, total }))
        .sort((a, b) => a.month.localeCompare(b.month))
}

// Client-side version of getTopCorridors for backward compatibility
export function getTopCorridorsFromData(
    data: MigrationFlow[],
    limit = 10,
): { corridor: string; total: number; countryA: string; countryB: string }[] {
    const corridorTotals = data.reduce(
        (acc, flow) => {
            const corridor = `${flow.countryA}-${flow.countryB}`
            acc[corridor] = (acc[corridor] || 0) + flow.number

            return acc
        },
        {} as Record<string, number>,
    )

    return Object.entries(corridorTotals)
        .map(([corridor, total]) => {
            const [countryA, countryB] = corridor.split("-")

            return {
                corridor: `${countryA} → ${countryB}`, // Note: will need country name resolution
                total,
                countryA,
                countryB
            }
        })
        .sort((a, b) => b.total - a.total)
        .slice(0, limit)
}

// Backward compatibility function
export async function generateMigrationData(limit: number = 50000): Promise<MigrationFlow[]> {
    return await getMigrationFlows({ limit })
}

/**
 * Get country name mappings for labels (preloaded unique list)
 */
export async function getCountryNameMappings(): Promise<Record<string, string>> {
    try {
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
        console.error('Error in getCountryNameMappings:', error)
        
        return {}
    }
}

/**
 * EFFICIENT RPC-BASED FUNCTIONS - Use these instead of getMigrationFlows for dashboards!
 */

/**
 * Get monthly totals using efficient RPC function - replaces getMigrationFlows + client-side aggregation
 */
export async function getMonthlyTotalsRPC(filters: MigrationFilters = {}): Promise<{ month: string; total: number }[]> {
    try {
        // Convert filters to RPC parameters
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

        return data.map((row: any) => ({
            month: row.month,
            total: Number(row.total_migrants)
        }))

    } catch (error) {
        console.error('Error in getMonthlyTotalsRPC:', error)

        return []
    }
}

/**
 * Get dashboard summary statistics using efficient RPC function
 */
export async function getDashboardSummaryRPC(filters: MigrationFilters = {}): Promise<{
    totalFlows: number
    uniqueCorridors: number
    activeMonths: number
    avgMonthlyFlow: number
}> {
    try {
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
        console.error('Error in getDashboardSummaryRPC:', error)

        return { totalFlows: 0, uniqueCorridors: 0, activeMonths: 0, avgMonthlyFlow: 0 }
    }
}

/**
 * Get corridor time series data using efficient RPC function
 */
export async function getCorridorTimeSeriesRPC(
    corridors: string[], 
    filters: MigrationFilters = {}
): Promise<{ corridor: string; countryA: string; countryB: string; month: string; migrants: number }[]> {
    try {
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

        return data.map((row: any) => ({
            corridor: row.corridor,
            countryA: row.country_from,
            countryB: row.country_to,
            month: row.month,
            migrants: Number(row.migrants)
        }))

    } catch (error) {
        console.error('Error in getCorridorTimeSeriesRPC:', error)

        return []
    }
}

/**
 * Get top corridors using efficient RPC function - replaces getTopCorridors aggregation
 */
export async function getTopCorridorsRPC(filters: MigrationFilters = {}, limit: number = 10): Promise<{ corridor: string; total: number; countryA: string; countryB: string }[]> {
    try {
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

        return data.map((row: any) => ({
            corridor: row.corridor,
            total: Number(row.total_migrants),
            countryA: row.country_from,
            countryB: row.country_to
        }))

    } catch (error) {
        console.error('Error in getTopCorridorsRPC:', error)

        return []
    }
}