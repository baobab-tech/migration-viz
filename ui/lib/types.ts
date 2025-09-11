// Shared types for migration data
export interface MigrationFlow {
    countryA: string
    countryB: string
    number: number
    month: string
    region: string
}

export interface FilterState {
    dateRange: [string, string]
    selectedRegions: string[]
    selectedCountries: string[]
    minFlowSize: number
    maxFlowSize: number
    viewType: "absolute" | "per-capita" | "growth"
}

export interface MigrationFilters {
    dateRange?: [string, string]
    selectedRegions?: string[]
    selectedCountries?: string[]
    minFlowSize?: number
    maxFlowSize?: number
    excludedCountries?: string[]
    excludedRegions?: string[]
    flowDirection?: 'all' | 'inbound' | 'outbound'
    period?: 'all' | 'monthly' | 'quarterly' | 'yearly'
    timeAggregation?: 'monthly' | 'quarterly' | 'yearly'
    limit?: number
}
