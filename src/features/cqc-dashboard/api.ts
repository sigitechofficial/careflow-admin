import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'

/** Governance → CQC dashboard and reports (careflow-api src/cqc-dashboard). */

export type CqcRating = 'OUTSTANDING' | 'GOOD' | 'REQUIRES_IMPROVEMENT' | 'INADEQUATE'
export type KeyQuestionRating = { code: string; rating: CqcRating | null; percent: number | null }
export type MockSummary = {
  id: string
  title: string
  completedAt: string
  overall: CqcRating | null
  keyQuestions: KeyQuestionRating[]
}
export type AttentionKind =
  | 'EVIDENCE_GAPS'
  | 'EVIDENCE_REVIEW_OVERDUE'
  | 'ACTIONS_OVERDUE'
  | 'NOTIFICATIONS_OVERDUE'
  | 'NO_RECENT_MOCK'

export type CqcDashboard = {
  generatedAt: string
  evidence: {
    totals: {
      statements: number
      covered: number
      gaps: number
      currentEvidence: number
      reviewOverdue: number
      addedLast30Days: number
    }
    keyQuestions: { code: string; title: string; statementCount: number; coveredCount: number; gapCount: number }[]
  } | null
  mock: {
    /** The newest completed inspection with an overall rating (focused ones have none). */
    latest: MockSummary | null
    previous: MockSummary | null
    /** When the newest mock inspection of any kind was completed. */
    lastCompletedAt: string | null
    /** Each key question's rating from the newest inspection that rated it. */
    keyQuestions: {
      code: string
      rating: CqcRating
      percent: number | null
      inspectionId: string
      inspectionTitle: string
      completedAt: string
    }[]
    inProgress: number
    /** Mock inspections by status (cancelled ones included in the total). */
    counts: { total: number; completed: number; inProgress: number; cancelled: number }
    actions: {
      open: number
      overdue: number
      dueThisWeek: number
      doneLast30Days: number
      next: {
        id: string
        title: string
        statementTitle: string | null
        dueAt: string | null
        overdue: boolean
        inspectionId: string
      }[]
    }
  } | null
  notifications: {
    byStatus: Partial<Record<string, number>>
    open: number
    overdue: number
    next: { id: string; referenceNumber: string; type: string; status: string; dueAt: string; overdue: boolean }[]
  } | null
  attention: { kind: AttentionKind; count: number; message: string }[]
}

export type CqcReports = {
  months: string[]
  from: string
  evidence: {
    byMonth: { month: string; added: number }[]
    bySource: { key: string; count: number }[]
    byCategory: { key: string; count: number }[]
  } | null
  mock: {
    inspections: (MockSummary & { branch: string | null })[]
    actionsByMonth: { month: string; raised: number; done: number; doneLate: number }[]
    /** Mock inspections started or completed in the period, plus any still in progress. */
    statusCounts: { completed: number; inProgress: number; cancelled: number }
  } | null
  notifications: {
    byMonth: { month: string; count: number }[]
    byType: { type: string; count: number }[]
    submitted: number
    submittedOnTime: number
  } | null
}

function qs(params: Record<string, unknown>) {
  const s = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') s.set(k, String(v))
  const out = s.toString()
  return out ? `?${out}` : ''
}

export async function fetchCqcDashboard(p: { locationId?: string }) {
  const res = await apiJson<ApiEnvelope<CqcDashboard>>(`/cqc-dashboard${qs(p)}`, { method: 'GET' })
  return res.data
}

export async function fetchCqcReports(p: { locationId?: string; months?: number }) {
  const res = await apiJson<ApiEnvelope<CqcReports>>(`/cqc-dashboard/reports${qs(p)}`, { method: 'GET' })
  return res.data
}
