import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ArrowLeft, ExternalLink, Database, BookOpen, BarChart3 } from "lucide-react"

export default function AboutDataPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header with back button */}
        <div className="flex items-center gap-4 mb-8">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>

        {/* Title */}
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-4xl font-bold text-balance bg-gradient-to-r from-primary to-primary bg-clip-text text-transparent">
            About the source data
          </h1>
          <p className="text-lg text-muted-foreground text-pretty max-w-2xl mx-auto">
            Understanding the source and methodology behind the migration flow visualizations
          </p>
        </div>

        {/* Disclaimer */}
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6 max-w-2xl mx-auto">
          <p className="text-sm text-amber-800 dark:text-amber-200 text-center">
            <strong>Disclaimer:</strong> This visualization is an independent project and we have no affiliation with the research authors or their institutions. Further more, this data represents all types of migration (from aggregated data from Facebook) and is therefore a mix of both regular and irregular migration and should not be use for any policy decisions.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Research Source */}
          <Card className="border-border/50 shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <CardTitle>Research Source</CardTitle>
              </div>
              <CardDescription>
                Foundational research and methodology
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">
                  "Measuring global migration flows using online data"
                </h3>
                <p className="text-sm text-muted-foreground">
                  <strong>Authors:</strong> G. Chi, G.J. Abel, D. Johnston, E. Giraudy, & M. Bailey
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Publication:</strong> Proc. Natl. Acad. Sci. U.S.A. 122 (18) e2409418122 (2025)
                </p>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">PNAS 2025</Badge>
                <Badge variant="outline">Peer-reviewed</Badge>
              </div>
              <Link 
                href="https://doi.org/10.1073/pnas.2409418122" 
                target="_blank"
                className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors text-sm"
              >
                <ExternalLink className="h-4 w-4" />
                View Research Paper
              </Link>
            </CardContent>
          </Card>

          {/* Data Coverage */}
          <Card className="border-border/50 shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-chart-2" />
                <CardTitle>Data Coverage</CardTitle>
              </div>
              <CardDescription>
                Temporal and geographic scope
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-foreground">Time Period</h4>
                  <p className="text-sm text-muted-foreground">2019-2022</p>
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Granularity</h4>
                  <p className="text-sm text-muted-foreground">Monthly flows</p>
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Coverage</h4>
                  <p className="text-sm text-muted-foreground">Global migration patterns</p>
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Source</h4>
                  <p className="text-sm text-muted-foreground">Online data aggregation</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Availability */}
          <Card className="border-border/50 shadow-lg md:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-chart-3" />
                <CardTitle>Data Availability & Resources</CardTitle>
              </div>
              <CardDescription>
                Access to data, replication materials, and documentation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-foreground">Aggregated Data</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Anonymized migration flow estimates available publicly
                  </p>
                  <Link 
                    href="https://data.humdata.org/dataset/international-migration-flows" 
                    target="_blank"
                    className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors text-sm"
                  >
                    <ExternalLink className="h-4 w-4" />
                    HDX Platform
                  </Link>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-foreground">Replication Materials</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Scripts and code to reproduce paper figures
                  </p>
                  <Link 
                    href="https://doi.org/10.7910/DVN/LPA925" 
                    target="_blank"
                    className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors text-sm"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Harvard Dataverse
                  </Link>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-foreground">Documentation</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Complete methodology and supplementary materials
                  </p>
                  <Link 
                    href="https://www.pnas.org/doi/suppl/10.1073/pnas.2409418122/suppl_file/pnas.2409418122.sapp.pdf" 
                    target="_blank"
                    className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors text-sm"
                  >
                    <ExternalLink className="h-4 w-4" />
                    PNAS Appendix
                  </Link>
                </div>
              </div>

              <div className="bg-muted/20 p-4 rounded-lg border-l-4 border-primary/50">
                <p className="text-sm text-muted-foreground">
                  <strong>Privacy Note:</strong> Individual-level data used to construct these estimates are not publicly available due to data provider restrictions. Only anonymized, aggregated migration flow estimates are accessible.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Methodology Overview */}
          <Card className="border-border/50 shadow-lg md:col-span-2">
            <CardHeader>
              <CardTitle>Methodology Overview</CardTitle>
              <CardDescription>
                How global migration flows are measured using online data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This research represents an approach to measuring global migration flows by leveraging online data sources. The methodology provides unprecedented temporal resolution (monthly flows) and global coverage, offering new insights into migration patterns and seasonal variations.
              </p>
              
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-foreground">Innovation</h4>
                  <p className="text-sm text-muted-foreground">
                    Uses online data to overcome traditional migration data limitations, providing more timely and granular insights.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-foreground">Validation</h4>
                  <p className="text-sm text-muted-foreground">
                    Methods validated against traditional migration statistics and administrative records where available.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Acknowledgment */}
        <div className="text-center py-8">
          <p className="text-muted-foreground text-sm max-w-2xl mx-auto">
            We gratefully acknowledge the authors for making their research and data accessible to the scientific community, enabling projects like this to build upon their important work. 🌍
          </p>
        </div>
      </div>
    </div>
  )
}
