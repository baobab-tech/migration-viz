import { createClient } from '@/utils/supabase/client'
import type { Tables } from '@/lib/db_generated_types'
import type { MigrationFlow, MigrationFilters } from '@/lib/types'

// Type aliases for better readability  
type CountryMigrationSummary = Tables<'country_migration_summary'>
type CorridorRankings = Tables<'flows_corridor_rankings_annual'>

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
export async function getM49Regions() {
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
        year,
        month,
        period
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
                countryA: row.country_from as string,
                countryB: row.country_to as string,
                number: row.num_migrants as number,
                month: row.migration_month as string,
                region: row.region_from || 'Unknown'
            }))

    } catch (error) {
        console.error('Error in getMigrationFlows:', error)

        return []
    }
}

/**
 * Get aggregated migration data (monthly, quarterly, or yearly based on filters)
 * @deprecated Use server-side getMonthlyTotalsServer instead for better performance
 * This function is kept for backward compatibility but will use RPC function internally
 */
export async function getMonthlyAggregatedFlows(filters: MigrationFilters = {}): Promise<{ month: string; total: number }[]> {
    console.warn('getMonthlyAggregatedFlows is deprecated. Use getMonthlyTotalsServer for better performance.')
    
    try {
        const startDate = filters.dateRange?.[0] ? normalizeDate(filters.dateRange[0]) : '2019-01-01'
        const endDate = filters.dateRange?.[1] ? normalizeDate(filters.dateRange[1]) : '2022-12-31'

        const { data, error } = await supabase.rpc('get_monthly_migration_totals', {
            p_start_date: startDate,
            p_end_date: endDate,
            p_regions: filters.selectedRegions?.length ? filters.selectedRegions : undefined,
            p_countries: filters.selectedCountries?.length ? filters.selectedCountries : undefined,
            p_excluded_countries: filters.excludedCountries?.length ? filters.excludedCountries : undefined,
            p_excluded_regions: filters.excludedRegions?.length ? filters.excludedRegions : undefined,
            p_min_flow: filters.minFlowSize ?? 0,
            p_max_flow: filters.maxFlowSize ?? undefined,
            p_period: filters.period === 'all' ? 'all' : (filters.period ?? 'all'),
            p_time_aggregation: filters.timeAggregation ?? 'monthly'
        } as any)

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
        if (Object.keys(filters).length === 0) {
            const query = supabase
                .from('top_migration_corridors')
                .select('*')
                .order('total_migrants', { ascending: false })
                .limit(limit)


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
            .map(([, { total, countryA, countryB }]) => ({
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
                total: Number(total),
                countryA,
                countryB
            }
        })
        .sort((a, b) => Number(b.total) - Number(a.total))
        .slice(0, limit)
}

// Backward compatibility function
export async function generateMigrationData(limit: number = 50000): Promise<MigrationFlow[]> {
    return await getMigrationFlows({ limit })
}

// All RPC functions moved to server-queries.ts for React 19 best practices
// Client-side components should use Server Actions or Server Components for data fetching