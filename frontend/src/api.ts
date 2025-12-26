import axios from 'axios'

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
// Strip /api suffix for static files
export const STATIC_BASE = API_BASE.replace(/\/api$/, '')

const api = axios.create({
  baseURL: API_BASE,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Types
export interface User {
  id: number
  email: string
  name: string
  role: string
}

export interface Program {
  id: number
  name: string
  description: string | null
  pdf_path: string | null
  text_preview?: string
  // Credit
  min_fico: number | null
  max_fico: number | null
  min_fico_no_paynet: number | null
  min_paynet: number | null
  // Business
  min_years_in_business: number | null
  min_years_no_paynet: number | null
  min_revenue: number | null
  // Loan
  min_loan_amount: number | null
  max_loan_amount: number | null
  min_term_months: number | null
  max_term_months: number | null
  // Background
  max_bankruptcies: number
  min_bankruptcy_years: number | null
  allow_tax_liens: boolean
  allow_judgments: boolean
  allow_foreclosures: boolean
  // Requirements
  require_homeownership: boolean
  require_us_citizen: boolean
  // Equipment
  max_equipment_age_years: number | null
  max_soft_cost_percent: number | null
  // Restrictions
  restricted_states: string[]
  restricted_industries: string[]
  allowed_equipment_types: string[]
  excluded_equipment_types: string[]
  industry_loan_limits: Record<string, number>
  priority: number
  active: boolean
}

export interface Application {
  id: number
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
  equipment_description: string | null
  soft_cost_percent: number
  status: string
  created_at: string
}

export interface MatchResult {
  id: number
  program_id: number
  program_name: string
  is_eligible: boolean
  fit_score: number
  criteria_results: Record<string, { passed: boolean; reason: string }>
  rejection_reasons: string[]
}

// API calls - Programs
export const fetchPrograms = () => 
  api.get<Program[]>('/programs').then(r => r.data)

export const fetchProgram = (id: number) => 
  api.get<Program>(`/programs/${id}`).then(r => r.data)

export const createProgram = (data: Partial<Program>) =>
  api.post<Program>('/programs', data).then(r => r.data)

export const updateProgram = (id: number, data: Partial<Program>) =>
  api.put<Program>(`/programs/${id}`, data).then(r => r.data)

export const deleteProgram = (id: number) =>
  api.delete(`/programs/${id}`).then(r => r.data)

export const reparseProgram = (id: number) =>
  api.post(`/programs/${id}/reparse`).then(r => r.data)

export interface PdfUploadResponse {
  status: string
  message: string
  pdf_path: string
  program_id: number
}

export const uploadProgramPdf = (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post<PdfUploadResponse>('/programs/upload-pdf', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data)
}

// API calls - Applications
export const fetchApplications = () => api.get<Application[]>('/applications').then(r => r.data)
export const fetchAdminApplications = () => api.get<Application[]>('/admin/applications').then(r => r.data)
export const fetchApplication = (id: number) => api.get<Application>(`/applications/${id}`).then(r => r.data)
export const fetchMatchResults = (appId: number) => api.get<MatchResult[]>(`/applications/${appId}/results`).then(r => r.data)

export const createApplication = (data: Omit<Application, 'id' | 'status' | 'created_at'>) =>
  api.post<Application>('/applications', data).then(r => r.data)

export const runMatching = (appId: number) =>
  api.post<MatchResult[]>(`/applications/${appId}/match`).then(r => r.data)

// Seed
export const seedData = () => api.post('/seed').then(r => r.data)

export default api
