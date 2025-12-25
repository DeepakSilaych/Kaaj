import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { createApplication, runMatching } from '@/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

interface FormData {
  business_name: string
  industry: string
  state: string
  years_in_business: number
  annual_revenue: number
  guarantor_name: string
  fico_score: number
  paynet_score: number | null
  is_homeowner: boolean
  is_us_citizen: boolean
  bankruptcies: number
  bankruptcy_discharge_years: number | null
  has_tax_liens: boolean
  has_judgments: boolean
  has_foreclosures: boolean
  loan_amount: number
  term_months: number
  equipment_type: string
  equipment_age_years: number
  equipment_description: string
  soft_cost_percent: number
}

const STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']
const INDUSTRIES = ['Construction', 'Manufacturing', 'Healthcare', 'Transportation', 'Trucking', 'Restaurant', 'Retail', 'Agriculture', 'Technology', 'Medical', 'Professional Services', 'Other']
const EQUIPMENT_TYPES = ['Construction Equipment', 'Manufacturing Machinery', 'Medical Equipment', 'Restaurant Equipment', 'Office Equipment', 'Trucks/Trailers', 'Technology/IT', 'Agricultural', 'Other']

function FormSection({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <Card className="mb-6">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
            {step}
          </span>
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-5">
          {children}
        </div>
      </CardContent>
    </Card>
  )
}

function Field({ label, error, children, span2 }: { label: string; error?: string; children: React.ReactNode; span2?: boolean }) {
  return (
    <div className={`space-y-2 ${span2 ? 'col-span-2' : ''}`}>
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function Checkbox({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer">
      <input type="checkbox" className="rounded border-input" {...props} />
      {label}
    </label>
  )
}

export default function NewApplicationPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { register, handleSubmit, formState: { errors }, watch, reset } = useForm<FormData>({
    defaultValues: {
      is_us_citizen: true,
      bankruptcies: 0,
      equipment_age_years: 0,
      soft_cost_percent: 0,
    }
  })

  const fillDummyData = () => {
    const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
    const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

    const businessNames = ['ABC Construction LLC', 'Summit Medical Group', 'Midwest Trucking Co', 'Elite Manufacturing Inc', 'Bay Area Dental', 'Coastal Landscaping', 'Metro Tech Solutions', 'Pioneer Farms LLC']
    const guarantorNames = ['John Smith', 'Sarah Johnson', 'Mike Davis', 'Emily Chen', 'Robert Williams', 'Lisa Martinez', 'David Brown', 'Jennifer Wilson']
    const equipmentDesc: Record<string, string[]> = {
      'Construction Equipment': ['2023 Caterpillar 320 Excavator', '2024 John Deere Backhoe', 'Bobcat Skid Steer S770'],
      'Manufacturing Machinery': ['CNC Milling Machine', 'Industrial Press Brake', 'Automated Assembly Line'],
      'Medical Equipment': ['MRI Scanner', 'Dental X-Ray System', 'Ultrasound Machine'],
      'Trucks/Trailers': ['2024 Peterbilt 579', 'Freightliner Cascadia', 'Kenworth T680'],
      'Restaurant Equipment': ['Commercial Kitchen Package', 'Walk-in Cooler System', 'Industrial Oven'],
      'Technology/IT': ['Server Rack Infrastructure', 'Network Equipment', 'Data Center Hardware'],
    }

    const industry = pick(INDUSTRIES)
    const equipType = pick(EQUIPMENT_TYPES)
    const hasBankruptcy = Math.random() < 0.15

    reset({
      business_name: pick(businessNames),
      industry,
      state: pick(STATES),
      years_in_business: rand(1, 15),
      annual_revenue: rand(100, 2000) * 1000,
      guarantor_name: pick(guarantorNames),
      fico_score: rand(620, 780),
      paynet_score: Math.random() > 0.3 ? rand(640, 720) : null,
      is_homeowner: Math.random() > 0.3,
      is_us_citizen: Math.random() > 0.1,
      bankruptcies: hasBankruptcy ? rand(1, 2) : 0,
      bankruptcy_discharge_years: hasBankruptcy ? rand(3, 10) : null,
      has_tax_liens: Math.random() < 0.1,
      has_judgments: Math.random() < 0.1,
      has_foreclosures: Math.random() < 0.05,
      loan_amount: rand(15, 300) * 1000,
      term_months: pick([24, 36, 48, 60, 72]),
      equipment_type: equipType,
      equipment_age_years: rand(0, 8),
      equipment_description: equipmentDesc[equipType]?.[0] || `${equipType} - Various`,
      soft_cost_percent: rand(0, 20),
    })
  }
  
  const bankruptcies = watch('bankruptcies')

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const app = await createApplication({
        ...data,
        years_in_business: Number(data.years_in_business),
        annual_revenue: Number(data.annual_revenue),
        fico_score: Number(data.fico_score),
        paynet_score: data.paynet_score ? Number(data.paynet_score) : null,
        loan_amount: Number(data.loan_amount),
        term_months: Number(data.term_months),
        bankruptcies: Number(data.bankruptcies) || 0,
        bankruptcy_discharge_years: data.bankruptcy_discharge_years ? Number(data.bankruptcy_discharge_years) : null,
        equipment_age_years: Number(data.equipment_age_years) || 0,
        soft_cost_percent: Number(data.soft_cost_percent) || 0,
        equipment_description: data.equipment_description || null,
      })
      await runMatching(app.id)
      return app
    },
    onSuccess: (app) => {
      queryClient.invalidateQueries({ queryKey: ['applications'] })
      navigate(`/applications/${app.id}`)
    },
  })

  const onSubmit = (data: FormData) => mutation.mutate(data)

  return (
    <div className="max-w-3xl animate-fade-in">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">New Loan Application</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Complete the form to find matching programs for your equipment finance request
          </p>
        </div>
        <Button type="button" variant="outline" onClick={fillDummyData}>
          Use Dummy Data
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Business Information */}
        <FormSection step={1} title="Business Information">
          <Field label="Business Name" error={errors.business_name?.message}>
            <Input placeholder="Enter business name" {...register('business_name', { required: 'Required' })} />
          </Field>
          <Field label="Industry" error={errors.industry?.message}>
            <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" {...register('industry', { required: 'Required' })}>
              <option value="">Select industry</option>
              {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </Field>
          <Field label="State" error={errors.state?.message}>
            <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" {...register('state', { required: 'Required' })}>
              <option value="">Select state</option>
              {STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Years in Business" error={errors.years_in_business?.message}>
            <Input type="number" step="0.5" min="0" placeholder="e.g. 3" {...register('years_in_business', { required: 'Required', min: 0 })} />
          </Field>
          <Field label="Annual Revenue ($)" error={errors.annual_revenue?.message}>
            <Input type="number" min="0" placeholder="e.g. 500000" {...register('annual_revenue', { required: 'Required', min: 0 })} />
          </Field>
        </FormSection>

        {/* Guarantor Information */}
        <FormSection step={2} title="Guarantor Information">
          <Field label="Guarantor Name" error={errors.guarantor_name?.message}>
            <Input placeholder="Enter guarantor name" {...register('guarantor_name', { required: 'Required' })} />
          </Field>
          <Field label="FICO Score" error={errors.fico_score?.message}>
            <Input type="number" min="300" max="850" placeholder="e.g. 720" {...register('fico_score', { required: 'Required', min: 300, max: 850 })} />
          </Field>
          <Field label="PayNet Score (optional)">
            <Input type="number" min="0" max="999" placeholder="e.g. 680" {...register('paynet_score')} />
          </Field>
          <div className="col-span-2 flex flex-wrap gap-6 pt-2">
            <Checkbox label="Homeowner" {...register('is_homeowner')} />
            <Checkbox label="US Citizen" {...register('is_us_citizen')} />
          </div>
        </FormSection>

        {/* Background */}
        <FormSection step={3} title="Credit Background">
          <Field label="Bankruptcies">
            <Input type="number" min="0" max="10" placeholder="0" {...register('bankruptcies')} />
          </Field>
          {Number(bankruptcies) > 0 && (
            <Field label="Years Since Discharge">
              <Input type="number" min="0" placeholder="e.g. 5" {...register('bankruptcy_discharge_years')} />
            </Field>
          )}
          <div className="col-span-2 flex flex-wrap gap-6 pt-2">
            <Checkbox label="Has Tax Liens" {...register('has_tax_liens')} />
            <Checkbox label="Has Judgments" {...register('has_judgments')} />
            <Checkbox label="Has Foreclosures" {...register('has_foreclosures')} />
          </div>
        </FormSection>

        {/* Loan Request */}
        <FormSection step={4} title="Loan Request">
          <Field label="Loan Amount ($)" error={errors.loan_amount?.message}>
            <Input type="number" min="1000" placeholder="e.g. 100000" {...register('loan_amount', { required: 'Required', min: 1000 })} />
          </Field>
          <Field label="Term (months)" error={errors.term_months?.message}>
            <Input type="number" min="12" max="84" placeholder="e.g. 48" {...register('term_months', { required: 'Required', min: 12, max: 84 })} />
          </Field>
          <Field label="Equipment Type" error={errors.equipment_type?.message}>
            <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" {...register('equipment_type', { required: 'Required' })}>
              <option value="">Select equipment type</option>
              {EQUIPMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Equipment Age (years)">
            <Input type="number" min="0" max="30" placeholder="0" {...register('equipment_age_years')} />
          </Field>
          <Field label="Equipment Description">
            <Input placeholder="e.g. 2024 Caterpillar Excavator" {...register('equipment_description')} />
          </Field>
          <Field label="Soft Cost %">
            <Input type="number" min="0" max="100" placeholder="0" {...register('soft_cost_percent')} />
          </Field>
        </FormSection>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4">
          <Button type="button" variant="ghost" onClick={() => navigate('/')}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Submit Application
          </Button>
        </div>
      </form>
    </div>
  )
}
