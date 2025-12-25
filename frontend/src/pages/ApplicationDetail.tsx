import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, Link, useLocation } from 'react-router-dom'
import { fetchApplication, fetchMatchResults, fetchPrograms, type MatchResult, type Program } from '@/api'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Check, X, Loader2, ChevronDown, ChevronRight, AlertCircle, CheckCircle2, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Portal } from '@/components/ui/portal'

// PDF Viewer Modal
function PdfModal({ program, onClose }: { program: Program; onClose: () => void }) {
  return (
    <Portal>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={onClose}>
        <div className="bg-card rounded-lg w-full max-w-4xl h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4 border-b">
            <div>
              <h3 className="font-semibold">{program.name}</h3>
              <p className="text-sm text-muted-foreground">{program.pdf_path?.split('/').pop()}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex-1 p-1">
            {program.pdf_path ? (
              <iframe
                src={`http://localhost:8000/${program.pdf_path}`}
                className="w-full h-full rounded border-0"
                title={`${program.name} PDF`}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No PDF available
              </div>
            )}
          </div>
        </div>
      </div>
    </Portal>
  )
}

const labelMap: Record<string, string> = {
  fico_score: 'FICO Score',
  paynet_score: 'PayNet Score',
  years_in_business: 'Time in Business',
  annual_revenue: 'Annual Revenue',
  loan_amount: 'Loan Amount',
  term_months: 'Term Length',
  state: 'State',
  industry: 'Industry',
  equipment_type: 'Equipment Type',
  bankruptcies: 'Bankruptcy',
  tax_liens: 'Tax Liens',
  judgments: 'Judgments',
  foreclosures: 'Foreclosures',
  homeownership: 'Homeownership',
  citizenship: 'Citizenship',
  equipment_age: 'Equipment Age',
  soft_costs: 'Soft Costs',
}

function CriteriaPanel({ match }: { match: MatchResult }) {
  const criteria = Object.entries(match.criteria_results || {})
  const passed = criteria.filter(([, v]) => v.passed)
  const failed = criteria.filter(([, v]) => !v.passed)

  return (
    <tr>
      <td colSpan={5} className="p-0">
        <div className="bg-muted/30 border-t p-4">
          <div className="grid md:grid-cols-2 gap-2">
            {/* Failed criteria first */}
            {failed.map(([key, value]) => (
              <div key={key} className="flex items-start gap-2 p-2 rounded bg-red-500/5 text-sm">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium text-red-600 dark:text-red-400">{labelMap[key] || key}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">{value.reason}</p>
                </div>
              </div>
            ))}
            {/* Passed criteria */}
            {passed.map(([key, value]) => (
              <div key={key} className="flex items-start gap-2 p-2 rounded bg-emerald-500/5 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">{labelMap[key] || key}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">{value.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </td>
    </tr>
  )
}

function ResultRow({ match, rank, program, onViewPdf }: { 
  match: MatchResult; 
  rank?: number;
  program?: Program;
  onViewPdf?: (p: Program) => void;
}) {
  const [expanded, setExpanded] = useState(false)
  const criteria = Object.entries(match.criteria_results || {})
  const passed = criteria.filter(([, v]) => v.passed).length
  const failed = criteria.filter(([, v]) => !v.passed).length

  return (
    <>
      <tr 
        className={cn(
          "border-b hover:bg-muted/20 cursor-pointer transition-colors",
          expanded && "bg-muted/10"
        )}
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-4 py-3 w-12">
          {rank ? (
            <span className="text-muted-foreground">{rank}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="font-medium">{match.program_name}</span>
            {program?.pdf_path && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onViewPdf?.(program)
                }}
                className="text-muted-foreground hover:text-primary p-1 rounded hover:bg-muted transition-colors"
                title="View PDF"
              >
                <FileText className="w-4 h-4" />
              </button>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-right font-mono font-medium">
          <span className={match.is_eligible ? "text-emerald-500" : "text-muted-foreground"}>
            {match.fit_score}
          </span>
        </td>
        <td className="px-4 py-3 text-center">
          {match.is_eligible ? (
            <span className="inline-flex items-center gap-1 text-emerald-500 text-sm">
              <Check className="w-4 h-4" /> Eligible
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-muted-foreground text-sm">
              <X className="w-4 h-4" />
            </span>
          )}
        </td>
        <td className="px-4 py-3 w-48">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs">
              <span className="text-emerald-500">{passed} ✓</span>
              {failed > 0 && <span className="text-red-400">{failed} ✗</span>}
            </div>
            {expanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </td>
      </tr>
      {expanded && <CriteriaPanel match={match} />}
    </>
  )
}

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')
  const backPath = isAdmin ? '/admin' : '/'
  const appId = Number(id)
  const [viewingPdf, setViewingPdf] = useState<Program | null>(null)

  const { data: application, isLoading: appLoading } = useQuery({
    queryKey: ['application', appId],
    queryFn: () => fetchApplication(appId),
    enabled: !!appId,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'processing' ? 2000 : false
    },
  })

  const isProcessing = application?.status === 'processing'

  const { data: results, isLoading: resultsLoading } = useQuery({
    queryKey: ['matchResults', appId],
    queryFn: () => fetchMatchResults(appId),
    enabled: !!appId && !isProcessing,
    refetchInterval: isProcessing ? 2000 : false,
  })

  // Fetch programs to get PDF paths
  const { data: programs } = useQuery({
    queryKey: ['programs'],
    queryFn: fetchPrograms,
  })

  // Create a map of program_id -> program for quick lookup
  const programMap = new Map(programs?.map(p => [p.id, p]) || [])

  if (appLoading || resultsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!application) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Application not found</p>
        <Link to={backPath}><Button variant="link" className="mt-2">← Back</Button></Link>
      </div>
    )
  }

  const eligible = results?.filter(r => r.is_eligible).sort((a, b) => b.fit_score - a.fit_score) || []
  const ineligible = results?.filter(r => !r.is_eligible).sort((a, b) => b.fit_score - a.fit_score) || []

  return (
    <div className="animate-fade-in">
      <Link to={backPath}>
        <Button variant="ghost" size="sm" className="mb-6 -ml-2 text-muted-foreground">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
      </Link>

      {/* Application Summary */}
      <Card className="mb-8 p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-xl font-semibold">{application.business_name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {application.industry} · {application.state} · {application.years_in_business} years
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-mono font-semibold">${application.loan_amount.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">{application.term_months} months</p>
          </div>
        </div>
        
        <div className="grid grid-cols-5 gap-4 pt-4 border-t text-sm">
          <div><span className="text-muted-foreground">FICO</span><p className="font-mono font-medium mt-1">{application.fico_score}</p></div>
          <div><span className="text-muted-foreground">PayNet</span><p className="font-mono font-medium mt-1">{application.paynet_score || '—'}</p></div>
          <div><span className="text-muted-foreground">Revenue</span><p className="font-mono font-medium mt-1">${(application.annual_revenue/1000).toFixed(0)}k</p></div>
          <div><span className="text-muted-foreground">Equipment</span><p className="font-medium mt-1">{application.equipment_type}</p></div>
          <div><span className="text-muted-foreground">Guarantor</span><p className="font-medium mt-1">{application.guarantor_name}</p></div>
        </div>
      </Card>

      {/* Results Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-medium">Match Results</h2>
        {isProcessing ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing matches...
          </div>
        ) : (
          <div className="flex gap-4 text-sm">
            <span className="text-emerald-500">{eligible.length} eligible</span>
            <span className="text-muted-foreground">{ineligible.length} not eligible</span>
          </div>
        )}
      </div>

      {/* Processing State */}
      {isProcessing && (
        <Card className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
          <p className="text-muted-foreground">Matching against all programs...</p>
          <p className="text-xs text-muted-foreground mt-1">This usually takes a few seconds</p>
        </Card>
      )}

      {/* Results Table */}
      {!isProcessing && results && results.length > 0 && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left font-medium text-muted-foreground px-4 py-3 w-12">#</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Program</th>
                <th className="text-right font-medium text-muted-foreground px-4 py-3 w-20">Score</th>
                <th className="text-center font-medium text-muted-foreground px-4 py-3 w-24">Status</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3 w-48">Criteria</th>
              </tr>
            </thead>
            <tbody>
              {eligible.map((match, i) => (
                <ResultRow 
                  key={match.id} 
                  match={match} 
                  rank={i + 1} 
                  program={programMap.get(match.program_id)}
                  onViewPdf={setViewingPdf}
                />
              ))}
              {ineligible.map(match => (
                <ResultRow 
                  key={match.id} 
                  match={match}
                  program={programMap.get(match.program_id)}
                  onViewPdf={setViewingPdf}
                />
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {results?.length === 0 && !isProcessing && (
        <Card className="p-8 text-center text-muted-foreground">
          No match results available
        </Card>
      )}

      {/* PDF Viewer Modal */}
      {viewingPdf && <PdfModal program={viewingPdf} onClose={() => setViewingPdf(null)} />}
    </div>
  )
}
