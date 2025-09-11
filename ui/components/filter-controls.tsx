"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { X, Filter, Calendar, Globe, TrendingUp } from "lucide-react"

interface FilterControlsProps {
  onFiltersChange: (filters: FilterState) => void
}

export interface FilterState {
  dateRange: [string, string]
  selectedRegions: string[]
  selectedCountries: string[]
  minFlowSize: number
  maxFlowSize: number
  viewType: "absolute" | "per-capita" | "growth"
}

const regions = ["Europe", "Asia", "North America", "South America", "Africa", "Oceania"]
const countries = [
  "GB",
  "BE",
  "DE",
  "FR",
  "ES",
  "IT",
  "US",
  "CA",
  "AU",
  "JP",
  "CN",
  "IN",
  "BR",
  "MX",
  "ZA",
  "NG",
  "EG",
  "TR",
  "RU",
  "SA",
]

export function FilterControls({ onFiltersChange }: FilterControlsProps) {
  const [filters, setFilters] = useState<FilterState>({
    dateRange: ["2019-01", "2022-12"],
    selectedRegions: [],
    selectedCountries: [],
    minFlowSize: 0,
    maxFlowSize: 10000,
    viewType: "absolute",
  })

  const [isExpanded, setIsExpanded] = useState(false)

  const updateFilters = (newFilters: Partial<FilterState>) => {
    const updated = { ...filters, ...newFilters }
    setFilters(updated)
    onFiltersChange(updated)
  }

  const clearFilters = () => {
    const cleared: FilterState = {
      dateRange: ["2019-01", "2022-12"],
      selectedRegions: [],
      selectedCountries: [],
      minFlowSize: 0,
      maxFlowSize: 10000,
      viewType: "absolute",
    }
    setFilters(cleared)
    onFiltersChange(cleared)
  }

  const removeRegion = (region: string) => {
    updateFilters({
      selectedRegions: filters.selectedRegions.filter((r) => r !== region),
    })
  }

  const removeCountry = (country: string) => {
    updateFilters({
      selectedCountries: filters.selectedCountries.filter((c) => c !== country),
    })
  }

  const hasActiveFilters =
    filters.selectedRegions.length > 0 ||
    filters.selectedCountries.length > 0 ||
    filters.minFlowSize > 0 ||
    filters.maxFlowSize < 10000

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-card to-primary/5">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5 text-primary" />
            Interactive Filters
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2">
                {filters.selectedRegions.length + filters.selectedCountries.length} active
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="text-xs">
              {isExpanded ? "Collapse" : "Expand"}
            </Button>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters} className="text-xs bg-transparent">
                Clear All
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quick View Type Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">View:</span>
          {(["absolute", "per-capita", "growth"] as const).map((type) => (
            <Button
              key={type}
              variant={filters.viewType === type ? "default" : "outline"}
              size="sm"
              onClick={() => updateFilters({ viewType: type })}
              className="text-xs"
            >
              {type === "absolute" ? "Total Flows" : type === "per-capita" ? "Per Capita" : "Growth Rate"}
            </Button>
          ))}
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2">
            {filters.selectedRegions.map((region) => (
              <Badge key={region} variant="secondary" className="flex items-center gap-1">
                <Globe className="h-3 w-3" />
                {region}
                <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => removeRegion(region)} />
              </Badge>
            ))}
            {filters.selectedCountries.map((country) => (
              <Badge key={country} variant="outline" className="flex items-center gap-1">
                {country}
                <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => removeCountry(country)} />
              </Badge>
            ))}
          </div>
        )}

        {/* Expanded Filters */}
        {isExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-border/50">
            {/* Date Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date Range
              </label>
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

            {/* Region Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Regions</label>
              <Select
                onValueChange={(value) => {
                  if (!filters.selectedRegions.includes(value)) {
                    updateFilters({ selectedRegions: [...filters.selectedRegions, value] })
                  }
                }}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Add region..." />
                </SelectTrigger>
                <SelectContent>
                  {regions
                    .filter((r) => !filters.selectedRegions.includes(r))
                    .map((region) => (
                      <SelectItem key={region} value={region}>
                        {region}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Country Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Countries</label>
              <Select
                onValueChange={(value) => {
                  if (!filters.selectedCountries.includes(value)) {
                    updateFilters({ selectedCountries: [...filters.selectedCountries, value] })
                  }
                }}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Add country..." />
                </SelectTrigger>
                <SelectContent>
                  {countries
                    .filter((c) => !filters.selectedCountries.includes(c))
                    .map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Flow Size Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Flow Size: {filters.minFlowSize} - {filters.maxFlowSize}
              </label>
              <div className="space-y-2">
                <Slider
                  value={[filters.minFlowSize]}
                  onValueChange={([value]) => updateFilters({ minFlowSize: value })}
                  max={5000}
                  step={100}
                  className="w-full"
                />
                <Slider
                  value={[filters.maxFlowSize]}
                  onValueChange={([value]) => updateFilters({ maxFlowSize: value })}
                  min={1000}
                  max={10000}
                  step={100}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
