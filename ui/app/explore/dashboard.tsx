// biome-ignore-all lint/suspicious/noArrayIndexKey: This file contains only static skeleton components
import { Suspense } from 'react';
import Link from 'next/link';

import { DashboardCharts } from './dashboard-charts';
import { DashboardCard, DashboardGrid, DashboardLayout } from './dashboard-layout';
import { MigrationFiltersClient } from './migration-filters';
import { TimeSeriesCharts } from './time-series-charts';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, GitBranch } from 'lucide-react';
import { COUNTRY_NAME_MAPPINGS } from '@/lib/country-mappings';
import { initializeCountriesData } from '@/lib/queries';
import {
    getDashboardSummaryServer,
    getMonthlyTotalsServer,
    getTopCorridorsServer,
    getQuarterlyDataServer,
    getSeasonalPatternsServer,
    searchParamsToFilters
} from '@/lib/server-queries';
import type { MigrationFilters as MigrationFiltersType } from '@/lib/types';

// Skeleton loading component for dashboard data
function DashboardLoading() {
    return (
        <div className='animate-pulse space-y-6'>
            {/* Summary Statistics Skeleton */}
            <DashboardGrid columns={4}>
                <DashboardCard title='Total Migration Flows' className='from-primary/10 to-primary/5 bg-gradient-to-br'>
                    <div className='space-y-2'>
                        <div className='from-primary/20 to-primary/10 h-8 w-32 animate-pulse rounded bg-gradient-to-r'></div>
                        <div className='bg-muted/50 h-4 w-28 animate-pulse rounded'></div>
                    </div>
                </DashboardCard>

                <DashboardCard title='Active Corridors' className='from-chart-2/10 to-chart-2/5 bg-gradient-to-br'>
                    <div className='space-y-2'>
                        <div className='from-chart-2/20 to-chart-2/10 h-8 w-16 animate-pulse rounded bg-gradient-to-r'></div>
                        <div className='bg-muted/50 h-4 w-32 animate-pulse rounded'></div>
                    </div>
                </DashboardCard>

                <DashboardCard title='Average Monthly Flow' className='from-chart-3/10 to-chart-3/5 bg-gradient-to-br'>
                    <div className='space-y-2'>
                        <div className='from-chart-3/20 to-chart-3/10 h-8 w-28 animate-pulse rounded bg-gradient-to-r'></div>
                        <div className='bg-muted/50 h-4 w-24 animate-pulse rounded'></div>
                    </div>
                </DashboardCard>

                <DashboardCard title='Time Period' className='from-chart-4/10 to-chart-4/5 bg-gradient-to-br'>
                    <div className='space-y-2'>
                        <div className='from-chart-4/20 to-chart-4/10 h-8 w-12 animate-pulse rounded bg-gradient-to-r'></div>
                        <div className='bg-muted/50 h-4 w-20 animate-pulse rounded'></div>
                    </div>
                </DashboardCard>
            </DashboardGrid>

            {/* Main Visualizations Skeleton */}
            <DashboardGrid columns={2}>
                <DashboardCard
                    title='Migration Flows Over Time'
                    description='Monthly aggregated migration flows showing temporal and seasonal patterns'>
                    <div className='bg-muted/20 relative h-80 overflow-hidden rounded-lg'>
                        <div className='via-muted/40 animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent to-transparent'></div>
                        {/* Chart skeleton lines */}
                        <div className='flex h-full items-end justify-between gap-1 p-4'>
                            {Array.from({ length: 12 }).map((_, i) => (
                                <div
                                    key={`chart-bar-${i}`}
                                    className='bg-primary/20 animate-pulse rounded-sm'
                                    style={{
                                        height: `${((i * 7) % 60) + 20}%`,
                                        width: 'calc(100% / 12 - 4px)',
                                        animationDelay: `${i * 0.1}s`
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                </DashboardCard>

                <DashboardCard
                    title='Top Migration Corridors'
                    description='Migration flows visualized as connected pathways with proportional width'>
                    <div className='bg-muted/20 relative h-80 overflow-hidden rounded-lg'>
                        <div className='via-muted/40 animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent to-transparent'></div>
                        {/* Sankey diagram skeleton */}
                        <div className='flex h-full items-center justify-between p-4'>
                            {/* Source nodes */}
                            <div className='space-y-4'>
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <div
                                        key={`sankey-source-${i}`}
                                        className='bg-primary/20 h-6 w-20 animate-pulse rounded'
                                        style={{ animationDelay: `${i * 0.2}s` }}
                                    />
                                ))}
                            </div>

                            {/* Connection lines */}
                            <div className='relative mx-8 flex-1'>
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <div
                                        key={`sankey-flow-${i}`}
                                        className='from-primary/20 to-chart-2/20 my-6 h-2 animate-pulse rounded bg-gradient-to-r'
                                        style={{
                                            animationDelay: `${i * 0.3}s`,
                                            width: `${((i * 11) % 40) + 60}%`,
                                            marginLeft: `${(i * 5) % 20}%`
                                        }}
                                    />
                                ))}
                            </div>

                            {/* Target nodes */}
                            <div className='space-y-4'>
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <div
                                        key={`sankey-target-${i}`}
                                        className='bg-chart-2/20 h-6 w-20 animate-pulse rounded'
                                        style={{ animationDelay: `${i * 0.2 + 0.1}s` }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </DashboardCard>
            </DashboardGrid>

            {/* Time Series Charts Skeleton */}
            <Card>
                <CardHeader>
                    <div className='flex items-center justify-between'>
                        <div className='space-y-2'>
                            <div className='bg-muted/50 h-6 w-48 animate-pulse rounded' />
                            <div className='bg-muted/30 h-4 w-64 animate-pulse rounded' />
                        </div>
                        <div className='flex space-x-2'>
                            <div className='bg-muted/30 h-8 w-20 animate-pulse rounded' />
                            <div className='bg-muted/30 h-8 w-24 animate-pulse rounded' />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Search and controls skeleton */}
                    <div className='mb-6 flex items-center space-x-4'>
                        <div className='bg-muted/30 h-10 flex-1 animate-pulse rounded' />
                        <div className='bg-muted/30 h-10 w-32 animate-pulse rounded' />
                    </div>

                    {/* Tabs skeleton */}
                    <div className='mb-6 flex space-x-2'>
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div
                                key={`tab-skeleton-${i}`}
                                className='bg-muted/30 h-8 w-24 animate-pulse rounded'
                                style={{ animationDelay: `${i * 0.1}s` }}
                            />
                        ))}
                    </div>

                    {/* Chart area skeleton */}
                    <div className='bg-muted/20 relative h-96 overflow-hidden rounded-lg'>
                        <div className='via-muted/40 animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent to-transparent'></div>
                        <div className='flex h-full items-end justify-between gap-1 p-4'>
                            {Array.from({ length: 24 }).map((_, i) => (
                                <div
                                    key={`timeseries-bar-${i}`}
                                    className='from-primary/20 to-chart-2/20 animate-pulse rounded-sm bg-gradient-to-t'
                                    style={{
                                        height: `${((i * 3) % 70) + 10}%`,
                                        width: 'calc(100% / 24 - 2px)',
                                        animationDelay: `${i * 0.05}s`
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// Error component for dashboard data
function DashboardError({ error }: { error: string }) {
    return (
        <div className='flex h-64 items-center justify-center'>
            <div className='text-lg text-red-600'>Error: {error}</div>
        </div>
    );
}

// Dashboard data component that fetches and displays charts
async function DashboardData({ filters }: { filters: MigrationFiltersType }) {
    try {
        // Initialize countries data first
        await initializeCountriesData();

        // Fetch minimal initial data on the server
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

// Server component page
export default async function MigrationDashboard({
    searchParams
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    // Await the searchParams promise in Next.js 15
    const resolvedSearchParams = await searchParams;

    // Convert search params to filters
    const urlParams = new URLSearchParams();
    Object.entries(resolvedSearchParams).forEach(([key, value]) => {
        if (typeof value === 'string') {
            urlParams.set(key, value);
        } else if (Array.isArray(value)) {
            urlParams.set(key, value.join(','));
        }
    });

    const filters = searchParamsToFilters(urlParams);

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
            <div className="container mx-auto p-6">
                {/* Header with navigation */}
                <div className="flex items-center justify-between mb-8">
                    <Link 
                        href="/" 
                        className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to home
                    </Link>
                    
                    <Button asChild variant="outline" className="gap-2">
                        <Link href="/corridor">
                            <GitBranch className="h-4 w-4" />
                            Corridor Analysis
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </Button>
                </div>

                <DashboardLayout
                    title='Explore the migration data'
                    description='Interactive visualization of migration patterns across countries and regions'>
                    <MigrationFiltersClient initialFilters={filters} />

                    <Suspense fallback={<DashboardLoading />}>
                        <DashboardData filters={filters} />
                    </Suspense>
                </DashboardLayout>
            </div>
        </div>
    );
}
