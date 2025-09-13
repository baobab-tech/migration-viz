"use client"

import { useRouter } from "next/navigation"
import { useCallback, useState, useEffect } from "react"
import { AdvancedFilters, type ExtendedFilterState } from "./advanced-filters"
import { loadCountriesData } from "@/lib/queries"
import type { MigrationFilters } from "@/lib/types"

interface MigrationFiltersProps {
  initialFilters: MigrationFilters
  savedPresets?: { name: string; filters: ExtendedFilterState }[]
}

// Convert MigrationFilters to ExtendedFilterState for the UI
function migrationFiltersToExtended(filters: MigrationFilters): ExtendedFilterState {
  return {
    dateRange: filters.dateRange || ["2019-01", "2022-12"],
    selectedRegions: filters.selectedRegions || [],
    selectedCountries: filters.selectedCountries || [],
    minFlowSize: filters.minFlowSize || 0,
    maxFlowSize: filters.maxFlowSize || 10000000,
    excludedCountries: filters.excludedCountries || [],
    excludedRegions: filters.excludedRegions || [],
    flowDirection: filters.flowDirection || "all",
    timeAggregation: filters.timeAggregation || "monthly",
    searchQuery: "",
    viewType: "absolute",
    showTrends: false,
    highlightAnomalies: false,
    correlationThreshold: 0.5,
    volatilityFilter: [0, 100],
    seasonalityFilter: false,
  }
}

// Convert ExtendedFilterState to URL parameters
function filtersToSearchParams(filters: ExtendedFilterState): URLSearchParams {
  const params = new URLSearchParams()
  
  // Data filters only (not display filters)
  if (filters.dateRange[0]) params.set('start_date', filters.dateRange[0])
  if (filters.dateRange[1]) params.set('end_date', filters.dateRange[1])
  if (filters.selectedRegions.length) params.set('regions', filters.selectedRegions.join(','))
  if (filters.selectedCountries.length) params.set('countries', filters.selectedCountries.join(','))
  if (filters.minFlowSize > 0) params.set('min_flow', filters.minFlowSize.toString())
  if (filters.maxFlowSize < 10000000) params.set('max_flow', filters.maxFlowSize.toString())
  if (filters.excludedCountries.length) params.set('excluded_countries', filters.excludedCountries.join(','))
  if (filters.excludedRegions.length) params.set('excluded_regions', filters.excludedRegions.join(','))
  if (filters.flowDirection !== 'all') params.set('flow_direction', filters.flowDirection)
  if (filters.timeAggregation !== 'monthly') params.set('time_aggregation', filters.timeAggregation)
  
  return params
}

export function MigrationFiltersClient({ initialFilters, savedPresets = [] }: MigrationFiltersProps) {
  const router = useRouter()
  
  // Initialize countries data
  useEffect(() => {
    loadCountriesData()
  }, [])
  
  const [currentFilters, setCurrentFilters] = useState<ExtendedFilterState>(() => 
    migrationFiltersToExtended(initialFilters)
  )
  
  const [customPresets, setCustomPresets] = useState(savedPresets)

  const handleFiltersChange = useCallback((newFilters: ExtendedFilterState) => {
    setCurrentFilters(newFilters)
    
    // Update URL with new parameters
    const params = filtersToSearchParams(newFilters)
    
    // Use shallow routing to avoid full page reload
    const newUrl = `${window.location.pathname}?${params.toString()}`
    router.push(newUrl, { scroll: false })
  }, [router])

  const handleSavePreset = useCallback((name: string, presetFilters: ExtendedFilterState) => {
    setCustomPresets(prev => [...prev, { name, filters: presetFilters }])
  }, [])

  return (
    <AdvancedFilters 
      filters={currentFilters}
      onFiltersChange={handleFiltersChange}
      onSavePreset={handleSavePreset}
      savedPresets={customPresets.length > 0 ? customPresets : undefined}
    />
  )
}
