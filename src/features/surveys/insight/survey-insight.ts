import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'

/** API: careflow-api src/surveys/survey-insight.service.ts (Phase 2 part 5). */

export type QuestionPoint =
  | { kind: 'TOP_TWO' | 'YES'; percent: number | null; positive: number; base: number }
  | { kind: 'AVERAGE'; average: number | null; count: number }

export type InsightUnit = {
  id: string
  title: string
  label: string
  periodKey: string | null
  opensAt: string | null
  closesAt: string | null
  status: string
  year: number | null
  shown: boolean
  hiddenNote: string | null
  responses: number | null
}

export type InsightLine = {
  key: string
  questionText: string
  questionType: string
  sectionTitle: string | null
  points: Array<{ unitId: string; point: QuestionPoint | null }>
  years: Array<{ year: number; point: QuestionPoint | null }>
  pooled: QuestionPoint | null
}

export type SurveyTrends = {
  surveyId: string
  title: string
  isAnonymous: boolean
  threshold: number
  units: InsightUnit[]
  questions: InsightLine[]
  responsesInFigures: number
  note: string | null
  pool: { templateId?: string; libraryReference?: string } | null
}

export type PooledResults = {
  by: { templateId?: string; libraryReference?: string }
  copies: Array<{ id: string; title: string }>
  threshold: number
  units: InsightUnit[]
  questions: InsightLine[]
  responsesInFigures: number | null
  note: string
}

export type PoolOption = { templateId: string | null; libraryReference: string | null; copies: number; title: string }

export type SurveyHeatmap = {
  surveyId: string
  title: string
  minimum: number
  columns: Array<{ key: string; label: string; responses: number }>
  rows: Array<{
    key: string
    questionText: string
    kind: 'TOP_TWO' | 'YES'
    overall: { percent: number | null; base: number }
    cells: Array<{ key: string; percent: number | null; base: number | null }>
  }>
  note: string | null
  unitsLeftOut?: number
}

export type ThemeCount = { code: string; label: string; count: number | null }
export type SurveyThemes = {
  surveyId: string
  minimum: number
  writtenAnswers: number | null
  themes: ThemeCount[]
  questions: Array<{ questionText: string; writtenAnswers: number; themes: ThemeCount[] }>
  note: string
}

export type QualityFlag = 'FAST' | 'STRAIGHT_LINE' | 'DUPLICATE'
export type SurveyQuality = {
  surveyId: string
  responses: number | null
  flagged: number | null
  flags: Array<{ flag: QualityFlag; label: string; count: number }>
  note: string
}
export type ResponseFlags = Array<{ responseId: string; flags: Array<{ flag: QualityFlag; label: string }> }>

export type ScoreMethod = 'MEAN' | 'PERCENT_OF_MAX'
export type ScoreScale = {
  key: string
  label: string
  questionKeys: string[]
  reversed: string[]
  method: ScoreMethod
  bands: Array<{ from: number; label: string }>
}
export type ScaleResult = {
  key: string
  label: string
  method: ScoreMethod
  people: number
  average: number | null
  band: string | null
  bands: Array<{ label: string; people: number }> | null
}
export type SurveyScores = {
  surveyId: string
  scoring: { scales: ScoreScale[] } | null
  scales: ScaleResult[]
  units: Array<{ id: string; label: string; scales: ScaleResult[] }>
  note: string | null
}

export type DashboardView = 'REGISTERED_MANAGER' | 'BRANCH_MANAGER' | 'NOMINATED_INDIVIDUAL'
export const DASHBOARD_VIEW_LABELS: Record<DashboardView, string> = {
  REGISTERED_MANAGER: 'Registered manager',
  BRANCH_MANAGER: 'Branch manager',
  NOMINATED_INDIVIDUAL: 'Nominated individual',
}
export type SurveysDashboard = {
  view: DashboardView
  locationId: string | null
  openSurveys: Array<{
    id: string
    title: string
    targetKind: string
    isAnonymous: boolean
    closesAt: string | null
    sentTo: number | null
    responseRate: number | null
    countsRestricted: boolean
  }>
  alerts: { open: number; overdue: number; urgent: number }
  work: { eventsWaiting: number | null; heldBack: number | null; callLists: number | null } | null
  trends: Array<{ surveyId: string; title: string; points: Array<{ label: string; percent: number | null; base: number | null }> }>
  totals: { surveys: number; open: number; closedThisYear: number }
  actions?: { open: number; overdue: number; done: number } | null
}

export type Report360 = {
  year: number
  keyQuestions: Array<{ code: string; label: string }>
  audiences: Array<{
    code: string
    label: string
    candidates: Array<{ id: string; title: string }>
    survey: { id: string; title: string } | null
    unit: { id: string; title: string; status: string } | null
    responses: number | null
    hiddenNote: string | null
    headline: { percent: number | null; base: number } | null
    keyQuestions: Array<{ code: string; label: string; percent: number | null; answers: number; questions: number }>
  }>
  note: string
}

const get = async <T,>(url: string) => (await apiJson<ApiEnvelope<T>>(url, { method: 'GET' })).data

export const insightKey = (surveyId: string, part: string) => ['surveys', 'insight', surveyId, part] as const

export function useSurveyTrends(surveyId: string, enabled = true) {
  return useQuery({ queryKey: insightKey(surveyId, 'trends'), enabled, queryFn: () => get<SurveyTrends>(`/surveys/${surveyId}/trends`) })
}
export function useSurveyHeatmap(surveyId: string, enabled = true) {
  return useQuery({ queryKey: insightKey(surveyId, 'heatmap'), enabled, queryFn: () => get<SurveyHeatmap>(`/surveys/${surveyId}/heatmap`) })
}
export function useSurveyThemes(surveyId: string, enabled = true) {
  return useQuery({ queryKey: insightKey(surveyId, 'themes'), enabled, queryFn: () => get<SurveyThemes>(`/surveys/${surveyId}/themes`) })
}
export function useSurveyQuality(surveyId: string, enabled = true) {
  return useQuery({ queryKey: insightKey(surveyId, 'quality'), enabled, queryFn: () => get<SurveyQuality>(`/surveys/${surveyId}/quality`) })
}
export function useResponseFlags(surveyId: string, enabled = true) {
  return useQuery({ queryKey: insightKey(surveyId, 'response-flags'), enabled, queryFn: () => get<ResponseFlags>(`/surveys/${surveyId}/quality/responses`) })
}
export function useSurveyScores(surveyId: string, enabled = true) {
  return useQuery({ queryKey: insightKey(surveyId, 'scores'), enabled, queryFn: () => get<SurveyScores>(`/surveys/${surveyId}/scores`) })
}
export function useSaveScoring(surveyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (scoring: { scales: Array<Omit<ScoreScale, 'key'> & { key?: string }> } | null) =>
      apiJson(`/surveys/${surveyId}/scoring`, { method: 'PUT', body: JSON.stringify({ scoring }) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['surveys', 'insight', surveyId] })
      void qc.invalidateQueries({ queryKey: ['surveys', 'detail', surveyId] })
    },
  })
}
export function useSurveysDashboard(view: DashboardView | null, locationId?: string) {
  return useQuery({
    queryKey: ['surveys', 'insight', 'dashboard', view, locationId ?? null],
    queryFn: () => {
      const q = new URLSearchParams()
      if (view) q.set('view', view)
      if (locationId) q.set('locationId', locationId)
      return get<SurveysDashboard>(`/survey-insight/dashboard${q.size ? `?${q}` : ''}`)
    },
  })
}
export function usePoolOptions() {
  return useQuery({ queryKey: ['surveys', 'insight', 'pools'], queryFn: () => get<PoolOption[]>('/survey-insight/pools') })
}
export function usePooledResults(by: { templateId?: string; libraryReference?: string }) {
  const q = new URLSearchParams(by.templateId ? { templateId: by.templateId } : by.libraryReference ? { libraryReference: by.libraryReference } : {})
  return useQuery({
    queryKey: ['surveys', 'insight', 'pool', by.templateId ?? null, by.libraryReference ?? null],
    enabled: Boolean(by.templateId || by.libraryReference),
    queryFn: () => get<PooledResults>(`/survey-insight/pool?${q}`),
  })
}
export function useReport360(year: number, chosen: Record<string, string | undefined> = {}) {
  const q = new URLSearchParams({ year: String(year) })
  for (const [k, v] of Object.entries(chosen)) if (v) q.set(k, v)
  return useQuery({ queryKey: ['surveys', 'insight', '360', year, chosen], queryFn: () => get<Report360>(`/survey-insight/360?${q}`) })
}

/** "80%", "4.2" or "—" for a point. */
export function formatPoint(p: QuestionPoint | null | undefined): string {
  if (!p) return '—'
  if (p.kind === 'AVERAGE') return p.average === null ? '—' : String(p.average)
  return p.percent === null ? '—' : `${p.percent}%`
}

/** What a point means, for screen readers and titles. */
export function describePoint(p: QuestionPoint | null | undefined): string {
  if (!p) return 'Not shown'
  if (p.kind === 'AVERAGE') return p.average === null ? 'No answers' : `Average ${p.average} from ${p.count} answers`
  if (p.percent === null) return 'No answers'
  return p.kind === 'YES' ? `${p.percent}% said Yes (${p.positive} of ${p.base})` : `${p.percent}% gave one of the top two answers (${p.positive} of ${p.base})`
}

/** Heatmap colour band for a percentage (text always shows the figure, colour is a help only). */
export function heatClass(percent: number | null): string {
  if (percent === null) return 'bg-muted/40 text-muted-foreground'
  if (percent >= 80) return 'bg-emerald-500/25 text-foreground'
  if (percent >= 60) return 'bg-emerald-500/10 text-foreground'
  if (percent >= 40) return 'bg-amber-500/20 text-foreground'
  return 'bg-rose-500/25 text-foreground'
}
