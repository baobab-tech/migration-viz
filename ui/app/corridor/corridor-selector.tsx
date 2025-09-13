"use client"

import { useState, useMemo, useCallback, useEffect, useId } from "react"
import { useRouter } from "next/navigation"
import Fuse from "fuse.js"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Search, Globe, X, Loader2 } from "lucide-react"

interface CorridorSelectorProps {
  availableCountries: {
    iso2Code: string
    countryName: string
    regionName: string
    hasOutboundFlows: boolean
    hasInboundFlows: boolean
    totalFlowVolume: number
  }[]
  initialFromCountries: string[]
  initialToCountries: string[]
  initialFromRegions: string[]
  initialToRegions: string[]
}

interface SearchResult {
  type: 'country' | 'region' | 'world'
  id: string
  name: string
  score: number
}

export function CorridorSelector({ 
  availableCountries,
  initialFromCountries,
  initialToCountries,
  initialFromRegions,
  initialToRegions
}: CorridorSelectorProps) {
  const router = useRouter()
  const fromInputId = useId()
  const toInputId = useId()
  
  const [fromCountries, setFromCountries] = useState<string[]>(initialFromCountries)
  const [toCountries, setToCountries] = useState<string[]>(initialToCountries)
  const [fromRegions, setFromRegions] = useState<string[]>(initialFromRegions)
  const [toRegions, setToRegions] = useState<string[]>(initialToRegions)
  
  // Search states
  const [fromSearchQuery, setFromSearchQuery] = useState("")
  const [toSearchQuery, setToSearchQuery] = useState("")
  const [debouncedFromSearch, setDebouncedFromSearch] = useState("")
  const [debouncedToSearch, setDebouncedToSearch] = useState("")
  const [isLoadingData, setIsLoadingData] = useState(false)

  // Check if "World" is selected for from or to
  const isFromWorld = fromCountries.length === 0 && fromRegions.length === 0
  const isToWorld = toCountries.length === 0 && toRegions.length === 0

  // Debounce search queries
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFromSearch(fromSearchQuery)
    }, 200)
    
    return () => clearTimeout(timer)
  }, [fromSearchQuery])
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedToSearch(toSearchQuery)
    }, 200)
    
    return () => clearTimeout(timer)
  }, [toSearchQuery])

  // Get available regions from countries
  const availableRegions = useMemo(() => {
    const regions = new Set<string>()
    availableCountries.forEach(country => {
      if (country.regionName) {
        regions.add(country.regionName)
      }
    })

    return Array.from(regions).sort()
  }, [availableCountries])

  // Create Fuse instance for searching countries
  const countryFuse = useMemo(() => {
    return new Fuse(availableCountries, {
      keys: [
        { name: 'countryName', weight: 0.7 },
        { name: 'iso2Code', weight: 0.3 }
      ],
      threshold: 0.3,
      includeScore: true,
      minMatchCharLength: 1
    })
  }, [availableCountries])

  // Create Fuse instance for searching regions
  const regionFuse = useMemo(() => {
    return new Fuse(availableRegions, {
      threshold: 0.3,
      includeScore: true,
      minMatchCharLength: 1
    })
  }, [availableRegions])

  // Search results for "from" selector
  const fromSearchResults = useMemo((): SearchResult[] => {
    if (debouncedFromSearch.length <= 1) return []

    const results: SearchResult[] = []

    // Add World option
    if ('world'.includes(debouncedFromSearch.toLowerCase()) && !isFromWorld) {
      results.push({
        type: 'world',
        id: 'world',
        name: 'World (All Origins)',
        score: 0
      })
    }

    // Search countries - exclude already selected from countries and to countries (prevent circular flows)
    const countryResults: SearchResult[] = countryFuse
      .search(debouncedFromSearch)
      .slice(0, 6)
      .filter(result => 
        result.item.hasOutboundFlows && 
        !fromCountries.includes(result.item.iso2Code) &&
        !toCountries.includes(result.item.iso2Code) // Prevent circular selection
      )
      .map((result) => ({
        type: 'country' as const,
        id: result.item.iso2Code,
        name: result.item.countryName,
        score: result.score || 0
      }))
    results.push(...countryResults)

    // Search regions
    const regionResults: SearchResult[] = regionFuse
      .search(debouncedFromSearch)
      .slice(0, 4)
      .filter(result => !fromRegions.includes(result.item))
      .map((result) => ({
        type: 'region' as const,
        id: result.item,
        name: result.item,
        score: result.score || 0
      }))
    results.push(...regionResults)

    return results.sort((a, b) => a.score - b.score).slice(0, 10)
  }, [countryFuse, regionFuse, debouncedFromSearch, fromCountries, fromRegions, toCountries, isFromWorld])

  // Search results for "to" selector
  const toSearchResults = useMemo((): SearchResult[] => {
    if (debouncedToSearch.length <= 1) return []

    const results: SearchResult[] = []

    // Add World option
    if ('world'.includes(debouncedToSearch.toLowerCase()) && !isToWorld) {
      results.push({
        type: 'world',
        id: 'world',
        name: 'World (All Destinations)',
        score: 0
      })
    }

    // Search countries - exclude already selected to countries and from countries (prevent circular flows)
    const countryResults: SearchResult[] = countryFuse
      .search(debouncedToSearch)
      .slice(0, 6)
      .filter(result => 
        result.item.hasInboundFlows && 
        !toCountries.includes(result.item.iso2Code) &&
        !fromCountries.includes(result.item.iso2Code) // Prevent circular selection
      )
      .map((result) => ({
        type: 'country' as const,
        id: result.item.iso2Code,
        name: result.item.countryName,
        score: result.score || 0
      }))
    results.push(...countryResults)

    // Search regions
    const regionResults: SearchResult[] = regionFuse
      .search(debouncedToSearch)
      .slice(0, 4)
      .filter(result => !toRegions.includes(result.item))
      .map((result) => ({
        type: 'region' as const,
        id: result.item,
        name: result.item,
        score: result.score || 0
      }))
    results.push(...regionResults)

    return results.sort((a, b) => a.score - b.score).slice(0, 10)
  }, [countryFuse, regionFuse, debouncedToSearch, toCountries, toRegions, fromCountries, isToWorld])

  // Get country name by code
  const getCountryName = useCallback((countryCode: string) => {
    const country = availableCountries.find(c => c.iso2Code === countryCode)

    return country?.countryName || countryCode
  }, [availableCountries])

  // Update URL when selection changes (debounced)
  const updateURL = useCallback(() => {
    const params = new URLSearchParams()
    
    if (fromCountries.length > 0) {
      params.set('fromCountries', fromCountries.join(','))
    }
    if (toCountries.length > 0) {
      params.set('toCountries', toCountries.join(','))
    }
    if (fromRegions.length > 0) {
      params.set('fromRegions', fromRegions.join(','))
    }
    if (toRegions.length > 0) {
      params.set('toRegions', toRegions.join(','))
    }
    
    const newURL = `/corridor${params.toString() ? `?${params.toString()}` : ''}`
    setIsLoadingData(true)
    router.replace(newURL, { scroll: false })
    
    // Clear loading state after data should have loaded
    setTimeout(() => {
      setIsLoadingData(false)
    }, 2000) // 2 second timeout for data loading
  }, [router, fromCountries, toCountries, fromRegions, toRegions])

  // Debounced URL update effect
  useEffect(() => {
    const timer = setTimeout(() => {
      updateURL()
    }, 500) // 500ms debounce
    
    return () => clearTimeout(timer)
  }, [updateURL])

  // Show visuals with smooth scroll (no URL update)
  const showVisuals = useCallback(() => {
    const visualsElement = document.getElementById('visuals-section')
    if (visualsElement) {
      visualsElement.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      })
    }
  }, [])

  // Handle selections
  const addFromItem = useCallback((result: SearchResult) => {
    if (result.type === 'world') {
      // Clear all selections for "World"
      setFromCountries([])
      setFromRegions([])
    } else if (result.type === 'country') {
      setFromCountries(prev => [...prev, result.id])
    } else if (result.type === 'region') {
      setFromRegions(prev => [...prev, result.id])
    }
    setFromSearchQuery("")
  }, [])

  const addToItem = useCallback((result: SearchResult) => {
    if (result.type === 'world') {
      // Clear all selections for "World"
      setToCountries([])
      setToRegions([])
    } else if (result.type === 'country') {
      setToCountries(prev => [...prev, result.id])
    } else if (result.type === 'region') {
      setToRegions(prev => [...prev, result.id])
    }
    setToSearchQuery("")
  }, [])

  const removeFromCountry = useCallback((countryCode: string) => {
    setFromCountries(prev => prev.filter(c => c !== countryCode))
  }, [])

  const removeToCountry = useCallback((countryCode: string) => {
    setToCountries(prev => prev.filter(c => c !== countryCode))
  }, [])

  const removeFromRegion = useCallback((region: string) => {
    setFromRegions(prev => prev.filter(r => r !== region))
  }, [])

  const removeToRegion = useCallback((region: string) => {
    setToRegions(prev => prev.filter(r => r !== region))
  }, [])

  const clearFromSelections = useCallback(() => {
    setFromCountries([])
    setFromRegions([])
  }, [])

  const clearToSelections = useCallback(() => {
    setToCountries([])
    setToRegions([])
  }, [])

  const getCorridorTitle = () => {
    const fromLabel = isFromWorld ? 'World' : 
      [...fromCountries.map(getCountryName), ...fromRegions].join(', ') || 'Selected Origins'
    const toLabel = isToWorld ? 'World' : 
      [...toCountries.map(getCountryName), ...toRegions].join(', ') || 'Selected Destinations'

    return `${fromLabel} → ${toLabel}`
  }

  return (
    <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
      <CardContent className="p-6">
        <div className="relative flex flex-col lg:flex-row items-center gap-8 max-w-6xl mx-auto">
          {/* Background Arrow - positioned to not overlap content */}
          <div className="absolute top-2/5 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0">
            <svg 
              width="100" 
              height="80" 
              viewBox="0 0 200 80" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              className="opacity-30"
              aria-hidden="true"
            >
              <path 
                d="M20 30h120v-15l40 25-40 25v-15H20z" 
                fill="#9CA3AF" 
                className="dark:fill-slate-500"
              />
            </svg>
          </div>
          {/* From Section */}
          <div className="flex-1 space-y-4 w-full min-h-[150px] flex flex-col">
            <label htmlFor={fromInputId} className="text-sm font-semibold text-center block">Origins</label>
            
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id={fromInputId}
                placeholder={`Search origins (countries, regions) or type 'World'...${toCountries.length > 0 ? '' : ''}`}
                value={fromSearchQuery}
                onChange={(e) => setFromSearchQuery(e.target.value)}
                className="pl-10 h-12 text-base border-2 hover:border-blue-300 transition-colors"
              />
              {fromSearchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {fromSearchResults.map((result) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      type="button"
                      onClick={() => addFromItem(result)}
                      className="w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground text-sm flex items-center gap-2"
                    >
                      {result.type === 'world' ? (
                        <Globe className="h-3 w-3 text-green-500" />
                      ) : result.type === 'region' ? (
                        <Globe className="h-3 w-3 text-blue-500" />
                      ) : (
                        <Globe className="h-3 w-3 text-slate-500" />
                      )}
                      <span className="flex items-center gap-1">
                        {result.type === 'world' && (
                          <span className="text-xs bg-green-100 text-green-800 px-1 rounded dark:bg-green-900/20 dark:text-green-300">World</span>
                        )}
                        {result.type === 'region' && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded dark:bg-blue-900/20 dark:text-blue-300">Region</span>
                        )}
                        {result.name} {result.type === 'country' && `(${result.id})`}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* World Selection Display */}
            {isFromWorld && (
              <div className="flex justify-center">
                <Badge variant="outline" className="text-sm bg-green-50 text-green-700 border-green-200">
                  <Globe className="h-3 w-3 mr-1" />
                  World (All Origins)
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer hover:text-destructive"
                    onClick={clearFromSelections}
                  />
                </Badge>
              </div>
            )}

            {/* Selected Items Display */}
            <div className="flex-1 min-h-[10px]">
              {!isFromWorld && (fromCountries.length > 0 || fromRegions.length > 0) && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Selected:</span>
                    <Button variant="ghost" size="sm" onClick={clearFromSelections} className="text-xs h-6">
                      Clear All
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {fromRegions.map((region) => (
                      <Badge key={region} variant="secondary" className="text-xs flex items-center gap-1">
                        <Globe className="h-3 w-3 text-blue-500" />
                        {region}
                        <X
                          className="h-3 w-3 cursor-pointer hover:text-destructive"
                          onClick={() => removeFromRegion(region)}
                        />
                      </Badge>
                    ))}
                    {fromCountries.map((country) => (
                      <Badge key={country} variant="outline" className="text-xs flex items-center gap-1">
                        {getCountryName(country)}
                        <X
                          className="h-3 w-3 cursor-pointer hover:text-destructive"
                          onClick={() => removeFromCountry(country)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Spacer for layout */}
          <div className="flex-shrink-0 lg:w-8 lg:block hidden"></div>

          {/* To Section */}
          <div className="flex-1 space-y-4 w-full min-h-[150px] flex flex-col">
            <label htmlFor={toInputId} className="text-sm font-semibold text-center block">Destinations</label>
            
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id={toInputId}
                placeholder={`Search destinations (countries, regions) or type 'World'...${fromCountries.length > 0 ? ' (excludes selected origins)' : ''}`}
                value={toSearchQuery}
                onChange={(e) => setToSearchQuery(e.target.value)}
                className="pl-10 h-12 text-base border-2 hover:border-purple-300 transition-colors"
              />
              {toSearchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {toSearchResults.map((result) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      type="button"
                      onClick={() => addToItem(result)}
                      className="w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground text-sm flex items-center gap-2"
                    >
                      {result.type === 'world' ? (
                        <Globe className="h-3 w-3 text-green-500" />
                      ) : result.type === 'region' ? (
                        <Globe className="h-3 w-3 text-blue-500" />
                      ) : (
                        <Globe className="h-3 w-3 text-slate-500" />
                      )}
                      <span className="flex items-center gap-1">
                        {result.type === 'world' && (
                          <span className="text-xs bg-green-100 text-green-800 px-1 rounded dark:bg-green-900/20 dark:text-green-300">World</span>
                        )}
                        {result.type === 'region' && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded dark:bg-blue-900/20 dark:text-blue-300">Region</span>
                        )}
                        {result.name} {result.type === 'country' && `(${result.id})`}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* World Selection Display */}
            {isToWorld && (
              <div className="flex justify-center">
                <Badge variant="outline" className="text-sm bg-green-50 text-green-700 border-green-200">
                  <Globe className="h-3 w-3 mr-1" />
                  World (All Destinations)
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer hover:text-destructive"
                    onClick={clearToSelections}
                  />
                </Badge>
              </div>
            )}

            {/* Selected Items Display */}
            <div className="flex-1 min-h-[10px]">
              {!isToWorld && (toCountries.length > 0 || toRegions.length > 0) && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Selected:</span>
                    <Button variant="ghost" size="sm" onClick={clearToSelections} className="text-xs h-6">
                      Clear All
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {toRegions.map((region) => (
                      <Badge key={region} variant="secondary" className="text-xs flex items-center gap-1">
                        <Globe className="h-3 w-3 text-blue-500" />
                        {region}
                        <X
                          className="h-3 w-3 cursor-pointer hover:text-destructive"
                          onClick={() => removeToRegion(region)}
                        />
                      </Badge>
                    ))}
                    {toCountries.map((country) => (
                      <Badge key={country} variant="outline" className="text-xs flex items-center gap-1">
                        {getCountryName(country)}
                        <X
                          className="h-3 w-3 cursor-pointer hover:text-destructive"
                          onClick={() => removeToCountry(country)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Current Selection Summary with Show Visuals Button */}
        <div className="mt-6 text-center space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {getCorridorTitle()}
          </h3>
          <Button 
            onClick={showVisuals} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 text-base font-medium"
            disabled={(!isFromWorld && fromCountries.length === 0 && fromRegions.length === 0) || 
                     (!isToWorld && toCountries.length === 0 && toRegions.length === 0) || 
                     isLoadingData}
          >
            {isLoadingData ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading Analysis...
              </>
            ) : (
              "View Analysis ↓"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}