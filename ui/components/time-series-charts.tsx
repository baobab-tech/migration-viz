"use client"

import React, { useState, useMemo, useEffect } from "react"
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
  ReferenceLine,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
  Bar,
} from "recharts"
import { type MigrationFlow, getCorridorTimeSeriesRPC, type MigrationFilters, getCountryNameMappings } from "@/lib/queries"
import { TrendingUp, Calendar, BarChart3, RadarIcon, Search } from "lucide-react"

interface TimeSeriesChartsProps {
  data: MigrationFlow[]
  filters?: MigrationFilters
}

export function TimeSeriesCharts({ data, filters = {} }: TimeSeriesChartsProps) {
  const [selectedCorridors, setSelectedCorridors] = useState<string[]>([])
  const [comparisonMode, setComparisonMode] = useState<"absolute" | "normalized" | "growth">("absolute")
  const [corridorData, setCorridorData] = useState<{ corridor: string; countryA: string; countryB: string; month: string; migrants: number }[]>([])
  const [loading, setLoading] = useState(false)
  const [countryNames, setCountryNames] = useState<Record<string, string>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")

  // Load country names on mount
  useEffect(() => {
    const loadCountryNames = async () => {
      try {
        const names = await getCountryNameMappings()
        setCountryNames(names)
      } catch (error) {
        console.error('Error loading country names:', error)
      }
    }
    loadCountryNames()
  }, [])

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 150)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch data when corridors or filters change
  useEffect(() => {
    const fetchCorridorData = async () => {
      if (selectedCorridors.length === 0) return
      
      setLoading(true)
      try {
        const data = await getCorridorTimeSeriesRPC(selectedCorridors, filters)
        setCorridorData(data)
      } catch (error) {
        console.error('Error fetching corridor data:', error)
        setCorridorData([])
      } finally {
        setLoading(false)
      }
    }

    fetchCorridorData()
  }, [selectedCorridors, filters])

  // Process server data for the chart
  const corridorTimeSeriesData = useMemo(() => {
    if (corridorData.length === 0) return []

    // Get all unique months from server data
    const allMonths = Array.from(new Set(corridorData.map(d => d.month))).sort()
    
    // Group data by month
    const monthlyData = new Map<string, Map<string, number>>()
    corridorData.forEach((item) => {
      if (!monthlyData.has(item.month)) {
        monthlyData.set(item.month, new Map())
      }
      monthlyData.get(item.month)!.set(item.corridor, item.migrants)
    })

    // Create time series data
    const timeSeriesData = allMonths.map((month) => {
      const dataPoint: any = { month }

      selectedCorridors.forEach((corridor) => {
        const value = monthlyData.get(month)?.get(corridor) || 0

        if (comparisonMode === "absolute") {
          dataPoint[corridor] = value
        } else if (comparisonMode === "normalized") {
          // Get max value for this corridor across all months
          const corridorValues = corridorData
            .filter(d => d.corridor === corridor)
            .map(d => d.migrants)
          const maxValue = Math.max(...corridorValues, 0)
          dataPoint[corridor] = maxValue > 0 ? (value / maxValue) * 100 : 0
        } else if (comparisonMode === "growth") {
          // Calculate month-over-month growth rate
          const currentIndex = allMonths.indexOf(month)
          if (currentIndex > 0) {
            const prevMonth = allMonths[currentIndex - 1]
            const prevValue = monthlyData.get(prevMonth)?.get(corridor) || 0
            dataPoint[corridor] = prevValue > 0 ? ((value - prevValue) / prevValue) * 100 : 0
          } else {
            dataPoint[corridor] = 0
          }
        }
      })

      return dataPoint
    })

    return timeSeriesData
  }, [corridorData, selectedCorridors, comparisonMode])

  // Pandemic impact analysis
  const pandemicImpactData = useMemo(() => {
    const monthlyTotals = new Map<string, number>()
    data.forEach((flow) => {
      monthlyTotals.set(flow.month, (monthlyTotals.get(flow.month) || 0) + flow.number)
    })

    const allMonths = Array.from(monthlyTotals.keys()).sort()

    return allMonths.map((month) => {
      const isPandemic = month >= "2020-03" && month <= "2021-12"
      const isPrePandemic = month < "2020-03"
      const isPostPandemic = month > "2021-12"

      return {
        month,
        total: monthlyTotals.get(month) || 0,
        period: isPandemic ? "Pandemic" : isPrePandemic ? "Pre-Pandemic" : "Post-Pandemic",
        isPandemic,
        isPrePandemic,
        isPostPandemic,
      }
    })
  }, [data])

  // Seasonal patterns analysis
  const seasonalData = useMemo(() => {
    const monthlyPatterns = new Map<string, number[]>()

    // Group by month (01, 02, etc.) across all years
    data.forEach((flow) => {
      const month = flow.month.slice(-2) // Get MM part
      if (!monthlyPatterns.has(month)) {
        monthlyPatterns.set(month, [])
      }
      monthlyPatterns.get(month)!.push(flow.number)
    })

    // Calculate averages for each month
    const months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"]
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    return months.map((month, index) => {
      const values = monthlyPatterns.get(month) || []
      const average = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0
      const max = values.length > 0 ? Math.max(...values) : 0
      const min = values.length > 0 ? Math.min(...values) : 0

      return {
        month: monthNames[index],
        average: Math.round(average),
        max,
        min,
        volatility:
          values.length > 1
            ? Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / values.length)
            : 0,
      }
    })
  }, [data])

  // Initialize Fuse.js for corridor search
  const corridorFuse = useMemo(() => {
    if (Object.keys(countryNames).length === 0) return null
    
    const corridors = new Set<string>()
    data.forEach((flow) => {
      corridors.add(`${flow.countryA}-${flow.countryB}`)
    })

    const corridorData = Array.from(corridors).map((corridor) => {
      const [from, to] = corridor.split("-")

      return {
        value: corridor,
        label: `${countryNames[from] || from} → ${countryNames[to] || to}`,
        from: countryNames[from] || from,
        to: countryNames[to] || to,
        total: data.filter((d) => `${d.countryA}-${d.countryB}` === corridor).reduce((sum, d) => sum + d.number, 0),
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
  }, [data, countryNames])

  // Get filtered search results
  const searchResults = useMemo(() => {
    if (!corridorFuse || !debouncedSearchQuery.trim()) return []
    
    return corridorFuse.search(debouncedSearchQuery)
      .slice(0, 10) // Limit to top 10 results
      .map(result => result.item)
  }, [corridorFuse, debouncedSearchQuery])

  // Get available corridors for selection
  const availableCorridors = useMemo(() => {
    const corridors = new Set<string>()
    data.forEach((flow) => {
      corridors.add(`${flow.countryA}-${flow.countryB}`)
    })

    return Array.from(corridors)
      .map((corridor) => {
        const [from, to] = corridor.split("-")
        
        return {
          value: corridor,
          label: `${countryNames[from] || from} → ${countryNames[to] || to}`,
          total: data.filter((d) => `${d.countryA}-${d.countryB}` === corridor).reduce((sum, d) => sum + d.number, 0),
        }
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 20) // Top 20 corridors
  }, [data, countryNames])

  // Auto-select top 3 corridors if none are selected
  React.useEffect(() => {
    if (selectedCorridors.length === 0 && availableCorridors.length > 0) {
      setSelectedCorridors(availableCorridors.slice(0, 3).map(c => c.value))
    }
  }, [availableCorridors, selectedCorridors.length])

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
          <TabsTrigger value="pandemic" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Pandemic Impact
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
                  const [from, to] = corridor.split("-")

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
                        const [from, to] = name.split("-")
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

        <TabsContent value="pandemic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pandemic Impact Analysis</CardTitle>
              <p className="text-sm text-muted-foreground">
                Migration flow changes before, during, and after the COVID-19 pandemic
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={pandemicImpactData}>
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
                    <ReferenceLine x="2020-03" stroke="hsl(var(--destructive))" strokeDasharray="5 5" />
                    <ReferenceLine x="2022-01" stroke="hsl(var(--chart-1))" strokeDasharray="5 5" />
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

              {/* Pandemic Statistics */}
              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border/50">
                {["Pre-Pandemic", "Pandemic", "Post-Pandemic"].map((period, index) => {
                  const periodData = pandemicImpactData.filter((d) => d.period === period)
                  const avgFlow =
                    periodData.length > 0 ? periodData.reduce((sum, d) => sum + d.total, 0) / periodData.length : 0
                  const colors = ["hsl(var(--chart-1))", "hsl(var(--destructive))", "hsl(var(--chart-2))"]

                  return (
                    <div key={period} className="text-center">
                      <div className="text-2xl font-bold" style={{ color: colors[index] }}>
                        {Math.round(avgFlow).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">{period} Avg</div>
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
                <p className="text-sm text-muted-foreground">Average monthly migration flows across all years</p>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={seasonalData}>
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
                <CardTitle>Monthly Flow Distribution</CardTitle>
                <p className="text-sm text-muted-foreground">Min, average, and max flows by month</p>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={seasonalData}>
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
                Monthly volatility patterns showing flow stability and variability
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={seasonalData}>
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
