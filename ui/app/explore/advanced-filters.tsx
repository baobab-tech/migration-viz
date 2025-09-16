"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import Fuse from "fuse.js"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Search, Filter, RefreshCw, CalendarIcon, Globe, Settings, X } from "lucide-react"
import type { FilterState } from "@/lib/types"
import { countries, getAvailableRegions, loadCountriesData } from "@/lib/queries"
import { COUNTRY_NAME_MAPPINGS } from "@/lib/country-mappings"

interface SearchResult {
  type: 'country' | 'region'
  id: string
  name: string
  score: number
}

interface AdvancedFiltersProps {
  filters: ExtendedFilterState
  onFiltersChange: (filters: ExtendedFilterState) => void
  onSavePreset?: (name: string, filters: ExtendedFilterState) => void
  savedPresets?: { name: string; filters: ExtendedFilterState }[]
}

export interface ExtendedFilterState extends FilterState {
  searchQuery: string
  excludedCountries: string[]
  excludedRegions: string[]
  flowDirection: "all" | "inbound" | "outbound"
  timeAggregation: "monthly" | "quarterly" | "yearly"
  showTrends: boolean
  highlightAnomalies: boolean
  correlationThreshold: number
  volatilityFilter: [number, number]
  seasonalityFilter: boolean
}

// // Default presets
// const DEFAULT_PRESETS: { name: string; filters: ExtendedFilterState }[] = [
//   {
//     name: "European Focus",
//     filters: {
//       dateRange: ["2019-01", "2022-12"],
//       selectedRegions: ["Europe"],
//       selectedCountries: [],
//       minFlowSize: 0,
//       maxFlowSize: 10000000,
//       viewType: "absolute",
//       searchQuery: "",
//       excludedCountries: [],
//       excludedRegions: [],
//       flowDirection: "all",
//       timeAggregation: "quarterly",
//       showTrends: true,
//       highlightAnomalies: false,
//       correlationThreshold: 0.6,
//       volatilityFilter: [10, 90],
//       seasonalityFilter: false,
//     }
//   },
//   {
//     name: "Major Flows Only",
//     filters: {
//       dateRange: ["2020-01", "2022-12"],
//       selectedRegions: [],
//       selectedCountries: [],
//       minFlowSize: 10000,
//       maxFlowSize: 10000000,
//       viewType: "absolute",
//       searchQuery: "",
//       excludedCountries: [],
//       excludedRegions: [],
//       flowDirection: "all",
//       timeAggregation: "yearly",
//       showTrends: true,
//       highlightAnomalies: true,
//       correlationThreshold: 0.7,
//       volatilityFilter: [0, 70],
//       seasonalityFilter: true,
//     }
//   },
//   {
//     name: "Regional Analysis",
//     filters: {
//       dateRange: ["2019-01", "2022-12"],
//       selectedRegions: ["Africa", "Asia"],
//       selectedCountries: [],
//       minFlowSize: 50,
//       maxFlowSize: 10000000,
//       viewType: "per-capita",
//       searchQuery: "",
//       excludedCountries: [],
//       excludedRegions: [],
//       flowDirection: "all",
//       timeAggregation: "monthly",
//       showTrends: false,
//       highlightAnomalies: true,
//       correlationThreshold: 0.5,
//       volatilityFilter: [0, 100],
//       seasonalityFilter: false,
//     }
//   }
// ]

export function AdvancedFilters({ filters, onFiltersChange }: AdvancedFiltersProps) {
  // const [presetName, setPresetName] = useState("")
  const [isExpanded, setIsExpanded] = useState(false)
  const [availableRegions, setAvailableRegions] = useState<string[]>([])
  const [dataLoaded, setDataLoaded] = useState(false)
  const [countryNames, setCountryNames] = useState<Record<string, string>>({})
  // const [currentPreset, setCurrentPreset] = useState<string | null>(null)
  // const [customPresets, setCustomPresets] = useLocalStorage('migration-viz-presets', [] as { name: string; filters: ExtendedFilterState }[])

  // // Combine default presets with custom presets
  // const savedPresets = useMemo(() => {
  //   if (propSavedPresets) {
  //     return propSavedPresets
  //   }

  //   return [...DEFAULT_PRESETS, ...customPresets]
  // }, [propSavedPresets, customPresets])
  
  // Keep search query internal - don't propagate to parent until selection is made
  const [internalSearchQuery, setInternalSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
  
  // Search states for exclusions
  const [excludeCountrySearch, setExcludeCountrySearch] = useState("")
  const [debouncedExcludeCountrySearch, setDebouncedExcludeCountrySearch] = useState("")
  const [excludeRegionSearch, setExcludeRegionSearch] = useState("")
  const [debouncedExcludeRegionSearch, setDebouncedExcludeRegionSearch] = useState("")

  // Load countries data and regions on mount
  useEffect(() => {
    const initializeData = async () => {
      try {
        await loadCountriesData()
        setAvailableRegions(getAvailableRegions())
        setCountryNames(COUNTRY_NAME_MAPPINGS)
        setDataLoaded(true)
      } catch (error) {
        console.error('Error loading countries data:', error)
      }
    }

    initializeData()
  }, [])


  // // Check if current filters match the selected preset - if not, clear preset selection
  // useEffect(() => {
  //   if (currentPreset) {
  //     const preset = savedPresets.find(p => p.name === currentPreset)
  //     if (preset) {
  //       // Deep compare filters (excluding searchQuery which is internal)
  //       const { searchQuery: _, ...currentFiltersClean } = filters
  //       const { searchQuery: __, ...presetFiltersClean } = preset.filters
  //       
  //       if (JSON.stringify(currentFiltersClean) !== JSON.stringify(presetFiltersClean)) {
  //         setCurrentPreset(null)
  //       }
  //     }
  //   }
  // }, [filters, currentPreset, savedPresets])

  // Debounce internal search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(internalSearchQuery)
    }, 200) 

    return () => clearTimeout(timer)
  }, [internalSearchQuery])

  // Debounce exclude country search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedExcludeCountrySearch(excludeCountrySearch)
    }, 200) 

    return () => clearTimeout(timer)
  }, [excludeCountrySearch])

  // Debounce exclude region search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedExcludeRegionSearch(excludeRegionSearch)
    }, 200) 

    return () => clearTimeout(timer)
  }, [excludeRegionSearch])

  // Initialize Fuse.js instances once and reuse them
  const searchInstances = useMemo(() => {
    if (!dataLoaded) return { countryFuse: null, regionFuse: null }
    
    const countryFuse = new Fuse(countries, {
      keys: [
        { name: 'name', weight: 0.7 },
        { name: 'code', weight: 0.2 },
        { name: 'region', weight: 0.1 }
      ],
      threshold: 0.3,
      includeScore: true,
      minMatchCharLength: 1
    })

    const regionFuse = new Fuse(availableRegions, {
      threshold: 0.3,
      includeScore: true,
      minMatchCharLength: 1
    })
    
    return { countryFuse, regionFuse }
  }, [dataLoaded, availableRegions])

  // Optimized search results with reused Fuse.js instances
  const searchResults = useMemo((): SearchResult[] => {
    if (!dataLoaded || debouncedSearchQuery.length <= 1 || !searchInstances.countryFuse) {
      return []
    }

    const results: SearchResult[] = []

    // Search countries using cached instance
    const countryResults: SearchResult[] = searchInstances.countryFuse
      .search(debouncedSearchQuery)
      .slice(0, 6)
      .map((result) => ({
        type: 'country' as const,
        id: result.item.code,
        name: countryNames[result.item.code] || result.item.code,
        score: result.score || 0
      }))
    results.push(...countryResults)

    // Search regions using cached instance
    if (searchInstances.regionFuse) {
      const regionResults: SearchResult[] = searchInstances.regionFuse
        .search(debouncedSearchQuery)
        .slice(0, 4)
        .map((result) => ({
          type: 'region' as const,
          id: result.item,
          name: result.item,
          score: result.score || 0
        }))
      results.push(...regionResults)
    }

    // Sort by score and limit results
    return results.sort((a, b) => a.score - b.score).slice(0, 10)
  }, [searchInstances, debouncedSearchQuery, dataLoaded, countryNames])

  // Search results for exclude countries using cached instance
  const excludeCountryResults = useMemo(() => {
    if (!searchInstances.countryFuse || debouncedExcludeCountrySearch.length <= 1) {
      return []
    }

    return searchInstances.countryFuse
      .search(debouncedExcludeCountrySearch)
      .slice(0, 8)
      .map((result) => result.item.code)
      .filter((countryCode) => !filters.excludedCountries.includes(countryCode))
  }, [searchInstances.countryFuse, debouncedExcludeCountrySearch, filters.excludedCountries])

  // Search results for exclude regions using cached instance
  const excludeRegionResults = useMemo(() => {
    if (!searchInstances.regionFuse || debouncedExcludeRegionSearch.length <= 1) {
      return []
    }

    return searchInstances.regionFuse
      .search(debouncedExcludeRegionSearch)
      .slice(0, 8)
      .map((result) => result.item)
      .filter((region) => !filters.excludedRegions.includes(region))
  }, [searchInstances.regionFuse, debouncedExcludeRegionSearch, filters.excludedRegions])

  const updateFilters = useCallback((newFilters: Partial<ExtendedFilterState>) => {
    const updated = { ...filters, ...newFilters }
    onFiltersChange(updated)
  }, [filters, onFiltersChange])

  const clearAllFilters = useCallback(() => {
    // Clear all search queries
    setInternalSearchQuery("")
    setExcludeCountrySearch("")
    setExcludeRegionSearch("")
    
    // // Clear current preset
    // setCurrentPreset(null)
    
    const cleared: ExtendedFilterState = {
      dateRange: ["2019-01", "2022-12"],
      selectedRegions: [],
      selectedCountries: [],
      minFlowSize: 0,
      maxFlowSize: 10000000,
      viewType: "absolute",
      searchQuery: "",
      excludedCountries: [],
      excludedRegions: [],
      flowDirection: "all",
      timeAggregation: "monthly",
      showTrends: false,
      highlightAnomalies: false,
      correlationThreshold: 0.5,
      volatilityFilter: [0, 100],
      seasonalityFilter: false,
    }
    onFiltersChange(cleared)
  }, [onFiltersChange])

  // const loadPreset = useCallback((preset: { name: string; filters: ExtendedFilterState }) => {
  //   // Clear all search queries when loading preset
  //   setInternalSearchQuery("")
  //   setExcludeCountrySearch("")
  //   setExcludeRegionSearch("")
  //   
  //   // Set current preset
  //   setCurrentPreset(preset.name)
  //   
  //   onFiltersChange(preset.filters)
  // }, [onFiltersChange])

  // const saveCurrentPreset = useCallback(() => {
  //   if (presetName.trim()) {
  //     const newPreset = { name: presetName.trim(), filters }
  //     
  //     // Check if preset name already exists in custom presets
  //     const existingIndex = customPresets.findIndex(p => p.name === newPreset.name)
  //     
  //     if (existingIndex >= 0) {
  //       // Update existing preset
  //       const updatedPresets = [...customPresets]
  //       updatedPresets[existingIndex] = newPreset
  //       setCustomPresets(updatedPresets)
  //     } else {
  //       // Add new preset
  //       setCustomPresets([...customPresets, newPreset])
  //     }
  //     
  //     setCurrentPreset(newPreset.name)
  //     
  //     // Call parent callback if provided
  //     if (onSavePreset) {
  //       onSavePreset(presetName.trim(), filters)
  //     }
  //     
  //     setPresetName("")
  //   }
  // }, [presetName, filters, onSavePreset, customPresets, setCustomPresets])

  const addCountryFromSearch = useCallback((countryCode: string) => {
    if (!filters.selectedCountries.includes(countryCode)) {
      // Clear internal search query
      setInternalSearchQuery("")
      
      // Only update selectedCountries, not searchQuery
      const updated = {
        ...filters,
        selectedCountries: [...filters.selectedCountries, countryCode],
      }
      onFiltersChange(updated)
    }
  }, [filters, onFiltersChange])

  const addRegionFromSearch = useCallback((region: string) => {
    if (!filters.selectedRegions.includes(region)) {
      // Clear internal search query
      setInternalSearchQuery("")
      
      // Only update selectedRegions, not searchQuery
      const updated = {
        ...filters,
        selectedRegions: [...filters.selectedRegions, region],
      }
      onFiltersChange(updated)
    }
  }, [filters, onFiltersChange])

  const addExcludedCountryFromSearch = useCallback((countryCode: string) => {
    if (!filters.excludedCountries.includes(countryCode)) {
      // Clear exclude country search
      setExcludeCountrySearch("")
      
      const updated = {
        ...filters,
        excludedCountries: [...filters.excludedCountries, countryCode],
      }
      onFiltersChange(updated)
    }
  }, [filters, onFiltersChange])

  const addExcludedRegionFromSearch = useCallback((region: string) => {
    if (!filters.excludedRegions.includes(region)) {
      // Clear exclude region search
      setExcludeRegionSearch("")
      
      const updated = {
        ...filters,
        excludedRegions: [...filters.excludedRegions, region],
      }
      onFiltersChange(updated)
    }
  }, [filters, onFiltersChange])

  const removeSelectedCountry = useCallback((countryCode: string) => {
    const updated = {
      ...filters,
      selectedCountries: filters.selectedCountries.filter((c) => c !== countryCode),
    }
    onFiltersChange(updated)
  }, [filters, onFiltersChange])

  const removeSelectedRegion = useCallback((region: string) => {
    const updated = {
      ...filters,
      selectedRegions: filters.selectedRegions.filter((r) => r !== region),
    }
    onFiltersChange(updated)
  }, [filters, onFiltersChange])


  const removeExcludedCountry = useCallback((countryCode: string) => {
    const updated = {
      ...filters,
      excludedCountries: filters.excludedCountries.filter((c) => c !== countryCode),
    }
    onFiltersChange(updated)
  }, [filters, onFiltersChange])

  const removeExcludedRegion = useCallback((region: string) => {
    const updated = {
      ...filters,
      excludedRegions: filters.excludedRegions.filter((r) => r !== region),
    }
    onFiltersChange(updated)
  }, [filters, onFiltersChange])

  const hasActiveFilters =
    filters.selectedRegions.length > 0 ||
    filters.selectedCountries.length > 0 ||
    filters.excludedCountries.length > 0 ||
    filters.excludedRegions.length > 0 ||
    filters.minFlowSize > 0 ||
    filters.maxFlowSize < 10000000 ||
    // filters.flowDirection !== "all" || // Hidden - not functional
    filters.timeAggregation !== "monthly" ||
    filters.showTrends ||
    filters.highlightAnomalies ||
    filters.correlationThreshold !== 0.5 ||
    filters.volatilityFilter[0] > 0 ||
    filters.volatilityFilter[1] < 100 ||
    filters.seasonalityFilter

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-card to-primary/5">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5 text-primary" />
            Advanced Filters & Controls
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2">
                {filters.selectedRegions.length +
                  filters.selectedCountries.length +
                  filters.excludedCountries.length +
                  filters.excludedRegions.length}{" "}
                active
              </Badge>
            )}
          </CardTitle>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearAllFilters} className="text-xs bg-transparent">
              <RefreshCw className="h-3 w-3 mr-1" />
              Clear All
            </Button>
          )}
        </div>

        {/* Quick Search */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search countries and regions"
              value={internalSearchQuery}
              onChange={(e) => setInternalSearchQuery(e.target.value)}
              className="pl-10"
            />
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => result.type === 'country' ? addCountryFromSearch(result.id) : addRegionFromSearch(result.id)}
                    className="w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground text-sm flex items-center gap-2"
                  >
                    <Globe className={`h-3 w-3 ${result.type === 'region' ? 'text-blue-500' : ''}`} />
                    {result.type === 'region' ? (
                      <span className="flex items-center gap-1">
                        <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded dark:bg-blue-900/20 dark:text-blue-300">Region</span>
                        {result.name}
                      </span>
                    ) : (
                      <span>{result.name} ({result.id})</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Active Filters:</Label>
            <div className="flex flex-wrap gap-2">
              {filters.selectedRegions.map((region) => (
                <Badge key={region} variant="secondary" className="flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  {region}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                    onClick={() => removeSelectedRegion(region)}
                  />
                </Badge>
              ))}
              {filters.selectedCountries.map((country) => (
                <Badge key={country} variant="outline" className="flex items-center gap-1">
                  {countryNames[country] || country}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                    onClick={() => removeSelectedCountry(country)}
                  />
                </Badge>
              ))}
              {filters.excludedCountries.map((country) => (
                <Badge key={country} variant="secondary" className="flex items-center gap-1 bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800">
                  Excluded: {countryNames[country] || country}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-orange-600 dark:hover:text-orange-400"
                    onClick={() => removeExcludedCountry(country)}
                  />
                </Badge>
              ))}
              {filters.excludedRegions.map((region) => (
                <Badge key={region} variant="secondary" className="flex items-center gap-1 bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800">
                  Excluded Region: {region}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-orange-600 dark:hover:text-orange-400"
                    onClick={() => removeExcludedRegion(region)}
                  />
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Basic Controls - Always Visible */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {/* Time Aggregation */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Time Aggregation</Label>
            <Select
              value={filters.timeAggregation}
              onValueChange={(value: "monthly" | "quarterly" | "yearly") => updateFilters({ timeAggregation: value })}
            >
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Exclude Countries Search */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Exclude Countries</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search countries to exclude..."
                value={excludeCountrySearch}
                onChange={(e) => setExcludeCountrySearch(e.target.value)}
                className="pl-10 text-xs"
                disabled={!dataLoaded}
              />
              {excludeCountryResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {excludeCountryResults.map((countryCode: string) => (
                    <button
                      key={countryCode}
                      type="button"
                      onClick={() => addExcludedCountryFromSearch(countryCode)}
                      className="w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground text-sm flex items-center gap-2"
                    >
                      <Globe className="h-3 w-3 text-orange-500" />
                      {countryNames[countryCode] || countryCode} ({countryCode})
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Exclude Regions Search */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Exclude Regions</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search regions to exclude..."
                value={excludeRegionSearch}
                onChange={(e) => setExcludeRegionSearch(e.target.value)}
                className="pl-10 text-xs"
                disabled={!dataLoaded}
              />
              {excludeRegionResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {excludeRegionResults.map((region: string) => (
                    <button
                      key={region}
                      type="button"
                      onClick={() => addExcludedRegionFromSearch(region)}
                      className="w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground text-sm flex items-center gap-2"
                    >
                      <Globe className="h-3 w-3 text-orange-500" />
                      {region}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* More Options Button */}
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="text-xs">
              <Settings className="h-3 w-3 mr-1" />
              {isExpanded ? "Fewer Options" : "More Options"}
            </Button>
          </div>
        </div>

        {/* Advanced Options */}
        {isExpanded && (
          <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Date Range */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    Date Range
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={filters.dateRange[0]}
                      onValueChange={(value) => updateFilters({ dateRange: [value, filters.dateRange[1]] })}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2019-01">Jan 2019</SelectItem>
                        <SelectItem value="2020-01">Jan 2020</SelectItem>
                        <SelectItem value="2021-01">Jan 2021</SelectItem>
                        <SelectItem value="2022-01">Jan 2022</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={filters.dateRange[1]}
                      onValueChange={(value) => updateFilters({ dateRange: [filters.dateRange[0], value] })}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2019-12">Dec 2019</SelectItem>
                        <SelectItem value="2020-12">Dec 2020</SelectItem>
                        <SelectItem value="2021-12">Dec 2021</SelectItem>
                        <SelectItem value="2022-12">Dec 2022</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Sliders in Same Row */}
                {/* Volatility Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Volatility Range: {filters.volatilityFilter[0]}% - {filters.volatilityFilter[1]}%
                  </Label>
                  <Slider
                    value={filters.volatilityFilter}
                    onValueChange={(value) => updateFilters({ volatilityFilter: value as [number, number] })}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>

                {/* Correlation Threshold */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Correlation Threshold: {filters.correlationThreshold.toFixed(2)}
                  </Label>
                  <Slider
                    value={[filters.correlationThreshold]}
                    onValueChange={([value]) => updateFilters({ correlationThreshold: value })}
                    min={0}
                    max={1}
                    step={0.1}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Flow Size Range */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Flow Size Range: {filters.minFlowSize.toLocaleString()} - {filters.maxFlowSize.toLocaleString()}
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Minimum Flow</Label>
                    <Select
                      value={filters.minFlowSize.toString()}
                      onValueChange={(value) => updateFilters({ minFlowSize: parseInt(value) })}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0</SelectItem>
                        <SelectItem value="1000">1,000</SelectItem>
                        <SelectItem value="2500">2,500</SelectItem>
                        <SelectItem value="5000">5,000</SelectItem>
                        <SelectItem value="10000">10,000</SelectItem>
                        <SelectItem value="25000">25,000</SelectItem>
                        <SelectItem value="50000">50,000</SelectItem>
                        <SelectItem value="100000">100,000</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Maximum Flow</Label>
                    <Select
                      value={filters.maxFlowSize.toString()}
                      onValueChange={(value) => updateFilters({ maxFlowSize: parseInt(value) })}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10000">10,000</SelectItem>
                        <SelectItem value="25000">25,000</SelectItem>
                        <SelectItem value="50000">50,000</SelectItem>
                        <SelectItem value="200000">200,000</SelectItem>
                        <SelectItem value="500000">500,000</SelectItem>
                        <SelectItem value="1000000">1,000,000</SelectItem>
                        <SelectItem value="10000000">No limit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
        )}
      </CardContent>
    </Card>
  )
}
