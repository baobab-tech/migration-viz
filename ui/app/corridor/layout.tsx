import type { Metadata } from 'next'
import '../globals.css'

export const metadata: Metadata = {
  title: 'Migration Corridor Analysis',
  description: 'Analyze migration flows between specific countries and regions',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
        <>{children}</>
  )
}
