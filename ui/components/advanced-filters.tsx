"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
// @ts-ignore - Fuse.js types might not be available
import Fuse from "fuse.js"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, Filter, Save, Download, RefreshCw, CalendarIcon, Globe, Settings, Bookmark, X } from "lucide-react"
import type { FilterState } from "./filter-controls"
import { countries, getAvailableRegions, loadCountriesData, getCountryNameMappings } from "@/lib/queries"

interface AdvancedFiltersProps {
  filters: ExtendedFilterState
  onFiltersChange: (filters: ExtendedFilterState) => void
  onSavePreset: (name: string, filters: ExtendedFilterState) => void
  savedPresets: { name: string; filters: ExtendedFilterState }[]
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

export function AdvancedFilters({ filters, onFiltersChange, onSavePreset, savedPresets }: AdvancedFiltersProps) {
  const [presetName, setPresetName] = useState("")
  const [isExpanded, setIsExpanded] = useState(false)
  const [availableRegions, setAvailableRegions] = useState<string[]>([])
  const [dataLoaded, setDataLoaded] = useState(false)
  const [countryNames, setCountryNames] = useState<Record<string, string>>({})
  
  // Keep search query internal - don't propagate to parent until selection is made
  const [internalSearchQuery, setInternalSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")

  // Load countries data, regions, and country names on mount
  useEffect(() => {
    const initializeData = async () => {
      try {
        await loadCountriesData()
        const names = await getCountryNameMappings()
        setAvailableRegions(getAvailableRegions())
        setCountryNames(names)
        setDataLoaded(true)
      } catch (error) {
        console.error('Error loading countries data:', error)
      }
    }

    initializeData()
  }, [])

  // Debounce internal search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(internalSearchQuery)
    }, 150) // 150ms debounce

    return () => clearTimeout(timer)
  }, [internalSearchQuery])

  // Initialize Fuse.js for fuzzy search
  const fuse = useMemo(() => {
    if (!dataLoaded) return null
    
    return new Fuse(countries, {
      keys: [
        { name: 'name', weight: 0.7 },
        { name: 'code', weight: 0.2 },
        { name: 'region', weight: 0.1 }
      ],
      threshold: 0.3, // Lower = more exact matches
      includeScore: true,
      minMatchCharLength: 1
    })
  }, [dataLoaded])

  // Optimized search results with Fuse.js
  const searchResults = useMemo(() => {
    if (!fuse || debouncedSearchQuery.length <= 1) {
      return []
    }

    return fuse
      .search(debouncedSearchQuery)
      .slice(0, 10)
      .map((result: any) => result.item.code)
  }, [fuse, debouncedSearchQuery])

  const updateFilters = useCallback((newFilters: Partial<ExtendedFilterState>) => {
    const updated = { ...filters, ...newFilters }
    onFiltersChange(updated)
  }, [filters, onFiltersChange])

  const clearAllFilters = useCallback(() => {
    // Clear internal search query
    setInternalSearchQuery("")
    
    const cleared: ExtendedFilterState = {
      dateRange: ["2019-01", "2022-12"],
      selectedRegions: [],
      selectedCountries: [],
      minFlowSize: 0,
      maxFlowSize: 10000,
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

  const loadPreset = useCallback((preset: { name: string; filters: ExtendedFilterState }) => {
    // Clear internal search query when loading preset
    setInternalSearchQuery("")
    onFiltersChange(preset.filters)
  }, [onFiltersChange])

  const saveCurrentPreset = useCallback(() => {
    if (presetName.trim()) {
      onSavePreset(presetName.trim(), filters)
      setPresetName("")
    }
  }, [presetName, filters, onSavePreset])

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

  const addExcludedCountry = useCallback((countryCode: string) => {
    if (!filters.excludedCountries.includes(countryCode)) {
      const updated = {
        ...filters,
        excludedCountries: [...filters.excludedCountries, countryCode],
      }
      onFiltersChange(updated)
    }
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
    filters.maxFlowSize < 10000 ||
    filters.flowDirection !== "all" ||
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
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="text-xs">
              <Settings className="h-3 w-3 mr-1" />
              {isExpanded ? "Collapse" : "Expand"}
            </Button>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearAllFilters} className="text-xs bg-transparent">
                <RefreshCw className="h-3 w-3 mr-1" />
                Clear All
              </Button>
            )}
          </div>
        </div>

        {/* Quick Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search countries"
            value={internalSearchQuery}
            onChange={(e) => setInternalSearchQuery(e.target.value)}
            className="pl-10"
          />
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
              {searchResults.map((countryCode: string) => (
                <button
                  key={countryCode}
                  type="button"
                  onClick={() => addCountryFromSearch(countryCode)}
                  className="w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground text-sm flex items-center gap-2"
                >
                  <Globe className="h-3 w-3" />
                  {countryNames[countryCode] || countryCode} ({countryCode})
                </button>
              ))}
            </div>
          )}
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

        {/* Preset Management */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Preset name..."
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              className="w-32 text-xs"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={saveCurrentPreset}
              disabled={!presetName.trim()}
              className="text-xs bg-transparent"
            >
              <Save className="h-3 w-3 mr-1" />
              Save
            </Button>
          </div>
          {savedPresets.length > 0 && (
            <Select onValueChange={(value) => loadPreset(savedPresets.find((p) => p.name === value)!)}>
              <SelectTrigger className="w-40 text-xs">
                <SelectValue placeholder="Load preset..." />
              </SelectTrigger>
              <SelectContent>
                {savedPresets.map((preset) => (
                  <SelectItem key={preset.name} value={preset.name}>
                    <div className="flex items-center gap-2">
                      <Bookmark className="h-3 w-3" />
                      {preset.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Expanded Filters */}
        {isExpanded && (
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
              <TabsTrigger value="analysis">Analysis</TabsTrigger>
              <TabsTrigger value="display">Display</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              {/* Region Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Select Regions
                </Label>
                <Select 
                  onValueChange={(value) => {
                    if (value && !filters.selectedRegions.includes(value)) {
                      updateFilters({ selectedRegions: [...filters.selectedRegions, value] })
                    }
                  }}
                  disabled={!dataLoaded}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder={dataLoaded ? "Add region..." : "Loading regions..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRegions
                      .filter(region => !filters.selectedRegions.includes(region))
                      .map((region) => (
                        <SelectItem key={region} value={region}>
                          {region}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

                {/* Flow Direction */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Flow Direction</Label>
                  <Select
                    value={filters.flowDirection}
                    onValueChange={(value: any) => updateFilters({ flowDirection: value })}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Flows</SelectItem>
                      <SelectItem value="inbound">Inbound Only</SelectItem>
                      <SelectItem value="outbound">Outbound Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Time Aggregation */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Time Aggregation</Label>
                  <Select
                    value={filters.timeAggregation}
                    onValueChange={(value: any) => updateFilters({ timeAggregation: value })}
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
              </div>

              {/* Flow Size Range */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Flow Size Range: {filters.minFlowSize.toLocaleString()} - {filters.maxFlowSize.toLocaleString()}
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Minimum</Label>
                    <Slider
                      value={[filters.minFlowSize]}
                      onValueChange={([value]) => {
                        // Ensure min doesn't exceed max
                        const newMin = Math.min(value, filters.maxFlowSize - 100)
                        updateFilters({ minFlowSize: newMin })
                      }}
                      min={0}
                      max={Math.max(filters.maxFlowSize - 100, 0)}
                      step={50}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Maximum</Label>
                    <Slider
                      value={[filters.maxFlowSize]}
                      onValueChange={([value]) => {
                        // Ensure max doesn't go below min
                        const newMax = Math.max(value, filters.minFlowSize + 100)
                        updateFilters({ maxFlowSize: newMax })
                      }}
                      min={Math.max(filters.minFlowSize + 100, 100)}
                      max={10000}
                      step={50}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              {/* Exclusion Filters */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Exclude Countries</Label>
                <Select onValueChange={addExcludedCountry} disabled={!dataLoaded}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder={dataLoaded ? "Add country to exclude..." : "Loading countries..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {countries
                      .filter((c) => !filters.excludedCountries.includes(c.code))
                      .map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          {countryNames[country.code] || country.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Exclude Regions */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Exclude Regions</Label>
                <Select 
                  onValueChange={(value) => {
                    if (value && !filters.excludedRegions.includes(value)) {
                      updateFilters({ excludedRegions: [...filters.excludedRegions, value] })
                    }
                  }}
                  disabled={!dataLoaded}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder={dataLoaded ? "Add region to exclude..." : "Loading regions..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRegions
                      .filter(region => !filters.excludedRegions.includes(region))
                      .map((region) => (
                        <SelectItem key={region} value={region}>
                          {region}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

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
            </TabsContent>

            <TabsContent value="analysis" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Analysis Options */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="trends"
                      checked={filters.showTrends}
                      onCheckedChange={(checked) => updateFilters({ showTrends: checked })}
                    />
                    <Label htmlFor="trends" className="text-sm">
                      Show Trend Lines
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="anomalies"
                      checked={filters.highlightAnomalies}
                      onCheckedChange={(checked) => updateFilters({ highlightAnomalies: checked })}
                    />
                    <Label htmlFor="anomalies" className="text-sm">
                      Highlight Anomalies
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="seasonality"
                      checked={filters.seasonalityFilter}
                      onCheckedChange={(checked) => updateFilters({ seasonalityFilter: checked })}
                    />
                    <Label htmlFor="seasonality" className="text-sm">
                      Apply Seasonality Filter
                    </Label>
                  </div>
                </div>

                {/* View Type */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Data View Type</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {(["absolute", "per-capita", "growth"] as const).map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={type}
                          checked={filters.viewType === type}
                          onCheckedChange={() => updateFilters({ viewType: type })}
                        />
                        <Label htmlFor={type} className="text-sm">
                          {type === "absolute"
                            ? "Absolute Values"
                            : type === "per-capita"
                              ? "Per Capita"
                              : "Growth Rates"}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="display" className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Display options and export functionality will be available in the full version.
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="text-xs bg-transparent">
                  <Download className="h-3 w-3 mr-1" />
                  Export Data
                </Button>
                <Button variant="outline" size="sm" className="text-xs bg-transparent">
                  <Download className="h-3 w-3 mr-1" />
                  Export Chart
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  )
}
