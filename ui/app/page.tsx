import { Suspense } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { MigrationFiltersClient } from "@/components/migration-filters"
import { DashboardCharts } from "@/components/dashboard-charts"
import { getMonthlyTotalsServer, getDashboardSummaryServer, getTopCorridorsServer, getCountryNameMappingsServer, searchParamsToFilters } from "@/lib/server-queries"
import { getMigrationFlows, initializeCountriesData } from "@/lib/queries"
import type { MigrationFilters as MigrationFiltersType } from "@/lib/queries"
import { TimeSeriesCharts } from "@/components/time-series-charts"

// Loading component for dashboard data
function DashboardLoading() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-lg">Loading migration data...</div>
    </div>
  )
}

// Error component for dashboard data
function DashboardError({ error }: { error: string }) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-lg text-red-600">Error: {error}</div>
    </div>
  )
}

// Dashboard data component that fetches and displays charts
async function DashboardData({ filters }: { filters: MigrationFiltersType }) {
  try {
    // Initialize countries data first
    await initializeCountriesData()
    
    // Fetch all dashboard data in parallel on the server
    const [monthlyData, summaryStats, topCorridors, countryNames, migrationFlowData] = await Promise.all([
      getMonthlyTotalsServer(filters),
      getDashboardSummaryServer(filters),
      getTopCorridorsServer(filters, 10),
      getCountryNameMappingsServer(),
      getMigrationFlows({ ...filters, limit: 50000 }), // Reasonable limit for performance
    ])

    return (
      <>
      <DashboardCharts 
        monthlyData={monthlyData}
        topCorridors={topCorridors}
        summaryStats={summaryStats}
        countryNames={countryNames}
      />
        {/* TODO: Update these components to work with aggregated data or make them optional */}
        {/* <GlobalFlowMap data={[]} /> */}
        <TimeSeriesCharts data={migrationFlowData} filters={filters} />
      
      </>
    )
  } catch (error) {
    console.error('Error loading dashboard data:', error)
    
    return <DashboardError error={error instanceof Error ? error.message : 'Failed to load dashboard data'} />
  }
}

// Server component page
export default async function MigrationDashboard({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  // Await the searchParams promise in Next.js 15
  const resolvedSearchParams = await searchParams
  
  // Convert search params to filters
  const urlParams = new URLSearchParams()
  Object.entries(resolvedSearchParams).forEach(([key, value]) => {
    if (typeof value === 'string') {
      urlParams.set(key, value)
    } else if (Array.isArray(value)) {
      urlParams.set(key, value.join(','))
    }
  })
  
  const filters = searchParamsToFilters(urlParams)


  return (
    <DashboardLayout
      title="Global Migration Flow Dashboard"
      description="Interactive visualization of migration patterns across countries and regions from 2019-2022"
    >
      <MigrationFiltersClient initialFilters={filters} />
      
      <Suspense fallback={<DashboardLoading />}>
        <DashboardData filters={filters} />
      </Suspense>
      
    </DashboardLayout>
  )
}
