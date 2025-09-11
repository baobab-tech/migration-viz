import { Suspense } from 'react'
import { getCountryNameMappingsServer, getTopCorridorsServer, getQuarterlyDataServer, getSeasonalPatternsServer } from '@/lib/server-queries'
import { TimeSeriesCharts } from './time-series-charts'
import type { MigrationFilters } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'

interface TimeSeriesChartsServerProps {
  filters?: MigrationFilters
}

async function TimeSeriesChartsData({ filters = {} }: TimeSeriesChartsServerProps) {
  // Fetch all required data server-side using proper Server Component pattern
  const [countryNames, quarterlyData, seasonalPatternsData, topCorridors] = await Promise.all([
    getCountryNameMappingsServer(),
    getQuarterlyDataServer(filters),
    getSeasonalPatternsServer(filters), 
    getTopCorridorsServer(filters, 200) // Apply filters to get relevant corridors for search
  ])

  // Transform corridor data for the component
  const availableCorridors = topCorridors.map(corridor => ({
    value: `${corridor.countryA}-${corridor.countryB}`,
    label: corridor.displayName || `${countryNames[corridor.countryA] || corridor.countryA} → ${countryNames[corridor.countryB] || corridor.countryB}`,
    total: corridor.total
  }))

  return (
    <TimeSeriesCharts
      filters={filters}
      initialCountryNames={countryNames}
      initialQuarterlyData={quarterlyData}
      initialSeasonalPatternsData={seasonalPatternsData}
      initialAvailableCorridors={availableCorridors}
    />
  )
}

function TimeSeriesChartsLoading() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
          <div className="flex space-x-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function TimeSeriesChartsServer({ filters }: TimeSeriesChartsServerProps) {
  return (
    <Suspense fallback={<TimeSeriesChartsLoading />}>
      <TimeSeriesChartsData filters={filters} />
    </Suspense>
  )
}
