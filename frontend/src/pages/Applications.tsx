import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchApplications, fetchAdminApplications, type Application } from '@/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Loader2, Plus, Clock, CheckCircle, DollarSign, BarChart3 } from 'lucide-react'

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: 'warning' | 'secondary' | 'success'; label: string }> = {
    pending: { variant: 'warning', label: 'Pending' },
    processing: { variant: 'secondary', label: 'Processing' },
    completed: { variant: 'success', label: 'Completed' },
  }
  const { variant, label } = config[status] || config.pending
  return <Badge variant={variant}>{label}</Badge>
}

function EmptyState() {
  return (
    <Card className="text-center py-16">
      <CardContent className="pt-6">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
          <FileText className="w-7 h-7 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No applications yet</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
          Submit your first loan application to start matching with lenders
        </p>
        <Link to="/new">
          <Button>
            <Plus className="w-4 h-4" />
            Create Application
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}

function ApplicationRow({ app, isAdmin }: { app: Application, isAdmin?: boolean }) {
  const basePath = isAdmin ? '/admin' : ''
  return (
    <Link
      to={`${basePath}/applications/${app.id}`}
      className="grid grid-cols-12 gap-4 items-center px-5 py-4 hover:bg-accent transition-colors group"
    >
      <div className="col-span-4">
        <p className="font-medium text-foreground group-hover:text-primary transition-colors">
          {app.business_name}
        </p>
        <p className="text-sm text-muted-foreground">{app.industry}</p>
      </div>
      <div className="col-span-2">
        <p className="text-sm text-muted-foreground">{app.state}</p>
        <p className="text-xs text-muted-foreground">{app.years_in_business}y in business</p>
      </div>
      <div className="col-span-2">
        <p className="font-mono text-sm font-medium">
          ${app.loan_amount.toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground">{app.term_months} months</p>
      </div>
      <div className="col-span-2">
        <p className="font-mono text-sm text-muted-foreground">{app.fico_score}</p>
        <p className="text-xs text-muted-foreground">FICO</p>
      </div>
      <div className="col-span-2 text-right">
        <StatusBadge status={app.status} />
      </div>
    </Link>
  )
}

export default function ApplicationsPage({ isAdmin = false }: { isAdmin?: boolean }) {
  const { data: applications, isLoading } = useQuery({
    queryKey: [isAdmin ? 'admin-applications' : 'applications'],
    queryFn: isAdmin ? fetchAdminApplications : fetchApplications,
  })

  const stats = [
    { label: 'Total Applications', value: applications?.length || 0, icon: BarChart3 },
    { label: 'Pending Review', value: applications?.filter(a => a.status === 'pending').length || 0, icon: Clock },
    { label: 'Completed', value: applications?.filter(a => a.status === 'completed').length || 0, icon: CheckCircle },
    { label: 'Avg. Loan Size', value: applications?.length ? `$${Math.round(applications.reduce((a, b) => a + b.loan_amount, 0) / applications.length / 1000)}k` : '$0', icon: DollarSign },
  ]

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">
          {isAdmin ? 'All Applications' : 'Applications'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isAdmin ? 'View and manage all loan applications' : 'Manage loan applications and view lender matches'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                <stat.icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-semibold font-mono">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : !applications?.length ? (
        isAdmin ? (
            <Card className="text-center py-16">
              <CardContent>
                <p className="text-muted-foreground">No applications found in the system.</p>
              </CardContent>
            </Card>
        ) : (
            <EmptyState />
        )
      ) : (
        <Card className="overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-muted border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <div className="col-span-4">Business</div>
            <div className="col-span-2">Location</div>
            <div className="col-span-2">Amount</div>
            <div className="col-span-2">Credit</div>
            <div className="col-span-2 text-right">Status</div>
          </div>
          
          {/* Rows */}
          <div className="divide-y divide-border">
            {applications.map((app: Application) => (
              <ApplicationRow key={app.id} app={app} isAdmin={isAdmin} />
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
