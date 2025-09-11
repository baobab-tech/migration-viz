"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { ResponsiveSankey } from '@nivo/sankey'
import { DashboardGrid, DashboardCard } from "@/components/dashboard-layout"

interface DashboardChartsProps {
  monthlyData: { month: string; total: number }[]
  topCorridors: { corridor: string; total: number; countryA: string; countryB: string; displayName: string }[]
  summaryStats: {
    totalFlows: number
    uniqueCorridors: number
    activeMonths: number
    avgMonthlyFlow: number
  }
  countryNames: Record<string, string>
}

// Transform corridor data for Sankey diagram with country name mappings
function transformCorridorsToSankey(
  corridors: { corridor: string; total: number; countryA: string; countryB: string; displayName: string }[],
  countryNames: Record<string, string>
) {
  const nodes: { id: string }[] = []
  const links: { source: string; target: string; value: number }[] = []
  const nodeIds = new Set<string>()
  const flowMap = new Map<string, { value: number; source: string; target: string }>()

  corridors.forEach(({ countryA, countryB, total }) => {
    // Use full country names for node IDs
    const nameA = countryNames[countryA] || countryA
    const nameB = countryNames[countryB] || countryB
    
    // Add unique nodes
    if (!nodeIds.has(nameA)) {
      nodes.push({ id: nameA })
      nodeIds.add(nameA)
    }
    if (!nodeIds.has(nameB)) {
      nodes.push({ id: nameB })
      nodeIds.add(nameB)
    }

    // Create a normalized key for bidirectional flows (alphabetical order)
    const pairKey = [nameA, nameB].sort().join('↔')
    
    if (flowMap.has(pairKey)) {
      // If we already have this pair, calculate net flow
      const existing = flowMap.get(pairKey)
      if (existing) {
        // Determine the dominant flow direction
        if (existing.source === nameA && existing.target === nameB) {
          // Same direction - add values
          existing.value += total
        } else {
          // Opposite direction - calculate net flow
          if (total > existing.value) {
            // New flow is larger - reverse direction
            existing.source = nameA
            existing.target = nameB
            existing.value = total - existing.value
          } else {
            // Existing flow is larger or equal - keep direction
            existing.value = existing.value - total
          }
        }
      }
    } else {
      // First time seeing this pair
      flowMap.set(pairKey, {
        source: nameA,
        target: nameB,
        value: total
      })
    }
  })

  // Convert map to links array, filtering out zero or negative flows
  flowMap.forEach(({ source, target, value }) => {
    if (value > 0) {
      links.push({ source, target, value })
    }
  })

  return { nodes, links }
}

export function DashboardCharts({ monthlyData, topCorridors, summaryStats, countryNames }: DashboardChartsProps) {
  const sankeyData = transformCorridorsToSankey(topCorridors, countryNames)

  return (
    <>
      {/* Summary Statistics */}
      <DashboardGrid columns={4}>
        <DashboardCard title="Total Migration Flows" className="bg-gradient-to-br from-primary/10 to-primary/5">
          <div className="text-3xl font-bold text-primary">{summaryStats.totalFlows.toLocaleString()}</div>
          <p className="text-sm text-muted-foreground mt-1">Across {summaryStats.uniqueCorridors} corridors</p>
        </DashboardCard>

        <DashboardCard title="Active Corridors" className="bg-gradient-to-br from-chart-2/10 to-chart-2/5">
          <div className="text-3xl font-bold text-chart-2">{summaryStats.uniqueCorridors}</div>
          <p className="text-sm text-muted-foreground mt-1">Country-to-country routes</p>
        </DashboardCard>

        <DashboardCard title="Average Monthly Flow" className="bg-gradient-to-br from-chart-3/10 to-chart-3/5">
          <div className="text-3xl font-bold text-chart-3">{Math.round(summaryStats.avgMonthlyFlow).toLocaleString()}</div>
          <p className="text-sm text-muted-foreground mt-1">Per month average</p>
        </DashboardCard>

        <DashboardCard title="Time Period" className="bg-gradient-to-br from-chart-4/10 to-chart-4/5">
          <div className="text-3xl font-bold text-chart-4">{summaryStats.activeMonths}</div>
          <p className="text-sm text-muted-foreground mt-1">Months of data</p>
        </DashboardCard>
      </DashboardGrid>

      {/* Main Visualizations */}
      <DashboardGrid columns={2}>
        <DashboardCard
          title="Migration Flows Over Time"
          description="Monthly aggregated migration flows showing temporal patterns and pandemic impact"
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
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
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: "hsl(var(--primary))", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </DashboardCard>

        <DashboardCard title="Top Migration Corridors" description="Migration flows visualized as connected pathways with proportional width">
          <div className="h-80">
            <ResponsiveSankey
              data={sankeyData}
              margin={{ top: 40, right: 160, bottom: 40, left: 100 }}
              align="justify"
              colors={{ scheme: 'category10' }}
              nodeOpacity={1}
              nodeHoverOpacity={0.8}
              nodeThickness={18}
              nodeSpacing={24}
              nodeBorderWidth={0}
              nodeBorderRadius={3}
              linkOpacity={0.5}
              linkHoverOpacity={0.6}
              linkHoverOthersOpacity={0.1}
              enableLinkGradient={true}
              labelPosition="outside"
              labelOrientation="horizontal"
              labelPadding={16}
              labelTextColor={{
                from: 'color',
                modifiers: [['darker', 1]]
              }}
              legends={[]}
              linkTooltip={({ link }) => (
                <div className="bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-gray-200">
                  <div className="font-semibold text-gray-900 w-60">
                    {link.source.id} → {link.target.id}
                  </div>
                  <div className="text-sm text-gray-600">
                    Migration Flow: {link.value.toLocaleString()}
                  </div>
                </div>
              )}
            />
          </div>
        </DashboardCard>
      </DashboardGrid>
    </>
  )
}
