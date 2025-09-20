'use client';

import { useMemo } from 'react';

import { ResponsiveSankey } from '@nivo/sankey';

interface CorridorSankeyChartProps {
    data: {
        countryFrom: string;
        countryTo: string;
        countryFromName: string;
        countryToName: string;
        totalMigrants: number;
    }[];
}

// Color mapping for countries
const getCountryColor = (countryName: string): string => {
    // Simple hash function to generate a unique color from a country name
    function stringToColor(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        // Generate color in HSL space for better distribution
        const hue = Math.abs(hash) % 360;

        return `hsl(${hue}, 60%, 55%)`;
    }

    return stringToColor(countryName) || '#6b7280';
};

// Function to detect circular dependencies using DFS
const hasCircularDependencies = (links: { source: string; target: string; value: number }[]): boolean => {
    if (links.length === 0) return false;

    // Build adjacency list
    const graph = new Map<string, string[]>();
    const allNodes = new Set<string>();

    links.forEach((link) => {
        allNodes.add(link.source);
        allNodes.add(link.target);

        if (!graph.has(link.source)) {
            graph.set(link.source, []);
        }
        const sourceNeighbors = graph.get(link.source);
        if (sourceNeighbors) {
            sourceNeighbors.push(link.target);
        }
    });

    // DFS to detect cycles
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (node: string): boolean => {
        if (recursionStack.has(node)) return true;
        if (visited.has(node)) return false;

        visited.add(node);
        recursionStack.add(node);

        const neighbors = graph.get(node) || [];
        for (const neighbor of neighbors) {
            if (hasCycle(neighbor)) return true;
        }

        recursionStack.delete(node);

        return false;
    };

    // Check all nodes as some might not be reachable from others
    for (const node of allNodes) {
        if (!visited.has(node) && hasCycle(node)) {
            return true;
        }
    }

    return false;
};

export function CorridorSankeyChart({ data }: CorridorSankeyChartProps) {
    const { sankeyData, totalFlows, isLimited } = useMemo(() => {
        // Use the real data passed as props
        if (!data || data.length === 0) {
            // Fallback for no data
            return {
                sankeyData: {
                    nodes: [
                        { id: 'No data', nodeColor: '#6b7280' },
                        { id: 'available', nodeColor: '#6b7280' }
                    ],
                    links: [{ source: 'No data', target: 'available', value: 1000 }]
                },
                totalFlows: 0,
                isLimited: false
            };
        }

        // Filter out invalid flows first and sort by totalMigrants
        const validFlows = data
            .filter((flow) => {
                const fromName = flow.countryFromName;
                const toName = flow.countryToName;

                // Skip self-referencing flows (circular links)
                if (fromName === toName) return false;

                // Skip flows with invalid/empty names
                if (!fromName || !toName || fromName.trim() === '' || toName.trim() === '') return false;

                // Skip flows with zero or negative migrants
                if (flow.totalMigrants <= 0) return false;

                return true;
            })
            .sort((a, b) => b.totalMigrants - a.totalMigrants); // Sort by totalMigrants descending

        const totalValidFlows = validFlows.length;
        const limitedFlows = validFlows.slice(0, 10); // Take top 10 flows
        const isLimitedResult = totalValidFlows > 10;

        // Create nodes from unique countries and filter out circular/invalid flows
        const allCountries = new Set<string>();
        const linkMap = new Map<string, number>(); // For aggregating duplicate flows

        limitedFlows.forEach((flow) => {
            const fromName = flow.countryFromName;
            const toName = flow.countryToName;

            allCountries.add(fromName);
            allCountries.add(toName);

            // Create unique key for this flow and aggregate duplicates
            const flowKey = `${fromName} -> ${toName}`;
            const existingValue = linkMap.get(flowKey) || 0;
            linkMap.set(flowKey, existingValue + flow.totalMigrants);
        });

        // Convert aggregated flows to links array
        const links: { source: string; target: string; value: number }[] = [];
        linkMap.forEach((value, key) => {
            const [source, target] = key.split(' -> ');
            links.push({
                source,
                target,
                value
            });
        });

        const nodes = Array.from(allCountries).map((country) => ({
            id: country,
            nodeColor: getCountryColor(country)
        }));

        // Check for circular dependencies and return empty state if found
        if (hasCircularDependencies(links)) {
            console.warn('Circular dependencies detected in migration data. Showing empty state.');

            return {
                sankeyData: {
                    nodes: [
                        { id: 'Circular dependency', nodeColor: '#ef4444' },
                        { id: 'detected', nodeColor: '#ef4444' }
                    ],
                    links: [{ source: 'Circular dependency', target: 'detected', value: 1000 }]
                },
                totalFlows: totalValidFlows,
                isLimited: false
            };
        }

        return {
            sankeyData: { nodes, links },
            totalFlows: totalValidFlows,
            isLimited: isLimitedResult
        };
    }, [data]);

    // Show empty state if no data or circular dependencies detected
    if (!data || data.length === 0) {
        return (
            <div className='flex h-96 w-full items-center justify-center'>
                <div className='space-y-4 text-center'>
                    {/* Faded skeleton background */}
                    <div className='relative'>
                        <div className='flex items-center justify-center space-x-8 opacity-10'>
                            <div className='space-y-2'>
                                <div className='h-16 w-16 rounded-lg bg-blue-300'></div>
                                <div className='h-3 w-12 rounded bg-blue-300'></div>
                            </div>
                            <div className='h-8 w-32 rounded-full bg-blue-300'></div>
                            <div className='space-y-2'>
                                <div className='h-16 w-16 rounded-lg bg-purple-300'></div>
                                <div className='h-3 w-12 rounded bg-purple-300'></div>
                            </div>
                        </div>
                    </div>
                    <div className='relative z-10 space-y-2'>
                        <div className='text-muted-foreground text-lg'>Choose migration corridors to explore</div>
                        <div className='text-muted-foreground/70 text-sm'>
                            Search for countries, regions, or select "World" in the controls above
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Check if we have circular dependency state
    const hasCircularDependencyState = sankeyData.nodes.some((node) => node.id === 'Circular dependency');
    if (hasCircularDependencyState) {
        return (
            <div className='flex h-96 w-full items-center justify-center'>
                <div className='space-y-4 text-center'>
                    {/* Warning icon background */}
                    <div className='relative'>
                        <div className='flex items-center justify-center space-x-8 opacity-10'>
                            <div className='space-y-2'>
                                <div className='h-16 w-16 rounded-lg bg-red-300'></div>
                                <div className='h-3 w-12 rounded bg-red-300'></div>
                            </div>
                            <div className='h-8 w-32 rounded-full bg-red-300'></div>
                            <div className='space-y-2'>
                                <div className='h-16 w-16 rounded-lg bg-red-300'></div>
                                <div className='h-3 w-12 rounded bg-red-300'></div>
                            </div>
                        </div>
                    </div>
                    <div className='relative z-10 space-y-2'>
                        <div className='text-lg text-red-600'>Circular migration flows detected</div>
                        <div className='text-muted-foreground/70 text-sm'>
                            Please adjust your corridor selection to avoid circular dependencies
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className='w-full space-y-2'>
            <div className='h-96 w-full'>
                <ResponsiveSankey
                    data={sankeyData}
                    margin={{ top: 40, right: 160, bottom: 40, left: 50 }}
                    align='justify'
                    colors={{ scheme: 'category10' }}
                    nodeOpacity={1}
                    nodeHoverOthersOpacity={0.35}
                    nodeThickness={18}
                    nodeSpacing={24}
                    nodeBorderWidth={0}
                    nodeBorderColor={{
                        from: 'color',
                        modifiers: [['darker', 0.8]]
                    }}
                    nodeBorderRadius={3}
                    linkOpacity={0.6}
                    linkHoverOthersOpacity={0.1}
                    linkContract={3}
                    enableLinkGradient={true}
                    labelPosition='inside'
                    labelOrientation='horizontal'
                    labelPadding={16}
                    labelTextColor={{
                        from: 'color',
                        modifiers: [['darker', 1]]
                    }}
                    animate={true}
                    motionConfig='gentle'
                />
            </div>
            {isLimited && (
                <div className='text-muted-foreground text-center text-sm'>Showing top 10 migration flows </div>
            )}
        </div>
    );
}
