import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'

/** Governance → Audits (careflow-api src/quality-audits). */

export type AuditStatus = 'DUE' | 'IN_PROGRESS' | 'COMPLETED' | 'MISSED' | 'CANCELLED'
export type AuditTab = 'OVERDUE' | 'DUE' | 'IN_PROGRESS' | 'COMPLETED' | 'MISSED'
export type AuditState = 'UPCOMING' | 'DUE' | 'OVERDUE' | 'MISSED'
export type ComplianceLevel = 'COMPLIANT' | 'PARTIALLY_COMPLIANT' | 'NOT_COMPLIANT'
export type AuditFrequency = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'BIANNUAL' | 'ANNUAL'
export type AnswerValue = 'MET' | 'NOT_MET'
export type ActionStatus = 'OPEN' | 'DONE'

export type Ref = { id: string; name: string | null }
export type AreaRef = { code: string; name: string }

export type AuditArea = {
  code: string
  name: string
  description: string | null
  isSystem: boolean
  templateCount: number
}

export type AuditStandard = { id: string; text: string; hint?: string | null }
export type AuditSection = { title: string; standards: AuditStandard[] }

export type AuditTemplateSummary = {
  code: string
  title: string
  summary: string
  introduction: string | null
  area: AreaRef | null
  isCustom: boolean
  keyQuestionCode: string | null
  frequency: AuditFrequency
  earlyDays: number
  lateDays: number
  auditedItemLabel: string | null
  estimatedMinutes: number
  locationIds: string[]
  sectionCount: number
  standardCount: number
  activeSchedules: number
  cqcStatementCodes: string[]
}
export type AuditTemplateDetail = AuditTemplateSummary & {
  sections: AuditSection[]
  sources: { id: string; source: string; url: string }[]
  researchedOn: string | null
}

export type AuditRow = {
  id: string
  title: string
  status: AuditStatus
  state: AuditState | null
  template: { code: string; title: string; area: AreaRef | null }
  location: Ref | null
  scheduled: boolean
  dueDate: string | null
  daysToDue: number | null
  daysToClose: number | null
  auditDate: string | null
  auditor: Ref | null
  accountable: Ref | null
  auditedItem: { label: string; value: string | null } | null
  completedAt: string | null
  total: number
  answered: number
  percent: number | null
  level: ComplianceLevel | null
  previousPercent: number | null
  openActions: number
}

export type AuditCount = { total: number; answered: number; met: number; notMet: number; percent: number | null }
export type AuditResult = AuditCount & {
  celebrated: number
  sections: (AuditCount & { title: string })[]
  complete: boolean
  missingNotes: string[]
}

export type AuditAnswer = {
  answer: AnswerValue
  celebrate: boolean
  note: string | null
  answeredBy: Ref | null
  answeredAt: string
}

export type AuditAction = {
  id: string
  standardId: string | null
  standardNumber: number | null
  standardText: string | null
  title: string
  detail: string | null
  assignedEmployee: Ref | null
  dueAt: string | null
  urgent: boolean
  status: ActionStatus
  completedAt: string | null
  createdAt: string
}

export type AuditDetail = {
  id: string
  title: string
  status: AuditStatus
  template: {
    code: string
    title: string
    keyQuestionCode: string | null
    frequency: AuditFrequency
    introduction: string | null
    area: AreaRef | null
  }
  location: Ref | null
  scheduleId: string | null
  dueDate: string | null
  earlyDays: number | null
  lateDays: number | null
  timing: {
    opensOn: string
    dueDate: string
    closesOn: string
    state: AuditState
    daysToDue: number
    daysToClose: number
  } | null
  auditDate: string | null
  auditor: Ref | null
  accountable: Ref | null
  auditedItem: { label: string; value: string | null } | null
  summary: string | null
  createdBy: Ref | null
  startedAt: string | null
  completedAt: string | null
  missedAt: string | null
  cancelledAt: string | null
  result: AuditResult
  level: ComplianceLevel | null
  sections: {
    title: string
    standards: { id: string; number: number; text: string; hint: string | null; answer: AuditAnswer | null }[]
  }[]
  actions: AuditAction[]
}

export type AuditFilters = {
  locationId?: string
  areaCode?: string
  accountableUserId?: string
}
export type AuditListParams = AuditFilters & {
  tab?: AuditTab
  status?: AuditStatus
  level?: ComplianceLevel
  templateCode?: string
  q?: string
  page?: number
  limit?: number
}
export type AuditDashboard = {
  today: string
  currentMonth: string
  counts: { overdue: number; due: number; inProgress: number; completed: number; missed: number }
  timeline: { month: string; completed: number; missed: number; due: number }[]
}
export type AuditReports = {
  days: number
  since: string
  bands: { compliant: number; partially: number }
  levels: Record<ComplianceLevel, number>
  overallPercent: number | null
  due: { overdue: number; dueThisWeek: number; dueIn30Days: number }
  byMonth: { month: string; audits: number; percent: number }[]
}

export type AuditSchedule = {
  id: string
  template: { code: string; title: string; area: AreaRef | null }
  location: Ref | null
  frequency: AuditFrequency
  earlyDays: number
  lateDays: number
  firstDueDate: string
  accountable: Ref | null
  stoppedAt: string | null
  next: { auditId: string; dueDate: string | null; status: AuditStatus } | null
}

export type StartAuditInput = {
  templateCode: string
  locationId?: string
  auditedItemValue?: string
  title?: string
}
export type UpdateAuditInput = {
  title?: string
  summary?: string
  auditedItemValue?: string
  accountableUserId?: string | null
}
export type AnswerInput = { answer: AnswerValue | null; note?: string; celebrate?: boolean }
export type CreateActionInput = {
  title: string
  detail?: string
  standardId?: string
  assignedEmployeeId?: string
  dueAt?: string
  urgent?: boolean
}
export type UpdateActionInput = { status?: ActionStatus }
export type SaveTemplateInput = {
  areaCode: string
  title: string
  introduction?: string
  frequency: AuditFrequency
  earlyDays?: number
  lateDays?: number
  auditedItemLabel?: string
  locationIds?: string[]
  sections: { title: string; standards: { id?: string; text: string; hint?: string }[] }[]
}
export type CreateScheduleInput = {
  templateCode: string
  locationId?: string
  frequency?: AuditFrequency
  earlyDays?: number
  lateDays?: number
  firstDueDate: string
  accountableUserId?: string
}
export type UpdateScheduleInput = {
  frequency?: AuditFrequency
  earlyDays?: number
  lateDays?: number
  accountableUserId?: string | null
}

const BASE = '/quality-audits'

function qs(params: Record<string, unknown>): string {
  const s = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '' && v !== null) s.set(k, String(v))
  const out = s.toString()
  return out ? `?${out}` : ''
}

async function get<T>(path: string): Promise<T> {
  const res = await apiJson<ApiEnvelope<T>>(path, { method: 'GET' })
  return res.data
}

async function send<T>(path: string, method: 'POST' | 'PATCH' | 'PUT', body?: unknown): Promise<T> {
  const res = await apiJson<ApiEnvelope<T>>(path, {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  return res.data
}

export const fetchAuditDashboard = (f: AuditFilters) => get<AuditDashboard>(`${BASE}/dashboard${qs(f)}`)
export const fetchAuditReports = (f: AuditFilters & { days?: number }) =>
  get<AuditReports>(`${BASE}/reports${qs(f)}`)

export async function fetchAudits(params: AuditListParams) {
  const res = await apiJson<ApiEnvelope<AuditRow[]> & { meta?: { total?: number; page?: number; totalPages?: number } }>(
    `${BASE}${qs(params)}`,
    { method: 'GET' },
  )
  return {
    rows: res.data,
    total: res.meta?.total ?? res.data.length,
    page: res.meta?.page ?? 1,
    totalPages: res.meta?.totalPages ?? 1,
  }
}
export const fetchAudit = (id: string) => get<AuditDetail>(`${BASE}/${id}`)
export const startAudit = (body: StartAuditInput) => send<AuditDetail>(BASE, 'POST', body)
export const beginAudit = (id: string, auditedItemValue?: string) =>
  send<AuditDetail>(`${BASE}/${id}/begin`, 'POST', auditedItemValue ? { auditedItemValue } : {})
export const updateAudit = (id: string, body: UpdateAuditInput) => send<AuditDetail>(`${BASE}/${id}`, 'PATCH', body)
export const answerStandard = (id: string, standardId: string, body: AnswerInput) =>
  send<AuditDetail>(`${BASE}/${id}/answers/${encodeURIComponent(standardId)}`, 'PUT', body)
export const completeAudit = (id: string) => send<AuditDetail>(`${BASE}/${id}/complete`, 'POST')
export const cancelAudit = (id: string) => send<AuditDetail>(`${BASE}/${id}/cancel`, 'POST')
export const createAuditAction = (id: string, body: CreateActionInput) =>
  send<AuditDetail>(`${BASE}/${id}/actions`, 'POST', body)
export const updateAuditAction = (id: string, actionId: string, body: UpdateActionInput) =>
  send<AuditDetail>(`${BASE}/${id}/actions/${actionId}`, 'PATCH', body)

export const fetchAuditAreas = () => get<AuditArea[]>(`${BASE}/areas`)
export const createAuditArea = (body: { name: string; description?: string }) =>
  send<AuditArea>(`${BASE}/areas`, 'POST', body)
export const fetchAuditTemplates = (p: { areaCode?: string; kind?: 'library' | 'custom' } = {}) =>
  get<AuditTemplateSummary[]>(`${BASE}/templates${qs(p)}`)
export const fetchAuditTemplate = (code: string) => get<AuditTemplateDetail>(`${BASE}/templates/${code}`)
export const createAuditTemplate = (body: SaveTemplateInput) =>
  send<AuditTemplateDetail>(`${BASE}/templates`, 'POST', body)
export const updateAuditTemplate = (code: string, body: SaveTemplateInput) =>
  send<AuditTemplateDetail>(`${BASE}/templates/${code}`, 'PUT', body)
export const retireAuditTemplate = (code: string) => send<unknown>(`${BASE}/templates/${code}/retire`, 'POST')

export const fetchAuditSchedules = (p: { locationId?: string; templateCode?: string; includeStopped?: boolean } = {}) =>
  get<AuditSchedule[]>(`${BASE}/schedules${qs(p)}`)
export const createAuditSchedule = (body: CreateScheduleInput) =>
  send<AuditSchedule>(`${BASE}/schedules`, 'POST', body)
export const updateAuditSchedule = (id: string, body: UpdateScheduleInput) =>
  send<AuditSchedule>(`${BASE}/schedules/${id}`, 'PATCH', body)
export const stopAuditSchedule = (id: string) => send<AuditSchedule>(`${BASE}/schedules/${id}/stop`, 'POST')
