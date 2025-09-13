import type { Metadata } from 'next';

import '../globals.css';

export const metadata: Metadata = {
    title: 'Migration Explorer',
    description: 'Explore migration patterns across countries and regions'
};

export default function ExploreLayout({
    children
}: Readonly<{
    children: React.ReactNode;
}>) {
    return <>{children}</>;
}
