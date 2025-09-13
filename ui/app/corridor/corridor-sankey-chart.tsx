"use client"

import { useMemo } from "react"
import { ResponsiveSankey } from "@nivo/sankey"

interface CorridorSankeyChartProps {
  data: {
    countryFrom: string
    countryTo: string
    countryFromName: string
    countryToName: string
    totalMigrants: number
  }[]
}

// Color mapping for countries
const getCountryColor = (countryName: string): string => {
  // Simple hash function to generate a unique color from a country name
  function stringToColor(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    // Generate color in HSL space for better distribution
    const hue = Math.abs(hash) % 360

    return `hsl(${hue}, 60%, 55%)`
  }
  
  return stringToColor(countryName) || '#6b7280'
}

export function CorridorSankeyChart({ data }: CorridorSankeyChartProps) {
  const sankeyData = useMemo(() => {
    // Use the real data passed as props
    if (!data || data.length === 0) {
      // Fallback for no data
      return { 
        nodes: [
          { id: 'No data', nodeColor: '#6b7280' },
          { id: 'available', nodeColor: '#6b7280' }
        ], 
        links: [
          { source: 'No data', target: 'available', value: 1000 }
        ] 
      }
    }

    // Create nodes from unique countries and filter out circular/invalid flows
    const allCountries = new Set<string>()
    const linkMap = new Map<string, number>() // For aggregating duplicate flows

    data.forEach(flow => {
      const fromName = flow.countryFromName
      const toName = flow.countryToName
      
      // Skip self-referencing flows (circular links)
      if (fromName === toName) {
        return
      }
      
      // Skip flows with invalid/empty names
      if (!fromName || !toName || fromName.trim() === '' || toName.trim() === '') {
        return
      }
      
      // Skip flows with zero or negative migrants
      if (flow.totalMigrants <= 0) {
        return
      }
      
      allCountries.add(fromName)
      allCountries.add(toName)
      
      // Create unique key for this flow and aggregate duplicates
      const flowKey = `${fromName} -> ${toName}`
      const existingValue = linkMap.get(flowKey) || 0
      linkMap.set(flowKey, existingValue + flow.totalMigrants)
    })

    // Convert aggregated flows to links array
    const links: { source: string; target: string; value: number }[] = []
    linkMap.forEach((value, key) => {
      const [source, target] = key.split(' -> ')
      links.push({
        source,
        target,
        value
      })
    })

    const nodes = Array.from(allCountries).map(country => ({
      id: country,
      nodeColor: getCountryColor(country)
    }))

    // Final check for circular links before returning
    const circularLinks = links.filter(link => link.source === link.target)
    if (circularLinks.length > 0) {
      console.error('ERROR: Circular links detected in final Sankey data!', circularLinks)
    }

    return { nodes, links }
  }, [data])

  // Show empty state if no data
  if (!data || data.length === 0) {
    return (
      <div className="h-96 w-full flex items-center justify-center">
        <div className="text-center space-y-4">
          {/* Faded skeleton background */}
          <div className="relative">
            <div className="flex items-center justify-center space-x-8 opacity-10">
              <div className="space-y-2">
                <div className="w-16 h-16 bg-blue-300 rounded-lg"></div>
                <div className="w-12 h-3 bg-blue-300 rounded"></div>
              </div>
              <div className="w-32 h-8 bg-blue-300 rounded-full"></div>
              <div className="space-y-2">
                <div className="w-16 h-16 bg-purple-300 rounded-lg"></div>
                <div className="w-12 h-3 bg-purple-300 rounded"></div>
              </div>
            </div>
          </div>
          <div className="space-y-2 relative z-10">
            <div className="text-lg text-muted-foreground">Choose migration corridors to explore</div>
            <div className="text-sm text-muted-foreground/70">
              Search for countries, regions, or select "World" in the controls above
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-96 w-full">
      <ResponsiveSankey
        data={sankeyData}
        margin={{ top: 40, right: 160, bottom: 40, left: 50 }}
        align="justify"
        colors={{ scheme: "category10" }}
        nodeOpacity={1}
        nodeHoverOthersOpacity={0.35}
        nodeThickness={18}
        nodeSpacing={24}
        nodeBorderWidth={0}
        nodeBorderColor={{
          from: "color",
          modifiers: [["darker", 0.8]],
        }}
        nodeBorderRadius={3}
        linkOpacity={0.6}
        linkHoverOthersOpacity={0.1}
        linkContract={3}
        enableLinkGradient={true}
        labelPosition="inside"
        labelOrientation="horizontal"
        labelPadding={16}
        labelTextColor={{
          from: "color",
          modifiers: [["darker", 1]],
        }}
        animate={true}
        motionConfig="gentle"
      />
    </div>
  )
}
