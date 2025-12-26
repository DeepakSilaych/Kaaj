import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useRef, useEffect } from 'react'
import { fetchPrograms, fetchProgram, updateProgram, deleteProgram, createProgram, uploadProgramPdf, STATIC_BASE, type Program } from '@/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, X, Upload, Plus, Trash2, File, FileText, Sparkles } from 'lucide-react'
import { Portal } from '@/components/ui/portal'
import { cn } from '@/lib/utils'


function ProgramCard({ program, onEdit, onDelete }: { 
  program: Program
  onEdit: (p: Program) => void
  onDelete: (id: number) => void 
}) {
  return (
    <Card className="hover:border-primary/30 transition-colors">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">{program.name}</CardTitle>
            {program.description && (
              <CardDescription className="line-clamp-2">{program.description}</CardDescription>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            <Button variant="secondary" size="sm" onClick={() => onEdit(program)}>
              Edit
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(program.id)}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </div>
        {program.pdf_path && (
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <File className="w-3 h-3" />
            <span className="truncate">{program.pdf_path.split('/').pop()}</span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 text-sm">
          {[
            { label: 'Min FICO', value: program.min_fico ?? '—' },
            { label: 'PayNet', value: program.min_paynet ?? '—' },
            { label: 'Min Years', value: program.min_years_in_business ?? '—' },
            { label: 'Loan Min', value: program.min_loan_amount ? `$${(program.min_loan_amount / 1000).toFixed(0)}k` : '—' },
            { label: 'Loan Max', value: program.max_loan_amount ? `$${(program.max_loan_amount / 1000).toFixed(0)}k` : '—' },
            { label: 'Max Term', value: program.max_term_months ? `${program.max_term_months}mo` : '—' },
          ].map((item, i) => (
            <div key={i} className="p-2.5 bg-muted rounded-md">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="font-mono font-medium">{item.value}</p>
            </div>
          ))}
        </div>

        {program.restricted_industries?.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">Restricted Industries</p>
            <div className="flex flex-wrap gap-1.5">
              {program.restricted_industries.slice(0, 4).map((ind, i) => (
                <Badge key={i} variant="destructive" className="text-xs">{ind}</Badge>
              ))}
              {program.restricted_industries.length > 4 && (
                <Badge variant="secondary" className="text-xs">+{program.restricted_industries.length - 4}</Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Editor with PDF viewer side-by-side
function EditModal({ program, onClose }: { program: Program | null; onClose: () => void }) {
  const queryClient = useQueryClient()
  const isNew = !program?.id
  const [tab, setTab] = useState<'credit' | 'loan' | 'background' | 'restrictions'>('credit')
  
  // Fetch full program with text_preview if editing
  const { data: fullProgram } = useQuery({
    queryKey: ['program', program?.id],
    queryFn: () => fetchProgram(program!.id),
    enabled: !!program?.id,
    initialData: program || undefined,
  })

  const [form, setForm] = useState({
    name: program?.name ?? '',
    description: program?.description ?? '',
    min_fico: program?.min_fico ?? '',
    min_fico_no_paynet: program?.min_fico_no_paynet ?? '',
    min_paynet: program?.min_paynet ?? '',
    min_years_in_business: program?.min_years_in_business ?? '',
    min_years_no_paynet: program?.min_years_no_paynet ?? '',
    min_revenue: program?.min_revenue ?? '',
    min_loan_amount: program?.min_loan_amount ?? '',
    max_loan_amount: program?.max_loan_amount ?? '',
    max_term_months: program?.max_term_months ?? '',
    max_bankruptcies: program?.max_bankruptcies ?? 0,
    min_bankruptcy_years: program?.min_bankruptcy_years ?? '',
    allow_tax_liens: program?.allow_tax_liens ?? true,
    allow_judgments: program?.allow_judgments ?? true,
    allow_foreclosures: program?.allow_foreclosures ?? true,
    require_homeownership: program?.require_homeownership ?? false,
    require_us_citizen: program?.require_us_citizen ?? false,
    max_equipment_age_years: program?.max_equipment_age_years ?? '',
    max_soft_cost_percent: program?.max_soft_cost_percent ?? '',
    restricted_states: (program?.restricted_states ?? []).join(', '),
    restricted_industries: (program?.restricted_industries ?? []).join(', '),
  })

  // Update form when fullProgram loads
  useEffect(() => {
    if (fullProgram && fullProgram.id) {
      setForm({
        name: fullProgram.name ?? '',
        description: fullProgram.description ?? '',
        min_fico: fullProgram.min_fico ?? '',
        min_fico_no_paynet: fullProgram.min_fico_no_paynet ?? '',
        min_paynet: fullProgram.min_paynet ?? '',
        min_years_in_business: fullProgram.min_years_in_business ?? '',
        min_years_no_paynet: fullProgram.min_years_no_paynet ?? '',
        min_revenue: fullProgram.min_revenue ?? '',
        min_loan_amount: fullProgram.min_loan_amount ?? '',
        max_loan_amount: fullProgram.max_loan_amount ?? '',
        max_term_months: fullProgram.max_term_months ?? '',
        max_bankruptcies: fullProgram.max_bankruptcies ?? 0,
        min_bankruptcy_years: fullProgram.min_bankruptcy_years ?? '',
        allow_tax_liens: fullProgram.allow_tax_liens ?? true,
        allow_judgments: fullProgram.allow_judgments ?? true,
        allow_foreclosures: fullProgram.allow_foreclosures ?? true,
        require_homeownership: fullProgram.require_homeownership ?? false,
        require_us_citizen: fullProgram.require_us_citizen ?? false,
        max_equipment_age_years: fullProgram.max_equipment_age_years ?? '',
        max_soft_cost_percent: fullProgram.max_soft_cost_percent ?? '',
        restricted_states: (fullProgram.restricted_states ?? []).join(', '),
        restricted_industries: (fullProgram.restricted_industries ?? []).join(', '),
      })
    }
  }, [fullProgram])

  const mutation = useMutation({
    mutationFn: () => {
      const data = {
        name: form.name,
        description: form.description || null,
        min_fico: form.min_fico ? Number(form.min_fico) : null,
        min_fico_no_paynet: form.min_fico_no_paynet ? Number(form.min_fico_no_paynet) : null,
        min_paynet: form.min_paynet ? Number(form.min_paynet) : null,
        min_years_in_business: form.min_years_in_business ? Number(form.min_years_in_business) : null,
        min_years_no_paynet: form.min_years_no_paynet ? Number(form.min_years_no_paynet) : null,
        min_revenue: form.min_revenue ? Number(form.min_revenue) : null,
        min_loan_amount: form.min_loan_amount ? Number(form.min_loan_amount) : null,
        max_loan_amount: form.max_loan_amount ? Number(form.max_loan_amount) : null,
        max_term_months: form.max_term_months ? Number(form.max_term_months) : null,
        max_bankruptcies: Number(form.max_bankruptcies) || 0,
        min_bankruptcy_years: form.min_bankruptcy_years ? Number(form.min_bankruptcy_years) : null,
        allow_tax_liens: form.allow_tax_liens,
        allow_judgments: form.allow_judgments,
        allow_foreclosures: form.allow_foreclosures,
        require_homeownership: form.require_homeownership,
        require_us_citizen: form.require_us_citizen,
        max_equipment_age_years: form.max_equipment_age_years ? Number(form.max_equipment_age_years) : null,
        max_soft_cost_percent: form.max_soft_cost_percent ? Number(form.max_soft_cost_percent) : null,
        restricted_states: form.restricted_states ? form.restricted_states.split(',').map(s => s.trim()).filter(Boolean) : [],
        restricted_industries: form.restricted_industries ? form.restricted_industries.split(',').map(s => s.trim()).filter(Boolean) : [],
      }
      return isNew ? createProgram(data) : updateProgram(program!.id, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] })
      onClose()
    },
  })

  const tabs = [
    { id: 'credit', label: 'Credit' },
    { id: 'loan', label: 'Loan' },
    { id: 'background', label: 'Background' },
    { id: 'restrictions', label: 'Restrictions' },
  ] as const

  const hasPdf = !!fullProgram?.pdf_path || !!fullProgram?.text_preview

  return (
    <Portal>
      <div className="fixed top-0 left-0 w-[100vw] h-[100vh] bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={onClose}>
        <Card className={cn(
          "max-h-[90vh] overflow-hidden animate-fade-in",
          hasPdf ? "w-full max-w-6xl" : "w-full max-w-2xl"
        )} onClick={e => e.stopPropagation()}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <CardTitle>{isNew ? 'New Program' : 'Edit Program'}</CardTitle>
              <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
            </div>
          </CardHeader>
          
          <CardContent className="overflow-hidden">
            <div className={cn("flex gap-6", hasPdf ? "flex-row" : "flex-col")}>
              {/* Editor Form */}
              <div className={cn("overflow-y-auto max-h-[70vh]", hasPdf ? "flex-1" : "w-full")}>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="col-span-2 space-y-2">
                    <Label className="text-xs">Program Name</Label>
                    <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g., Stearns Bank - Tier A" />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label className="text-xs">Description</Label>
                    <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional" />
                  </div>
                </div>

                <div className="flex gap-1 mb-4 border-b border-border">
                  {tabs.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)} className={cn("px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors", tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>{t.label}</button>
                  ))}
                </div>

                {tab === 'credit' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label className="text-xs">Min FICO</Label><Input type="number" value={form.min_fico} onChange={e => setForm({ ...form, min_fico: e.target.value })} /></div>
                    <div className="space-y-2"><Label className="text-xs">Min FICO (no PayNet)</Label><Input type="number" value={form.min_fico_no_paynet} onChange={e => setForm({ ...form, min_fico_no_paynet: e.target.value })} /></div>
                    <div className="space-y-2"><Label className="text-xs">Min PayNet</Label><Input type="number" value={form.min_paynet} onChange={e => setForm({ ...form, min_paynet: e.target.value })} /></div>
                    <div className="space-y-2"><Label className="text-xs">Min Years in Business</Label><Input type="number" step="0.5" value={form.min_years_in_business} onChange={e => setForm({ ...form, min_years_in_business: e.target.value })} /></div>
                    <div className="space-y-2"><Label className="text-xs">Min Years (no PayNet)</Label><Input type="number" step="0.5" value={form.min_years_no_paynet} onChange={e => setForm({ ...form, min_years_no_paynet: e.target.value })} /></div>
                    <div className="space-y-2"><Label className="text-xs">Min Revenue ($)</Label><Input type="number" value={form.min_revenue} onChange={e => setForm({ ...form, min_revenue: e.target.value })} /></div>
                  </div>
                )}

                {tab === 'loan' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label className="text-xs">Min Loan ($)</Label><Input type="number" value={form.min_loan_amount} onChange={e => setForm({ ...form, min_loan_amount: e.target.value })} /></div>
                    <div className="space-y-2"><Label className="text-xs">Max Loan ($)</Label><Input type="number" value={form.max_loan_amount} onChange={e => setForm({ ...form, max_loan_amount: e.target.value })} /></div>
                    <div className="space-y-2"><Label className="text-xs">Max Term (months)</Label><Input type="number" value={form.max_term_months} onChange={e => setForm({ ...form, max_term_months: e.target.value })} /></div>
                    <div className="space-y-2"><Label className="text-xs">Max Equipment Age (years)</Label><Input type="number" value={form.max_equipment_age_years} onChange={e => setForm({ ...form, max_equipment_age_years: e.target.value })} /></div>
                    <div className="space-y-2"><Label className="text-xs">Max Soft Cost %</Label><Input type="number" value={form.max_soft_cost_percent} onChange={e => setForm({ ...form, max_soft_cost_percent: e.target.value })} /></div>
                  </div>
                )}

                {tab === 'background' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label className="text-xs">Max Bankruptcies</Label><Input type="number" min="0" value={form.max_bankruptcies} onChange={e => setForm({ ...form, max_bankruptcies: Number(e.target.value) })} /></div>
                      <div className="space-y-2"><Label className="text-xs">Min Years Since BK</Label><Input type="number" value={form.min_bankruptcy_years} onChange={e => setForm({ ...form, min_bankruptcy_years: e.target.value })} /></div>
                    </div>
                    <div className="space-y-3 pt-2">
                      <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.allow_tax_liens} onChange={e => setForm({ ...form, allow_tax_liens: e.target.checked })} className="rounded" />Allow Tax Liens</label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.allow_judgments} onChange={e => setForm({ ...form, allow_judgments: e.target.checked })} className="rounded" />Allow Judgments</label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.allow_foreclosures} onChange={e => setForm({ ...form, allow_foreclosures: e.target.checked })} className="rounded" />Allow Foreclosures</label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.require_homeownership} onChange={e => setForm({ ...form, require_homeownership: e.target.checked })} className="rounded" />Require Homeownership</label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.require_us_citizen} onChange={e => setForm({ ...form, require_us_citizen: e.target.checked })} className="rounded" />Require US Citizen</label>
                    </div>
                  </div>
                )}

                {tab === 'restrictions' && (
                  <div className="space-y-4">
                    <div className="space-y-2"><Label className="text-xs">Restricted States (comma-separated)</Label><Input value={form.restricted_states} onChange={e => setForm({ ...form, restricted_states: e.target.value })} placeholder="e.g., CA, NV, ND" /></div>
                    <div className="space-y-2"><Label className="text-xs">Restricted Industries (comma-separated)</Label><textarea className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" rows={4} value={form.restricted_industries} onChange={e => setForm({ ...form, restricted_industries: e.target.value })} placeholder="e.g., Cannabis, Gambling" /></div>
                  </div>
                )}

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
                  <Button variant="ghost" onClick={onClose}>Cancel</Button>
                  <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.name}>
                    {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isNew ? 'Create' : 'Save Changes'}
                  </Button>
                </div>
              </div>

              {/* PDF Preview Side */}
              {hasPdf && (
                <div className="flex-1 border-l pl-6 flex flex-col">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Source PDF</span>
                    {fullProgram?.pdf_path && (
                      <span className="text-xs text-muted-foreground truncate">
                        {fullProgram.pdf_path.split('/').pop()}
                      </span>
                    )}
                  </div>
                  {fullProgram?.pdf_path ? (
                    <iframe
                      src={`${STATIC_BASE}/${fullProgram.pdf_path}`}
                      className="flex-1 w-full min-h-[500px] rounded-lg border border-border"
                      title="PDF Preview"
                    />
                  ) : (
                    <div className="bg-muted rounded-lg p-4 overflow-y-auto max-h-[60vh]">
                      <pre className="text-xs font-mono whitespace-pre-wrap text-muted-foreground">
                        {fullProgram?.text_preview || 'Loading PDF content...'}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Portal>
  )
}

// Upload PDF → Parse → Open Editor
function PdfUploadModal({ onClose, onProgramCreated }: { onClose: () => void; onProgramCreated: (program: Program) => void }) {
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'parsing' | 'success' | 'error'>('idle')
  const [createdProgramId, setCreatedProgramId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Poll for program creation
  const { data: programs } = useQuery({
    queryKey: ['programs'],
    queryFn: () => fetchPrograms(),
    enabled: status === 'parsing',
    refetchInterval: 2000, // Poll every 2 seconds while parsing
  })

  // Check if our program was parsed (description updated from "Processing...")
  useEffect(() => {
    if (status === 'parsing' && createdProgramId && programs) {
      const program = programs.find(p => p.id === createdProgramId)
      if (program && program.description !== 'Processing...') {
        setStatus('success')
        queryClient.invalidateQueries({ queryKey: ['programs'] })
        // Open editor with the new program
        onProgramCreated(program)
      }
    }
  }, [programs, createdProgramId, status, queryClient, onProgramCreated])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setStatus('uploading')
    setError(null)
    try {
      const result = await uploadProgramPdf(file)
      if (result.program_id) {
        setCreatedProgramId(result.program_id)
        setStatus('parsing')
      }
    } catch (err: any) {
      setStatus('error')
      setError(err.response?.data?.detail || 'Upload failed')
    }
  }

  return (
    <Portal>
      <div className="fixed top-0 left-0 w-[100vw] h-[100vh] bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={onClose}>
        <Card className="w-full max-w-md animate-fade-in" onClick={e => e.stopPropagation()}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Upload Program PDF</CardTitle>
                <CardDescription>AI will parse the PDF and open editor</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            {status === 'idle' && (
              <div>
                <input ref={fileRef} type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
                <div 
                  onClick={() => fileRef.current?.click()} 
                  className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                >
                  <div className="flex flex-col items-center gap-3">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <p className="text-sm font-medium">Click to upload PDF</p>
                    <p className="text-xs text-muted-foreground">Lender guidelines document</p>
                  </div>
                </div>
              </div>
            )}

            {status === 'uploading' && (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Uploading PDF...</p>
              </div>
            )}

            {status === 'parsing' && (
              <div className="text-center py-8">
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <Sparkles className="w-8 h-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary animate-pulse" />
                  <Loader2 className="w-16 h-16 animate-spin text-primary/30" />
                </div>
                <p className="text-sm font-medium">AI is parsing your PDF...</p>
                <p className="text-xs text-muted-foreground mt-1">Extracting program criteria</p>
              </div>
            )}

            {status === 'error' && (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                  <X className="w-8 h-8 text-destructive" />
                </div>
                <p className="font-medium text-destructive">Upload failed</p>
                <p className="text-sm text-muted-foreground mt-1">{error}</p>
                <Button className="mt-4" variant="outline" onClick={() => setStatus('idle')}>Try Again</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Portal>
  )
}

export default function ProgramsPage() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Program | null>(null)
  const [showUpload, setShowUpload] = useState(false)

  const { data: programs, isLoading } = useQuery({
    queryKey: ['programs'],
    queryFn: () => fetchPrograms(),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProgram,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['programs'] }),
  })

  const handleDelete = (id: number) => {
    if (confirm('Delete this program?')) deleteMutation.mutate(id)
  }

  const handleProgramCreated = (program: Program) => {
    setShowUpload(false)
    setEditing(program)
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Programs</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure eligibility criteria for financing programs</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowUpload(true)}>
            <Upload className="w-4 h-4" /> Upload PDF
          </Button>
          <Button onClick={() => setEditing({} as Program)}>
            <Plus className="w-4 h-4" /> New Program
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : !programs?.length ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">No programs yet</p>
          <Button onClick={() => setShowUpload(true)}><Upload className="w-4 h-4" /> Upload PDF</Button>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {programs.map(program => (
            <ProgramCard 
              key={program.id} 
              program={program} 
              onEdit={setEditing} 
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {editing && <EditModal program={editing.id ? editing : null} onClose={() => setEditing(null)} />}
      {showUpload && <PdfUploadModal onClose={() => setShowUpload(false)} onProgramCreated={handleProgramCreated} />}
    </div>
  )
}
