import { Suspense } from 'react';

import Link from 'next/link';

import { DashboardCard, DashboardGrid } from '@/app/explore/dashboard-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { initializeCountriesData } from '@/lib/queries';
import { getDashboardSummaryServer } from '@/lib/server-queries';

import { ArrowRight, BarChart3, Database, DatabaseIcon, ExternalLink } from 'lucide-react';

// Summary statistics loading component
function SummaryLoading() {
    return (
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
    );
}

// Summary statistics component
async function SummaryStats() {
    try {
        // Initialize countries data
        await initializeCountriesData();

        // Get summary stats with default filters (all data)
        const summaryStats = await getDashboardSummaryServer({});

        return (
            <DashboardGrid columns={4}>
                <DashboardCard title='Total Migration Flows' className='from-primary/10 to-primary/5 bg-gradient-to-br'>
                    <div className='text-primary text-3xl font-bold'>{summaryStats.totalFlows.toLocaleString()}</div>
                    <p className='text-muted-foreground mt-1 text-sm'>
                        Across {summaryStats.uniqueCorridors} corridors
                    </p>
                </DashboardCard>

                <DashboardCard title='Active Corridors' className='from-chart-2/10 to-chart-2/5 bg-gradient-to-br'>
                    <div className='text-chart-2 text-3xl font-bold'>
                        {Math.round(summaryStats.uniqueCorridors).toLocaleString()}
                    </div>
                    <p className='text-muted-foreground mt-1 text-sm'>Country-to-country routes</p>
                </DashboardCard>

                <DashboardCard title='Average Monthly Flow' className='from-chart-3/10 to-chart-3/5 bg-gradient-to-br'>
                    <div className='text-chart-3 text-3xl font-bold'>
                        {Math.round(summaryStats.avgPeriodFlow).toLocaleString()}
                    </div>
                    <p className='text-muted-foreground mt-1 text-sm'>Per month average</p>
                </DashboardCard>

                <DashboardCard title='Time Period' className='from-chart-4/10 to-chart-4/5 bg-gradient-to-br'>
                    <div className='text-chart-4 text-3xl font-bold'>{summaryStats.activeMonths}</div>
                    <p className='text-muted-foreground mt-1 text-sm'>Months of data</p>
                </DashboardCard>
            </DashboardGrid>
        );
    } catch (error) {
        console.error('Error loading summary stats:', error);

        return (
            <div className='py-8 text-center'>
                <div className='text-lg text-red-600'>Error loading summary statistics</div>
            </div>
        );
    }
}

export default async function HomePage() {
    return (
        <div className='from-background via-background to-primary/5 min-h-screen bg-gradient-to-br'>
            <div className='container mx-auto space-y-8 p-6'>
                {/* Header */}
                <div className='space-y-4 py-8 text-center'>
                   

                    <h1 className='from-primary via-primary to-chart-2 bg-gradient-to-r bg-clip-text text-5xl font-bold text-balance text-transparent'>
                        Migration Flow Dashboard
                    </h1>

                    <p className='text-muted-foreground mx-auto max-w-2xl text-xl text-pretty'>
                        Explore global migration patterns with monthly flow data spanning 2019-2022, based on
                        peer-reviewed research from PNAS.
                    </p>
                </div>

                {/* Summary Statistics */}
                <div className='space-y-2'>
                    <div className='mb-4 text-center'>
                        <h2 className='mb-2 text-2xl font-semibold'>Global Overview</h2>
                        <p className='text-muted-foreground'>Key statistics from the complete dataset</p>
                    </div>

                    <Suspense fallback={<SummaryLoading />}>
                        <SummaryStats />
                    </Suspense>
                </div>

                {/* Action Cards */}
                <div className='space-y-6 pt-8'>
                    {/* Primary Analysis Tools */}
                    <div className='grid gap-6 md:grid-cols-2'>
                        <Card className='group border-border/50 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl'>
                            <CardHeader>
                                <CardTitle className='flex items-center gap-2'>
                                    <BarChart3 className='text-primary h-5 w-5' />
                                    Explore the Data
                                </CardTitle>
                                <CardDescription>
                                    Interactive charts, filters, and detailed visualizations
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className='text-muted-foreground mb-4 text-sm'>
                                    Dive into migration patterns with time series analysis, corridor comparisons,
                                    and customizable filtering options, include and exclude countries, regions, and more.
                                </p>
                                <Link href='/explore' >
                                    <Button className='w-full cursor-pointer bg-secondary text-secondary-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors'>
                                        Start Exploring
                                        <ArrowRight className='ml-2 h-4 w-4' />
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>

                        <Card className='group border-border/50 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl'>
                            <CardHeader>
                                <CardTitle className='flex items-center gap-2'>
                                    <ArrowRight className='text-chart-3 h-5 w-5' />
                                    Corridor Analysis
                                </CardTitle>
                                <CardDescription>Focused analysis of specific country-to-country flows</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className='text-muted-foreground mb-4 text-sm'>
                                    Analyze migration flows between specific countries with sankey diagrams, timeline
                                    charts, and detailed corridor comparisons.
                                </p>
                                <Link href='/corridor' >
                                    <Button className='w-full cursor-pointer bg-secondary text-secondary-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors'>
                                        Analyze Corridors
                                        <ArrowRight className='ml-2 h-4 w-4' />
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* About the Data */}
                <div className='mx-auto max-w-2xl space-y-4 text-center'>
                    <div className='mb-4 flex items-center justify-center gap-2'>
                        <DatabaseIcon className='text-chart-2 h-5 w-5' />
                        <h2 className='text-2xl font-semibold'>About the Source Data</h2>
                    </div>
                    <div className='text-muted-foreground'>
                        Learn about the orginal peer-reviewed research, data collection methodology, and access to
                        original sources.<br /><br />
                        <span className="italic text-sm">Caution: this data represents all types of migration (from aggregated data from Facebook) and is therefore a mix of both regular and irregular and should not be used for any policy decisions.</span>
                        <Link
                            className='text-muted-foreground inline-flex items-center gap-2 text-sm'
                            href='/about-data'>
                            <Button variant='outline' size='sm' className='ml-2'>
                                Learn More
                                <ExternalLink className='ml-2 h-4 w-4' />
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Footer */}
                <div className='border-border/20 border-t py-8 text-center'>
                    <p className='text-muted-foreground text-sm'>
                        This is an independent data exploration project with no affiliation with the research authors or their institutions.
                    </p>
                </div>
            </div>
        </div>
    );
}
