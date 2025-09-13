"use client"

import { useMemo, useId } from "react"
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts"

interface CorridorTimelineChartProps {
  fromCountries: string[]
  toCountries: string[]
  fromRegions: string[]
  toRegions: string[]
  data: {
    corridor: string
    countryFrom: string
    countryTo: string
    month: string
    migrants: number
  }[]
}

export function CorridorTimelineChart({ fromCountries, toCountries, fromRegions, toRegions, data }: CorridorTimelineChartProps) {
  const gradientId = useId()
  const timelineData = useMemo(() => {
    if (!data || data.length === 0) {
      // Return empty data structure
      return []
    }

    // Process the real data - group by year and sum migrants
    const yearlyData: Record<string, number> = {}
    
    data.forEach(entry => {
      const year = new Date(entry.month).getFullYear().toString()
      if (!yearlyData[year]) {
        yearlyData[year] = 0
      }
      yearlyData[year] += entry.migrants
    })

    // Convert to chart format and sort by year
    return Object.entries(yearlyData)
      .map(([year, flow]) => ({
        year,
        flow,
        date: `${year}-01-01`,
      }))
      .sort((a, b) => parseInt(a.year) - parseInt(b.year))
  }, [data])

  const getCorridorLabel = () => {
    if (!data || data.length === 0) return "No Data Available"
    
    // Check if World is selected (no filters)
    const isFromWorld = fromCountries.length === 0 && fromRegions.length === 0
    const isToWorld = toCountries.length === 0 && toRegions.length === 0
    
    if (isFromWorld && isToWorld) {
      
      return "Global Migration"
    }
    if (isFromWorld) {
      const toLabel = [...toCountries, ...toRegions].join(', ') || 'Selected Destinations'
      
      return `All Origins → ${toLabel}`
    }
    if (isToWorld) {
      const fromLabel = [...fromCountries, ...fromRegions].join(', ') || 'Selected Origins'
      
      return `${fromLabel} → All Destinations`
    }
    
    const fromLabel = [...fromCountries, ...fromRegions].join(', ') || 'Selected Origins'
    const toLabel = [...toCountries, ...toRegions].join(', ') || 'Selected Destinations'
    
    return `${fromLabel} → ${toLabel}`
  }

  const maxFlow = timelineData.length > 0 ? Math.max(...timelineData.map((d) => d.flow), 1) : 1000 // Ensure at least 1
  const minFlow = timelineData.length > 0 ? Math.min(...timelineData.map((d) => d.flow), 0) : 0 // Ensure at least 0
  const padding = Math.max((maxFlow - minFlow) * 0.1, 1000) // Minimum padding of 1000
  const yAxisDomain = [0, maxFlow + padding] // Always start from 0

  // Show empty state if no data
  if (timelineData.length === 0) {
    return (
      <div className="h-80 w-full flex items-center justify-center">
        <div className="text-center space-y-4">
          {/* Faded skeleton chart */}
          <div className="relative">
            <div className="flex items-end justify-center space-x-2 opacity-10">
              {[
                { height: 20, id: 'bar1' }, { height: 35, id: 'bar2' }, { height: 45, id: 'bar3' },
                { height: 25, id: 'bar4' }, { height: 50, id: 'bar5' }, { height: 30, id: 'bar6' },
                { height: 40, id: 'bar7' }, { height: 60, id: 'bar8' }, { height: 35, id: 'bar9' }
              ].map((bar) => (
                <div 
                  key={bar.id} 
                  className="w-8 bg-green-300 rounded-t" 
                  style={{ height: `${bar.height}px` }}
                ></div>
              ))}
            </div>
          </div>
          <div className="space-y-2 relative z-10">
            <div className="text-lg text-muted-foreground">Timeline will appear here</div>
            <div className="text-sm text-muted-foreground/70">
              Annual migration data showing temporal patterns and trends
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={timelineData} margin={{ top: 20, right: 30, left: 60, bottom: 20 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 12, fill: "#64748b" }}
            axisLine={{ stroke: "#cbd5e1" }}
            tickLine={{ stroke: "#cbd5e1" }}
          />
          <YAxis
            domain={yAxisDomain}
            tick={{ fontSize: 12, fill: "#64748b" }}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            axisLine={{ stroke: "#cbd5e1" }}
            tickLine={{ stroke: "#cbd5e1" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            }}
            formatter={(value: number) => [value.toLocaleString(), "Migration Flow"]}
            labelFormatter={(label) => `Year: ${label}`}
          />
          <Area
            type="monotone"
            dataKey="flow"
            stroke="#3b82f6"
            strokeWidth={3}
            fill={`url(#${gradientId})`}
            dot={{ fill: "#3b82f6", strokeWidth: 2, r: 5 }}
            activeDot={{ r: 7, stroke: "#3b82f6", strokeWidth: 2, fill: "white" }}
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="mt-4 text-center">
        <p className="text-sm text-slate-600">
          Annual migration flows for corridor:{" "}
          <span className="font-semibold text-slate-900">{getCorridorLabel()}</span>
        </p>
      </div>
    </div>
  )
}
