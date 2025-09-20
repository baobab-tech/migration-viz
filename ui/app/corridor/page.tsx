import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight, BookOpenIcon } from 'lucide-react'
import { CorridorSankeyChart } from "./corridor-sankey-chart"
import { CorridorTimelineChart } from "./corridor-timeline-chart"
import { CorridorSelector } from "./corridor-selector"
import { getCorridorCountriesServer, getEnhancedCorridorSankeyDataServer, getEnhancedCorridorTimelineDataServer } from '@/lib/server-queries'

interface CorridorAnalysisProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

// Helper function to get corridor title
function getCorridorTitle(fromCountries: string[], toCountries: string[], fromRegions: string[], toRegions: string[]) {
  // Check if World is selected (no filters)
  const isFromWorld = fromCountries.length === 0 && fromRegions.length === 0
  const isToWorld = toCountries.length === 0 && toRegions.length === 0
  
  if (isFromWorld && isToWorld) {
    return "Global Migration Flows"
  } else if (isFromWorld) {
    const toLabel = [...toCountries, ...toRegions].join(', ') || 'Selected Destinations'
    
    return `All Origins → ${toLabel}`
  } else if (isToWorld) {
    const fromLabel = [...fromCountries, ...fromRegions].join(', ') || 'Selected Origins'
    
    return `${fromLabel} → All Destinations`
  } else {
    const fromLabel = [...fromCountries, ...fromRegions].join(', ') || 'Selected Origins'
    const toLabel = [...toCountries, ...toRegions].join(', ') || 'Selected Destinations'
    
    return `${fromLabel} → ${toLabel}`
  }
}

// Server component page
export default async function CorridorAnalysis({ searchParams }: CorridorAnalysisProps) {
  // Await the searchParams promise in Next.js 15
  const resolvedSearchParams = await searchParams
  
  // Parse URL parameters for the new multi-selection structure
  const fromCountriesParam = resolvedSearchParams.fromCountries as string
  const toCountriesParam = resolvedSearchParams.toCountries as string
  const fromRegionsParam = resolvedSearchParams.fromRegions as string
  const toRegionsParam = resolvedSearchParams.toRegions as string
  
  // Handle legacy single country parameters
  const legacyFromCountry = resolvedSearchParams.from as string
  const legacyToCountry = resolvedSearchParams.to as string
  
  // Parse comma-separated values - no defaults, let user choose
  const fromCountries = fromCountriesParam ? fromCountriesParam.split(',').filter(Boolean) : 
                        (legacyFromCountry && legacyFromCountry !== 'all' ? [legacyFromCountry] : [])
  const toCountries = toCountriesParam ? toCountriesParam.split(',').filter(Boolean) : 
                      (legacyToCountry && legacyToCountry !== 'all' ? [legacyToCountry] : [])
  const fromRegions = fromRegionsParam ? fromRegionsParam.split(',').filter(Boolean) : []
  const toRegions = toRegionsParam ? toRegionsParam.split(',').filter(Boolean) : []
  
  // Fetch all data in parallel at page level
  let sankeyData: any[] = []
  let timelineData: any[] = []
  let availableCountries: any[] = []
  let dataError: any = null

  try {
    const [sankeyResult, timelineResult, countriesResult] = await Promise.all([
      getEnhancedCorridorSankeyDataServer(
        fromCountries,
        toCountries,
        fromRegions,
        toRegions,
        ['2019-01', '2022-12'],
        20
      ),
      getEnhancedCorridorTimelineDataServer(
        fromCountries,
        toCountries,
        fromRegions,
        toRegions,
        ['2019-01', '2022-12'],
        'yearly'
      ),
      getCorridorCountriesServer()
    ])

    sankeyData = sankeyResult
    timelineData = timelineResult
    availableCountries = countriesResult
  } catch (error) {
    console.error('Error loading corridor data:', error)
    dataError = error
    // Get at least the countries data for the selector
    try {
      availableCountries = await getCorridorCountriesServer()
    } catch (countriesError) {
      console.error('Error loading countries:', countriesError)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto p-6">
        {/* Header with navigation */}
        <div className="flex items-center justify-between mb-6">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
          
          <Button asChild variant="outline" className="gap-2">
            <Link href="/about-data">
              <BookOpenIcon className="h-4 w-4" />
              About the Methodology
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="mx-auto max-w-7xl space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-200">
              Migration Corridor Analysis
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Analyze migration flows between countries, regions, and the world with interactive visualizations.<br /><br />
              <span className="italic text-sm">Caution: this data represents all types of migration (from aggregated data from Facebook) and is therefore a mix of both regular and irregular and should not be use for any policy decisions.</span>
            </p>
          </div>

          <CorridorSelector 
            availableCountries={availableCountries}
            initialFromCountries={fromCountries}
            initialToCountries={toCountries}
            initialFromRegions={fromRegions}
            initialToRegions={toRegions}
          />
          
          <div>
            {dataError ? (
              <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                <CardContent className="flex items-center justify-center h-64">
                  <div className="text-center space-y-2">
                    <div className="text-lg text-red-600">Error loading corridor data</div>
                    <div className="text-sm text-muted-foreground">Please try selecting different countries</div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-8">
                <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"></div>
                      {getCorridorTitle(fromCountries, toCountries, fromRegions, toRegions)}
                    </CardTitle>
                    <CardDescription>Migration flows visualized as connected pathways with proportional width</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CorridorSankeyChart data={sankeyData} />
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-500 to-blue-500"></div>
                      Migration Flows Over Time
                    </CardTitle>
                    <CardDescription>Annual migration data showing temporal patterns and trends</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CorridorTimelineChart 
                      fromCountries={fromCountries} 
                      toCountries={toCountries} 
                      fromRegions={fromRegions} 
                      toRegions={toRegions} 
                      data={timelineData} 
                    />
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
