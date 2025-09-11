"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { countries, type MigrationFlow, getCountryName } from "@/lib/queries"
import { worldMapPaths, countryCentroids } from "./world-map-data"
import { Globe, Filter } from "lucide-react"

interface GlobalFlowMapProps {
  data: MigrationFlow[]
}

interface FlowConnection {
  from: { code: string; name: string; lat: number; lng: number; x: number; y: number }
  to: { code: string; name: string; lat: number; lng: number; x: number; y: number }
  flow: number
  isHighlighted: boolean
}

export function GlobalFlowMap({ data }: GlobalFlowMapProps) {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [flowThreshold, setFlowThreshold] = useState([1000])
  const [viewMode, setViewMode] = useState<"inbound" | "outbound" | "net">("outbound")
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null)

  const projectToSVG = (lat: number, lng: number) => {
    // Mercator projection adapted for SVG viewBox
    const x = ((lng + 180) / 360) * 800 + 50
    const y = ((90 - lat) / 180) * 400 + 50
    
    return { x, y }
  }

  // Process data to create flow connections
  const flowConnections = useMemo(() => {
    const connections: FlowConnection[] = []
    const countryFlows = new Map<string, { inbound: number; outbound: number }>()

    // Aggregate flows by country pairs
    const pairFlows = new Map<string, number>()
    data.forEach((flow) => {
      const key = `${flow.countryA}-${flow.countryB}`
      pairFlows.set(key, (pairFlows.get(key) || 0) + flow.number)

      // Track country totals
      const fromStats = countryFlows.get(flow.countryA) || { inbound: 0, outbound: 0 }
      const toStats = countryFlows.get(flow.countryB) || { inbound: 0, outbound: 0 }
      fromStats.outbound += flow.number
      toStats.inbound += flow.number
      countryFlows.set(flow.countryA, fromStats)
      countryFlows.set(flow.countryB, toStats)
    })

    // Create connections for visualization
    pairFlows.forEach((flow, key) => {
      const [fromCode, toCode] = key.split("-")
      const fromCentroid = countryCentroids[fromCode]
      const toCentroid = countryCentroids[toCode]
      const fromCountry = countries.find((c) => c.code === fromCode)
      const toCountry = countries.find((c) => c.code === toCode)

      if (fromCentroid && toCentroid && fromCountry && toCountry && flow >= flowThreshold[0]) {
        const fromPos = projectToSVG(fromCentroid.lat, fromCentroid.lng)
        const toPos = projectToSVG(toCentroid.lat, toCentroid.lng)

        const isHighlighted =
          !selectedCountry ||
          (viewMode === "outbound" && fromCode === selectedCountry) ||
          (viewMode === "inbound" && toCode === selectedCountry) ||
          (viewMode === "net" && (fromCode === selectedCountry || toCode === selectedCountry))

        connections.push({
          from: { code: fromCode, name: fromCountry.name, lat: fromCentroid.lat, lng: fromCentroid.lng, ...fromPos },
          to: { code: toCode, name: toCountry.name, lat: toCentroid.lat, lng: toCentroid.lng, ...toPos },
          flow,
          isHighlighted,
        })
      }
    })

    return connections.sort((a, b) => a.flow - b.flow) // Draw smaller flows first
  }, [data, flowThreshold, selectedCountry, viewMode, projectToSVG])

  // Get country statistics
  const countryStats = useMemo(() => {
    const stats = new Map<string, { inbound: number; outbound: number; net: number }>()
    data.forEach((flow) => {
      const fromStats = stats.get(flow.countryA) || { inbound: 0, outbound: 0, net: 0 }
      const toStats = stats.get(flow.countryB) || { inbound: 0, outbound: 0, net: 0 }
      fromStats.outbound += flow.number
      toStats.inbound += flow.number
      stats.set(flow.countryA, fromStats)
      stats.set(flow.countryB, toStats)
    })

    // Calculate net flows
    stats.forEach((stat, country) => {
      stat.net = stat.inbound - stat.outbound
    })

    return stats
  }, [data])

  // Create curved path for flow lines
  const createCurvedPath = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const dx = to.x - from.x
    const dy = to.y - from.y
    const dr = Math.sqrt(dx * dx + dy * dy)
    const curvature = 0.3
    const midX = (from.x + to.x) / 2 + dy * curvature
    const midY = (from.y + to.y) / 2 - dx * curvature
    return `M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`
  }

  const getCountryColor = (countryCode: string) => {
    if (selectedCountry === countryCode) return "hsl(var(--primary))"
    if (hoveredCountry === countryCode) return "hsl(var(--chart-2))"

    const stats = countryStats.get(countryCode)
    if (!stats) return "hsl(var(--muted-foreground))"

    if (viewMode === "net") {
      return stats.net > 0 ? "hsl(var(--chart-1))" : "hsl(var(--chart-4))"
    }
    return "hsl(var(--chart-3))"
  }

  const getCountryOpacity = (countryCode: string) => {
    const stats = countryStats.get(countryCode)
    if (!stats) return 0.3

    const value =
      viewMode === "inbound" ? stats.inbound : viewMode === "outbound" ? stats.outbound : Math.abs(stats.net)

    // Scale opacity based on migration volume
    const maxValue = Math.max(
      ...Array.from(countryStats.values()).map((s) =>
        viewMode === "inbound" ? s.inbound : viewMode === "outbound" ? s.outbound : Math.abs(s.net),
      ),
    )

    return Math.max(0.2, Math.min(0.8, value / maxValue))
  }

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Global Migration Flow Map
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Interactive world map showing migration flows between countries
            </p>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {/* View Mode Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">View:</span>
              {(["outbound", "inbound", "net"] as const).map((mode) => (
                <Button
                  key={mode}
                  variant={viewMode === mode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode(mode)}
                  className="text-xs"
                >
                  {mode === "outbound" ? "Outbound" : mode === "inbound" ? "Inbound" : "Net Flow"}
                </Button>
              ))}
            </div>

            {/* Country Selector */}
            <Select
              value={selectedCountry || "all"}
              onValueChange={(value) => setSelectedCountry(value === "all" ? null : value)}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select country to highlight..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                {Object.keys(countryCentroids).map((countryCode) => (
                  <SelectItem key={countryCode} value={countryCode}>
                    {getCountryName(countryCode)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Flow Threshold Slider */}
        <div className="flex items-center gap-4 pt-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Min Flow Size:</span>
          <div className="flex-1 max-w-xs">
            <Slider
              value={flowThreshold}
              onValueChange={setFlowThreshold}
              max={5000}
              min={0}
              step={100}
              className="w-full"
            />
          </div>
          <Badge variant="outline">{flowThreshold[0].toLocaleString()}</Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="relative">
          <svg
            viewBox="0 0 900 500"
            className="w-full h-96 border border-border/50 rounded-lg bg-gradient-to-br from-background to-primary/5"
          >
            {/* Ocean background */}
            <rect width="100%" height="100%" fill="hsl(var(--primary-light))" opacity="0.1" />

            {/* Country boundaries */}
            <g className="country-boundaries">
              {Object.entries(worldMapPaths).map(([countryCode, path]) => (
                <path
                  key={countryCode}
                  d={path}
                  fill={getCountryColor(countryCode)}
                  fillOpacity={getCountryOpacity(countryCode)}
                  stroke="hsl(var(--border))"
                  strokeWidth="1"
                  className="cursor-pointer transition-all duration-200 hover:stroke-primary hover:stroke-2"
                  onMouseEnter={() => setHoveredCountry(countryCode)}
                  onMouseLeave={() => setHoveredCountry(null)}
                  onClick={() => setSelectedCountry(selectedCountry === countryCode ? null : countryCode)}
                />
              ))}
            </g>

            {/* Flow Lines */}
            <g className="flow-lines">
              {flowConnections.map((connection, index) => {
                const opacity = connection.isHighlighted ? 0.8 : 0.2
                const strokeWidth = Math.max(1, Math.sqrt(connection.flow / 1000))
                return (
                  <path
                    key={index}
                    d={createCurvedPath(connection.from, connection.to)}
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth={strokeWidth}
                    opacity={opacity}
                    className="transition-opacity duration-200"
                  />
                )
              })}
            </g>

            {/* Country Labels for Selected/Hovered */}
            <g className="country-labels">
              {Object.entries(countryCentroids).map(([countryCode, centroid]) => {
                if (selectedCountry !== countryCode && hoveredCountry !== countryCode) return null

                const pos = projectToSVG(centroid.lat, centroid.lng)
                return (
                  <text
                    key={countryCode}
                    x={pos.x}
                    y={pos.y - 8}
                    textAnchor="middle"
                    className="text-xs font-medium fill-foreground pointer-events-none"
                    style={{
                      textShadow: "1px 1px 2px hsl(var(--background))",
                      filter: "drop-shadow(0 0 2px hsl(var(--background)))",
                    }}
                  >
                    {getCountryName(countryCode)}
                  </text>
                )
              })}
            </g>
          </svg>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm border border-border/50 rounded-lg p-3 space-y-2">
            <div className="text-sm font-medium">Legend</div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full bg-primary"></div>
              <span>Selected Country</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-2 h-0.5 bg-primary"></div>
              <span>Migration Flow</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Circle size = {viewMode === "net" ? "Net migration" : `${viewMode} flows`}
            </div>
          </div>

          {/* Selected Country Info */}
          {selectedCountry && (
            <div className="absolute top-4 right-4 bg-card/90 backdrop-blur-sm border border-border/50 rounded-lg p-4 min-w-48">
              <div className="font-medium text-sm mb-2">{getCountryName(selectedCountry)}</div>
              {countryStats.get(selectedCountry) && (
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Inbound:</span>
                    <span className="font-medium">{countryStats.get(selectedCountry)!.inbound.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Outbound:</span>
                    <span className="font-medium">{countryStats.get(selectedCountry)!.outbound.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t border-border/50 pt-1">
                    <span>Net:</span>
                    <span
                      className={`font-medium ${
                        countryStats.get(selectedCountry)!.net > 0 ? "text-chart-1" : "text-chart-4"
                      }`}
                    >
                      {countryStats.get(selectedCountry)!.net > 0 ? "+" : ""}
                      {countryStats.get(selectedCountry)!.net.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-border/50">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{flowConnections.length}</div>
            <div className="text-xs text-muted-foreground">Visible Flows</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-chart-2">
              {flowConnections.reduce((sum, conn) => sum + conn.flow, 0).toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Total Volume</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-chart-3">
              {new Set(flowConnections.flatMap((conn) => [conn.from.code, conn.to.code])).size}
            </div>
            <div className="text-xs text-muted-foreground">Countries Involved</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-chart-4">
              {flowConnections.length > 0
                ? Math.round(
                    flowConnections.reduce((sum, conn) => sum + conn.flow, 0) / flowConnections.length,
                  ).toLocaleString()
                : 0}
            </div>
            <div className="text-xs text-muted-foreground">Avg Flow Size</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
