'use server'

import { getCorridorTimeSeriesServer, getTopCorridorsServer } from '@/lib/server-queries'
import type { MigrationFilters } from '@/lib/types'

/**
 * Server Action to fetch corridor time series data
 */
export async function fetchCorridorTimeSeriesAction(corridors: string[], filters: MigrationFilters = {}) {
  try {
    // Convert corridor format from "MX → US" to "MX-US" for database compatibility
    const formattedCorridors = corridors.map(corridor => 
      corridor.includes(' → ') 
        ? corridor.replace(' → ', '-')
        : corridor
    )
    
    return await getCorridorTimeSeriesServer(formattedCorridors, filters)
  } catch (error) {
    console.error('Error in fetchCorridorTimeSeriesAction:', error)
    
    return []
  }
}

/**
 * Server Action to fetch available corridor options with filters applied
 */
export async function fetchCorridorOptionsAction(filters: MigrationFilters = {}, limit: number = 200) {
  try {
    return await getTopCorridorsServer(filters, limit)
  } catch (error) {
    console.error('Error in fetchCorridorOptionsAction:', error)
    
    return []
  }
}
