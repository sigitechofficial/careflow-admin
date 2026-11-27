import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import type { CqcRating, KeyQuestionChange, StatementChange } from '@/features/cqc-mock-inspection/types'

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

/** A mock inspection used in the dashboard's comparison. */
export type ComparedInspection = { id: string; title: string; completedAt: string | null }

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
    /**
     * The average change since the last inspection: for each branch, each key question's and
     * statement's latest score against the one before it, averaged across the branches (null when no
     * branch has two inspections to compare).
     */
    comparison: {
      /** Branch names ("Whole organisation" for whole-organisation inspections). */
      branches: string[]
      /** The average of the key questions, in percent, and the rating band it falls in. */
      overall: {
        from: CqcRating | null
        to: CqcRating | null
        fromPercent: number | null
        toPercent: number | null
        change: number | null
      }
      keyQuestions: (KeyQuestionChange & { branchCount: number })[]
      /** Average statement scores (1–4, one decimal place). */
      improved: StatementChange[]
      declined: StatementChange[]
      unchangedCount: number
      /** Each branch on its own (id null = the whole organisation), by name. */
      byBranch: {
        id: string | null
        name: string
        overall: {
          from: CqcRating | null
          to: CqcRating | null
          fromPercent: number | null
          toPercent: number | null
          change: number | null
        }
        keyQuestions: (KeyQuestionChange & { branchCount: number })[]
        improved: StatementChange[]
        declined: StatementChange[]
        unchangedCount: number
        /**
         * The inspections compared, newest first: usually one pair, more when a focused inspection
         * covered only some key questions (the others compare the inspections before it).
         */
        compared: { to: ComparedInspection; from: ComparedInspection }[]
      }[]
    } | null
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
