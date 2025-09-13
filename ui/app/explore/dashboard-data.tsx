import { DashboardCharts } from './dashboard-charts';
import { TimeSeriesCharts } from './time-series-charts';
import { COUNTRY_NAME_MAPPINGS } from '@/lib/country-mappings';
import { initializeCountriesData } from '@/lib/queries';
import {
    getDashboardSummaryServer,
    getMonthlyTotalsServer,
    getTopCorridorsServer,
    getQuarterlyDataServer,
    getSeasonalPatternsServer,
} from '@/lib/server-queries';
import type { MigrationFilters as MigrationFiltersType } from '@/lib/types';

// Error component for dashboard data
function DashboardError({ error }: { error: string }) {
    return (
        <div className='flex h-64 items-center justify-center'>
            <div className='text-lg text-red-600'>Error: {error}</div>
        </div>
    );
}

// Server Component that fetches and displays charts (the heavy part)
export default async function DashboardData({ filters }: { filters: MigrationFiltersType }) {
    try {
        // Initialize countries data first
        await initializeCountriesData();

        // Fetch all data on the server
        const [monthlyData, summaryStats, topCorridors, quarterlyData, seasonalPatternsData, availableCorridors] = await Promise.all([
            getMonthlyTotalsServer(filters),
            getDashboardSummaryServer(filters),
            getTopCorridorsServer(filters, 10),
            getQuarterlyDataServer(filters),
            getSeasonalPatternsServer(filters),
            getTopCorridorsServer(filters, 100) // Get more corridors for the available corridors list
        ]);

        // Use static country names mapping
        const countryNames = COUNTRY_NAME_MAPPINGS;

        // Transform available corridors data to match expected format
        const transformedAvailableCorridors = availableCorridors.map(corridor => ({
            value: corridor.corridor,
            label: corridor.displayName,
            total: corridor.total
        }));

        return (
            <>
                <DashboardCharts
                    monthlyData={monthlyData}
                    topCorridors={topCorridors}
                    summaryStats={summaryStats}
                    countryNames={countryNames}
                    filters={filters}
                />
                <TimeSeriesCharts
                    filters={filters}
                    initialCountryNames={countryNames}
                    initialQuarterlyData={quarterlyData}
                    initialSeasonalPatternsData={seasonalPatternsData}
                    initialAvailableCorridors={transformedAvailableCorridors}
                />
            </>
        );
    } catch (error) {
        console.error('Error loading dashboard data:', error);

        return <DashboardError error={error instanceof Error ? error.message : 'Failed to load dashboard data'} />;
    }
}
