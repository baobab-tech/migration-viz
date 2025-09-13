"use client"

import { useState, useMemo, useEffect } from "react"
import Fuse from "fuse.js"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
  Bar,
} from "recharts"
import type { MigrationFilters } from "@/lib/types"
import { TrendingUp, Calendar, BarChart3, RadarIcon, Search } from "lucide-react"

// Utility function to split corridor strings (handles both "EG-SA" and "EG → SA" formats)
const splitCorridorString = (corridorString: string): [string, string] => {
  return corridorString.includes(' → ') 
    ? corridorString.split(' → ') as [string, string]
    : corridorString.split('-') as [string, string]
}

interface TimeSeriesChartsProps {
  filters?: MigrationFilters
  initialCountryNames: Record<string, string>
  initialQuarterlyData: { month: string; total: number; season: string; quarter: number }[]
  initialSeasonalPatternsData: { month: string; average: number; max: number; min: number }[]
  initialAvailableCorridors: { value: string; label: string; total: number }[]
}

export function TimeSeriesCharts({ 
  filters = {},
  initialCountryNames,
  initialQuarterlyData,
  initialSeasonalPatternsData,
  initialAvailableCorridors
}: TimeSeriesChartsProps) {
  const [selectedCorridors, setSelectedCorridors] = useState<string[]>([])
  const [comparisonMode, setComparisonMode] = useState<"absolute" | "normalized" | "growth">("absolute")
  const [corridorData, setCorridorData] = useState<{ corridor: string; countryA: string; countryB: string; month: string; migrants: number }[]>([])
  const [countryNames] = useState<Record<string, string>>(initialCountryNames)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
  const [quarterlyData] = useState<{ month: string; total: number; season: string; quarter: number }[]>(initialQuarterlyData)
  const [seasonalPatternsData] = useState<{ month: string; average: number; max: number; min: number }[]>(initialSeasonalPatternsData)
  const [availableCorridorsData, setAvailableCorridorsData] = useState<{ value: string; label: string; total: number }[]>(initialAvailableCorridors)

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 200) // Reduced debounce time for more responsive search since it's just client-side filtering now

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Update available corridors when filters change
  useEffect(() => {
    let isCancelled = false
    
    const loadAvailableCorridors = async () => {
      try {
        const { fetchCorridorOptionsAction } = await import('@/lib/actions')
        const topCorridors = await fetchCorridorOptionsAction(filters, 200)
        
        if (!isCancelled) {
          const corridors = topCorridors.map(corridor => ({
            value: `${corridor.countryA}-${corridor.countryB}`,
            label: corridor.displayName || `${countryNames[corridor.countryA] || corridor.countryA} → ${countryNames[corridor.countryB] || corridor.countryB}`,
            total: corridor.total
          }))
          
          setAvailableCorridorsData(corridors)
          // Clear selected corridors when filters change to allow auto-selection of new top corridors
          setSelectedCorridors([])
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('Error fetching available corridors:', error)
        }
      }
    }

    // Only reload if filters have meaningful values (avoid loading on empty filters object)
    const hasSignificantFilters = Boolean(
      filters.selectedCountries?.length ||
      filters.selectedRegions?.length ||
      filters.dateRange?.length ||
      filters.excludedCountries?.length ||
      filters.excludedRegions?.length ||
      filters.minFlowSize ||
      filters.maxFlowSize
    )
    
    if (hasSignificantFilters) {
      loadAvailableCorridors()
    }
    
    return () => {
      isCancelled = true
    }
  }, [filters, countryNames])

  // Fetch corridor data when corridors change using Server Action
  useEffect(() => {
    if (selectedCorridors.length === 0) {
      setCorridorData([])

      return
    }
    
    let isCancelled = false
    
    const loadCorridorData = async () => {
      try {
        const { fetchCorridorTimeSeriesAction } = await import('@/lib/actions')
        const data = await fetchCorridorTimeSeriesAction(selectedCorridors, filters)
        if (!isCancelled) {
          setCorridorData(data)
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('Error fetching corridor data:', error)
          setCorridorData([])
        }
      }
    }

    loadCorridorData()
    
    return () => {
      isCancelled = true
    }
  }, [selectedCorridors, filters])

  // Quarterly and seasonal data now passed as props from Server Component

  // Available corridors now passed as props from Server Component

  // Process server data for the chart (React 19 compiler will auto-optimize)
  const corridorTimeSeriesData = useMemo(() => {
    if (corridorData.length === 0) return []

    const allMonths = Array.from(new Set(corridorData.map(d => d.month))).sort()
    
    // Group data by month
    const monthlyData = new Map<string, Map<string, number>>()
    corridorData.forEach((item) => {
      if (!monthlyData.has(item.month)) {
        monthlyData.set(item.month, new Map())
      }
      monthlyData.get(item.month)?.set(item.corridor, item.migrants)
    })

    return allMonths.map((month) => {
      const dataPoint: Record<string, number | string> = { month }

      selectedCorridors.forEach((corridor) => {
        // Convert corridor format for data lookup: "MX → US" -> "MX-US"
        const dataKey = corridor.includes(' → ') ? corridor.replace(' → ', '-') : corridor
        const value = monthlyData.get(month)?.get(dataKey) || 0

        if (comparisonMode === "absolute") {
          dataPoint[corridor] = value
        } else if (comparisonMode === "normalized") {
          // Get max value for this corridor across all months
          const corridorValues = corridorData
            .filter(d => d.corridor === dataKey)
            .map(d => d.migrants)
          const maxValue = Math.max(...corridorValues, 0)
          dataPoint[corridor] = maxValue > 0 ? (value / maxValue) * 100 : 0
        } else if (comparisonMode === "growth") {
          // Calculate month-over-month growth rate
          const currentIndex = allMonths.indexOf(month)
          if (currentIndex > 0) {
            const prevMonth = allMonths[currentIndex - 1]
            const prevValue = monthlyData.get(prevMonth)?.get(dataKey) || 0
            dataPoint[corridor] = prevValue > 0 ? ((value - prevValue) / prevValue) * 100 : 0
          } else {
            dataPoint[corridor] = 0
          }
        }
      })

      return dataPoint
    })
  }, [corridorData, selectedCorridors, comparisonMode])

  // Quarterly data now fetched via RPC (see useEffect above)

  // Initialize Fuse.js for corridor search
  const corridorFuse = useMemo(() => {
    if (availableCorridorsData.length === 0) return null

    const corridorData = availableCorridorsData.map((corridor) => {
      const [from, to] = splitCorridorString(corridor.value)
      
      return {
        value: corridor.value,
        label: corridor.label,
        from: countryNames[from] || from,
        to: countryNames[to] || to,
        total: corridor.total,
      }
    })

    return new Fuse(corridorData, {
      keys: [
        { name: 'label', weight: 0.7 },
        { name: 'from', weight: 0.2 },
        { name: 'to', weight: 0.1 }
      ],
      threshold: 0.3,
      includeScore: true
    })
  }, [availableCorridorsData, countryNames])

  // Get filtered search results
  const searchResults = useMemo(() => {
    if (!corridorFuse || !debouncedSearchQuery.trim()) return []
    
    return corridorFuse.search(debouncedSearchQuery)
      .slice(0, 10) // Limit to top 10 results
      .map(result => result.item)
  }, [corridorFuse, debouncedSearchQuery])

  // Auto-select top 3 corridors if none are selected
  useEffect(() => {
    if (selectedCorridors.length === 0 && availableCorridorsData.length > 0) {
      const topThree = availableCorridorsData.slice(0, 3).map(c => c.value)
      setSelectedCorridors(topThree)
    }
  }, [availableCorridorsData, selectedCorridors.length])

  const addCorridor = (corridor: string) => {
    if (!selectedCorridors.includes(corridor) && selectedCorridors.length < 8) {
      setSelectedCorridors([...selectedCorridors, corridor])
    }
  }

  const addCorridorFromSearch = (corridor: string) => {
    addCorridor(corridor)
    setSearchQuery("") // Clear search after selection
  }

  const removeCorridor = (corridor: string) => {
    setSelectedCorridors(selectedCorridors.filter((c) => c !== corridor))
  }

  const corridorColors = [
    "#1f77b4", // blue
    "#ff7f0e", // orange
    "#2ca02c", // green
    "#d62728", // red
    "#9467bd", // purple
    "#8c564b", // brown
    "#e377c2", // pink
    "#7f7f7f", // gray
  ]

  return (
    <div className="space-y-6">
      <Tabs defaultValue="multi-corridor" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="multi-corridor" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Multi-Corridor
          </TabsTrigger>
          <TabsTrigger value="quarterly" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Quarterly Patterns
          </TabsTrigger>
          <TabsTrigger value="seasonal" className="flex items-center gap-2">
            <RadarIcon className="h-4 w-4" />
            Seasonal Patterns
          </TabsTrigger>
          <TabsTrigger value="volatility" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Volatility Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="multi-corridor" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <CardTitle>Multi-Corridor Time Series Comparison</CardTitle>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">View:</span>
                    {(["absolute", "normalized", "growth"] as const).map((mode) => (
                      <Button
                        key={mode}
                        variant={comparisonMode === mode ? "default" : "outline"}
                        size="sm"
                        onClick={() => setComparisonMode(mode)}
                        className="text-xs"
                      >
                        {mode === "absolute" ? "Absolute" : mode === "normalized" ? "Normalized" : "Growth %"}
                      </Button>
                    ))}
                  </div>
                  <div className="relative w-64">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search corridors to add..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {searchResults.length > 0 && searchQuery.trim() && (
                      <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {searchResults
                          .filter((corridor) => !selectedCorridors.includes(corridor.value))
                          .map((corridor) => (
                            <button
                              key={corridor.value}
                              type="button"
                              onClick={() => addCorridorFromSearch(corridor.value)}
                              className="w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground text-sm flex items-center justify-between"
                            >
                              <span>{corridor.label}</span>
                              <span className="text-xs text-muted-foreground">
                                {(corridor.total / 1000).toFixed(0)}K
                              </span>
                            </button>
                          ))}
                        {searchResults.every((corridor) => selectedCorridors.includes(corridor.value)) && (
                          <div className="px-3 py-2 text-sm text-muted-foreground">
                            All matching corridors are already selected
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Selected Corridors */}
              <div className="flex flex-wrap gap-2">
                {selectedCorridors.map((corridor, index) => {
                  const [from, to] = splitCorridorString(corridor)

                  return (
                    <Badge
                      key={corridor}
                      variant="secondary"
                      className="flex items-center gap-2"
                      style={{ backgroundColor: `${corridorColors[index]}20`, borderColor: corridorColors[index] }}
                    >
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: corridorColors[index] }}></div>
                      {countryNames[from] || from} → {countryNames[to] || to}
                      <button 
                        type="button" 
                        onClick={() => removeCorridor(corridor)} 
                        className="ml-1 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  )
                })}
              </div>
            </CardHeader>

            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={corridorTimeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="month"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickFormatter={(value) => value.slice(0, 7)}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickFormatter={(value) =>
                        comparisonMode === "growth"
                          ? `${value.toFixed(0)}%`
                          : comparisonMode === "normalized"
                            ? `${value.toFixed(0)}`
                            : `${(value / 1000).toFixed(0)}K`
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.35)",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        backdropFilter: "blur(8px)",
                      }}
                      formatter={(value: number, name: string) => {
                        const [from, to] = splitCorridorString(name)
                        const label = `${countryNames[from] || from} → ${countryNames[to] || to}`
                        const formattedValue =
                          comparisonMode === "growth"
                            ? `${value.toFixed(1)}%`
                            : comparisonMode === "normalized"
                              ? `${value.toFixed(1)}`
                              : value.toLocaleString()

                        return [formattedValue, label]
                      }}
                    />
                    {selectedCorridors.map((corridor, index) => (
                      <Line
                        key={corridor}
                        type="monotone"
                        dataKey={corridor}
                        stroke={corridorColors[index]}
                        strokeWidth={2}
                        dot={{ fill: corridorColors[index], strokeWidth: 2, r: 3 }}
                        activeDot={{ r: 5, stroke: corridorColors[index], strokeWidth: 2 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quarterly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {filters.timeAggregation === 'yearly' ? 'Annual Migration Patterns' :
                 filters.timeAggregation === 'quarterly' ? 'Quarterly Migration Patterns' :
                 'Monthly Migration Patterns'}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {filters.timeAggregation === 'yearly' 
                  ? 'Migration flow patterns aggregated by years'
                  : filters.timeAggregation === 'quarterly' 
                    ? 'Migration flow patterns aggregated by quarters' 
                    : 'Monthly migration flows with seasonal groupings'
                }
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={quarterlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="month"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickFormatter={(value) => 
                        filters.timeAggregation === 'quarterly' 
                          ? `${value.slice(0, 4)} ${value.slice(5, 7) <= '03' ? 'Q1' : value.slice(5, 7) <= '06' ? 'Q2' : value.slice(5, 7) <= '09' ? 'Q3' : 'Q4'}`
                          : value.slice(0, 7)
                      }
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.35)",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        backdropFilter: "blur(8px)",
                      }}
                      formatter={(value: number) => [value.toLocaleString(), "Total Flows"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Quarterly Statistics */}
              <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-border/50">
                {["Q1", "Q2", "Q3", "Q4"].map((quarter) => {
                  const quarterData = quarterlyData.filter((d) => d.season === quarter)
                  const avgFlow =
                    quarterData.length > 0 ? quarterData.reduce((sum, d) => sum + d.total, 0) / quarterData.length : 0

                  return (
                    <div key={quarter} className="text-center">
                      <div className="text-2xl font-bold">
                        {Math.round(avgFlow).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">{quarter} Avg</div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seasonal" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Seasonal Migration Patterns</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {filters.timeAggregation === 'yearly' 
                    ? 'Seasonal patterns showing annual averages across years'
                    : filters.timeAggregation === 'quarterly' 
                      ? 'Seasonal patterns showing quarterly averages across years' 
                      : 'Seasonal patterns showing monthly averages across years'
                  }
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={seasonalPatternsData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <PolarRadiusAxis
                        angle={90}
                        domain={[0, "dataMax"]}
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                      />
                      <Radar
                        name="Average Flow"
                        dataKey="average"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary))"
                        fillOpacity={0.3}
                        strokeWidth={2}
                      />
                      <Radar
                        name="Max Flow"
                        dataKey="max"
                        stroke="hsl(var(--chart-2))"
                        fill="transparent"
                        strokeWidth={1}
                        strokeDasharray="5 5"
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  {filters.timeAggregation === 'yearly' ? 'Annual Flow Distribution' :
                   filters.timeAggregation === 'quarterly' ? 'Quarterly Flow Distribution' :
                   'Monthly Flow Distribution'}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {filters.timeAggregation === 'yearly' ? 'Min, average, and max flows by year' :
                   filters.timeAggregation === 'quarterly' ? 'Min, average, and max flows by quarter' :
                   'Min, average, and max flows by month'}
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={seasonalPatternsData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.35)",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        formatter={(value: number) => [value.toLocaleString(), ""]}
                      />
                      <Bar dataKey="min" fill="hsl(var(--chart-4))" opacity={0.6} />
                      <Bar dataKey="average" fill="hsl(var(--primary))" />
                      <Bar dataKey="max" fill="hsl(var(--chart-2))" opacity={0.8} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="volatility" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Migration Flow Volatility</CardTitle>
              <p className="text-sm text-muted-foreground">
                {filters.timeAggregation === 'yearly' ? 'Annual volatility patterns' :
                 filters.timeAggregation === 'quarterly' ? 'Quarterly volatility patterns' :
                 'Monthly volatility patterns'} showing flow stability and variability
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={seasonalPatternsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis
                      yAxisId="left"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="hsl(var(--chart-4))"
                      fontSize={12}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        backdropFilter: "blur(8px)",
                      }}
                      formatter={(value: number, name: string) => [
                        value.toLocaleString(),
                        name === "volatility" ? "Volatility" : "Average Flow",
                      ]}
                    />
                    <Bar yAxisId="left" dataKey="average" fill="hsl(var(--primary))" opacity={0.7} />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="volatility"
                      stroke="hsl(var(--chart-4))"
                      strokeWidth={3}
                      dot={{ fill: "hsl(var(--chart-4))", strokeWidth: 2, r: 4 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
