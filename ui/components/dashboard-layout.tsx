"use client"

import type { ReactNode } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface DashboardLayoutProps {
  children: ReactNode
  title: string
  description?: string
}

export function DashboardLayout({ children, title, description }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto p-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-balance bg-gradient-to-r from-primary to-primary bg-clip-text text-transparent">
            {title}
          </h1>
          {description && <p className="text-lg text-muted-foreground text-pretty max-w-2xl mx-auto">{description}</p>}
        </div>
        {children}
      </div>
    </div>
  )
}

interface DashboardGridProps {
  children: ReactNode
  columns?: 1 | 2 | 3 | 4
}

export function DashboardGrid({ children, columns = 2 }: DashboardGridProps) {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 lg:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 xl:grid-cols-4",
  }

  return <div className={`grid gap-6 ${gridCols[columns]}`}>{children}</div>
}

interface DashboardCardProps {
  title: string
  description?: string
  children: ReactNode
  className?: string
}

export function DashboardCard({ title, description, children, className = "" }: DashboardCardProps) {
  return (
    <Card className={`border-border/50 shadow-lg hover:shadow-xl transition-shadow ${className}`}>
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold text-foreground">{title}</CardTitle>
        {description && <CardDescription className="text-muted-foreground">{description}</CardDescription>}
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  )
}
