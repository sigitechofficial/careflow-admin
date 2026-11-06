import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'

/** API: careflow-api src/surveys/survey-actions.service.ts (Phase 2 part 6). */

export type ActionStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'
export type ActionSource = 'QUESTION' | 'THEME' | 'ALERT' | 'DISCUSSION' | 'GENERAL'
export type YswdChannel = 'PORTAL' | 'APP' | 'LETTER' | 'PUBLIC'

export const ACTION_STATUS_LABELS: Record<ActionStatus, string> = {
  OPEN: 'To do',
  IN_PROGRESS: 'Started',
  DONE: 'Done',
  CANCELLED: 'Cancelled',
}
export const CHANNEL_LABELS: Record<YswdChannel, string> = {
  PORTAL: 'Portal (people we support and families)',
  APP: 'Carer app (staff)',
  LETTER: 'Printable letter',
  PUBLIC: 'Public page (anyone with the link)',
}

export type SurveyActionItem = {
  id: string
  periodId: string | null
  source: ActionSource
  sourceLabel: string | null
  discussionId: string | null
  title: string
  detail: string | null
  ownerRoleId: string
  ownerRole: string | null
  ownerUserId: string | null
  ownerName: string | null
  dueOn: string
  overdue: boolean
  status: ActionStatus
  outcome: string | null
  youSaid: string | null
  weDid: string | null
  evidenceNote: string | null
  completedOn: string | null
}

export type SurveyDiscussionItem = {
  id: string
  periodId: string | null
  heldOn: string
  kind: string
  kindLabel: string
  attendees: number | null
  summary: string
  agreed: string | null
}

export type YswdItem = { youSaid: string; weDid: string; actionId?: string | null }
export type YouSaidWeDid = {
  id: string
  periodId: string | null
  title: string
  intro: string | null
  items: YswdItem[]
  headline: { percent: number; base: number; label: string } | null
  channels: YswdChannel[]
  status: 'DRAFT' | 'PUBLISHED' | 'WITHDRAWN'
  publicToken: string | null
  publishedOn: string | null
}

export type ActingOnResults = {
  surveyId: string
  title: string
  canManage: boolean
  responsesAccess: boolean
  periods: Array<{ id: string; label: string; shown: boolean }>
  questions: Array<{ key: string; questionText: string; figure: string; percent: number | null }>
  actions: SurveyActionItem[]
  discussions: SurveyDiscussionItem[]
  youSaidWeDid: YouSaidWeDid[]
  roles: Array<{ id: string; name: string }>
  themes: Array<{ code: string; label: string; count: number | null }>
  discussionKinds: Array<{ code: string; label: string }>
}

export type PublicUpdate = { id: string; title: string; intro: string | null; items: Array<{ youSaid: string; weDid: string }>; headline: { percent: number; base: number; label: string } | null; publishedOn: string | null }
export type Organisation = { name: string; logoUrl: string | null; phone: string | null; email: string | null } | null

export type SurveyPack = {
  organisation: Organisation
  survey: { id: string; title: string; targetKind: string; isAnonymous: boolean; libraryReference: string | null }
  period: { id: string; title: string; opensAt: string | null; closesAt: string | null } | null
  generatedOn: string
  threshold: number
  participation: { sentTo: number | null; answered: number; responseRate: number | null; inFigures: number | null }
  figuresShown: boolean
  figuresNote: string | null
  headline: { questionText: string; percent: number | null; base: number } | null
  questions: Array<{ questionText: string; figure: string }>
  trends: { units: Array<{ id: string; label: string; shown: boolean; hiddenNote: string | null }>; questions: Array<{ key: string; questionText: string; points: Array<{ unitId: string; point: { kind: string; percent?: number | null; average?: number | null } | null }> }> } | null
  themes: Array<{ code: string; label: string; count: number | null }>
  scores: Array<{ key: string; label: string; average: number | null; band: string | null; method: string }>
  actions: Array<{ title: string; source: string | null; ownerRole: string | null; dueOn: string; status: ActionStatus; outcome: string | null; completedOn: string | null }>
  discussions: Array<{ heldOn: string; kind: string; attendees: number | null; agreed: string | null }>
  youSaidWeDid: Array<{ title: string; items: Array<{ youSaid: string; weDid: string }>; publishedOn: string | null }>
  cqcStatements: Array<{ code: string; title: string }>
  /** Repeating surveys: which period the themes come from. */
  themesPeriod?: { id: string; label: string } | null
  /** Periods the pack can be made for. */
  periods?: Array<{ id: string; label: string }>
}

const key = (surveyId: string) => ['surveys', 'acting', surveyId] as const
const get = async <T,>(url: string) => (await apiJson<ApiEnvelope<T>>(url, { method: 'GET' })).data

export function useActingOnResults(surveyId: string) {
  return useQuery({ queryKey: key(surveyId), queryFn: () => get<ActingOnResults>(`/surveys/${surveyId}/actions`) })
}

function useInvalidating<I>(surveyId: string, fn: (input: I) => Promise<unknown>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: key(surveyId) })
      void qc.invalidateQueries({ queryKey: ['surveys', 'insight'] })
    },
  })
}

export type NewAction = {
  source: ActionSource
  sourceKey?: string | null
  discussionId?: string | null
  periodId?: string | null
  title: string
  detail?: string | null
  ownerRoleId: string
  dueOn: string
  youSaid?: string | null
  weDid?: string | null
}
export const useCreateAction = (surveyId: string) =>
  useInvalidating(surveyId, (input: NewAction) => apiJson(`/surveys/${surveyId}/actions`, { method: 'POST', body: JSON.stringify(input) }))

export const useUpdateAction = (surveyId: string) =>
  useInvalidating(surveyId, ({ id, ...input }: { id: string } & Partial<NewAction> & { status?: ActionStatus; outcome?: string | null; evidenceNote?: string | null }) =>
    apiJson(`/survey-actions/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  )

export const useCreateDiscussion = (surveyId: string) =>
  useInvalidating(surveyId, (input: { heldOn: string; kind: string; attendees?: number | null; summary: string; agreed?: string | null; periodId?: string | null }) =>
    apiJson(`/surveys/${surveyId}/discussions`, { method: 'POST', body: JSON.stringify(input) }),
  )

export const useDeleteDiscussion = (surveyId: string) =>
  useInvalidating(surveyId, (id: string) => apiJson(`/survey-actions/discussions/${id}`, { method: 'DELETE' }))

export const useSaveUpdate = (surveyId: string) =>
  useInvalidating(surveyId, ({ id, ...input }: { id?: string; title: string; intro?: string | null; items: YswdItem[]; channels: YswdChannel[]; periodId?: string | null }) =>
    apiJson(id ? `/surveys/${surveyId}/you-said-we-did/${id}` : `/surveys/${surveyId}/you-said-we-did`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(input) }),
  )

export const usePublishUpdate = (surveyId: string) =>
  useInvalidating(surveyId, ({ id, publish }: { id: string; publish: boolean }) =>
    apiJson(`/surveys/${surveyId}/you-said-we-did/${id}/${publish ? 'publish' : 'withdraw'}`, { method: 'POST' }),
  )

export function useSurveyPack(surveyId: string, periodId?: string) {
  return useQuery({
    queryKey: ['surveys', 'pack', surveyId, periodId ?? null],
    // Each opening is fetched (and so audited) afresh; not refetched on focus while it is open.
    gcTime: 0,
    refetchOnWindowFocus: false,
    queryFn: () => get<SurveyPack>(`/surveys/${surveyId}/pack${periodId ? `?periodId=${periodId}` : ''}`),
  })
}

export function useUpdateLetter(surveyId: string, updateId: string) {
  return useQuery({
    queryKey: ['surveys', 'letter', surveyId, updateId],
    queryFn: () => get<{ organisation: Organisation; update: PublicUpdate; audience: string }>(`/surveys/${surveyId}/you-said-we-did/${updateId}/letter`),
  })
}

export function usePublicUpdate(token: string) {
  return useQuery({ queryKey: ['you-said-we-did', token], retry: false, queryFn: () => get<{ organisation: Organisation; update: PublicUpdate }>(`/you-said-we-did/${token}`) })
}

export function usePortalUpdates(enabled = true) {
  return useQuery({ queryKey: ['portal', 'you-said-we-did'], enabled, queryFn: () => get<{ organisation: Organisation; updates: PublicUpdate[] }>('/portal/you-said-we-did') })
}

/** "1 Dec 2026" from YYYY-MM-DD. */
export function formatDay(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}
