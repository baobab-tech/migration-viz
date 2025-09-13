import { Suspense } from 'react';
import Link from 'next/link';

import { DashboardLayout } from './dashboard-layout';
import { MigrationFiltersClient } from './migration-filters';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, GitBranch } from 'lucide-react';
import { searchParamsToFilters } from '@/lib/server-queries';

// Import the dashboard data component
import DashboardData from './dashboard-data';

// Import skeleton loading component  
import DashboardLoading from './dashboard-loading';

// Server component that renders layout immediately
export default async function ExplorePage({
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

    // This renders immediately - layout, navigation, filters, skeleton
    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
            <div className="container mx-auto p-6">
                {/* Header with navigation - renders immediately */}
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

                {/* Layout and filters render immediately */}
                <DashboardLayout
                    title='Explore the migration data'
                    description='Interactive visualization of migration patterns across countries and regions'>
                    
                    {/* Filters render immediately */}
                    <MigrationFiltersClient initialFilters={filters} />

                    {/* Suspense boundary shows skeleton immediately, then loads data */}
                    <Suspense fallback={<DashboardLoading />}>
                        <DashboardData filters={filters} />
                    </Suspense>
                </DashboardLayout>
            </div>
        </div>
    );
}