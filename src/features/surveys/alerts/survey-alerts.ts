/**
 * Survey alert rules and the follow-up list: types, API calls and hooks.
 * API: careflow-api src/surveys/survey-alerts.service.ts.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'

export type AlertOwnerKey =
  | 'REGISTERED_MANAGER'
  | 'DEPUTY_MANAGER'
  | 'NOMINATED_INDIVIDUAL'
  | 'CARE_COORDINATOR'
  | 'FIELD_CARE_SUPERVISOR'
  | 'SAFEGUARDING_LEAD'
  | 'HR_MANAGER'
  | 'TRAINING_LEAD'
  | 'MEDICINES_LEAD'

export type AlertRecordKind = 'COMPLAINT' | 'COMPLIMENT' | 'SAFEGUARDING' | 'INCIDENT'
export type AlertOutcomeKind = 'CONTACTED' | 'NOT_REACHED' | 'NO_LONGER_NEEDED' | 'ACTIONED'
export type IdName = { id: string; name: string }
export type RoleWithHolders = IdName & { holders: number }

/** `not`: answered, but none of these chosen (a checklist gap). */
export type AlertCondition = { questionKey: string; answers: string[]; not?: boolean; questionText?: string | null }

export type SurveyAlertRule = {
  id: string
  key: string
  title: string
  whenText: string
  actionText: string
  /** any = one of the conditions; all = every one; mixed = a ready-made combination edited as a whole. */
  match: 'any' | 'all' | 'mixed'
  conditions: AlertCondition[]
  /** Answers given without a name: raise only if at least this many answered. */
  minimumAnswers: number | null
  ownerKey: AlertOwnerKey | null
  ownerLabel: string | null
  roleId: string | null
  role: RoleWithHolders | null
  dueWorkingDays: number
  /** Calendar days instead ("within 7 days"); wins over dueWorkingDays. */
  dueCalendarDays: number | null
  urgent: boolean
  recordKind: AlertRecordKind | null
  contactRequest: boolean
  isActive: boolean
  fromLibrary: boolean
  problems: string[]
}

export type SurveyAlertRulesPayload = {
  surveyId: string
  editedOnSurveyId: string | null
  isAnonymous: boolean
  offersAnswerWithoutName: boolean
  fromLibrary: boolean
  anonymityNote: string | null
  rules: SurveyAlertRule[]
  questions: Array<{ key: string; questionText: string; answers: string[]; contactRequest: boolean }>
  owners: Array<{ key: AlertOwnerKey; label: string; role: RoleWithHolders | null; chosen: boolean }>
  roles: IdName[]
  manualChecks: Array<{ when: string; action: string }>
  /** Library roles this survey rates: its alerts go to the next role up instead. */
  neverRouteTo: AlertOwnerKey[]
}

export type SaveAlertRuleInput = {
  title: string
  whenText?: string
  actionText: string
  conditions: Array<{ questionKey: string; answers: string[]; not?: boolean }>
  match: 'any' | 'all'
  keepConditions?: boolean
  minimumAnswers: number | null
  ownerKey: AlertOwnerKey | null
  roleId: string | null
  /** Give one: working days or calendar days. */
  dueWorkingDays?: number
  dueCalendarDays?: number
  urgent: boolean
  recordKind: AlertRecordKind | null
  contactRequest: boolean
  isActive: boolean
}

export type FollowUpView = 'open' | 'overdue' | 'contact' | 'done' | 'all'
export type FollowUpStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED' | 'NO_ROLE'

export type SurveyFollowUp = {
  id: string
  survey: { id: string; title: string; periodKey: string | null; recurringSurveyId: string | null }
  title: string
  details: string
  unlinked: boolean
  matchCount: number
  contactRequest: boolean
  urgent: boolean
  person: { kind: 'SERVICE_USER' | 'EMPLOYEE'; id: string; name: string | null } | null
  responseId: string | null
  role: IdName | null
  status: FollowUpStatus
  dueDate: string
  dueState: 'overdue' | 'today' | 'upcoming' | null
  owner: { id: string; name: string | null } | null
  outcomeKind: AlertOutcomeKind | null
  outcome: string | null
  recordKind: AlertRecordKind | null
  linkedRecord: { type: AlertRecordKind; id: string; reference: string | null } | null
  taskNote: string | null
  /** The answers behind it are limited to particular people (title and details are generic). */
  detailsRestricted?: boolean
  completedAt: string | null
  completedByName: string | null
  raisedOn: string
  canAct: boolean
}

export type SurveyFollowUpsPayload = {
  today: string
  counts: { open: number; overdue: number; contact: number }
  items: SurveyFollowUp[]
}

export type UpdateFollowUpInput = {
  status?: 'OPEN' | 'IN_PROGRESS' | 'DONE'
  ownerUserId?: string | null
  roleId?: string
  outcomeKind?: AlertOutcomeKind | null
  outcome?: string | null
  linkedReference?: string | null
}

export const OWNER_LABELS: Record<AlertOwnerKey, string> = {
  REGISTERED_MANAGER: 'Registered Manager',
  DEPUTY_MANAGER: 'Deputy Manager',
  NOMINATED_INDIVIDUAL: 'Nominated Individual',
  CARE_COORDINATOR: 'Care Coordinator',
  FIELD_CARE_SUPERVISOR: 'Field Care Supervisor',
  SAFEGUARDING_LEAD: 'Safeguarding lead',
  HR_MANAGER: 'HR manager',
  TRAINING_LEAD: 'Training lead',
  MEDICINES_LEAD: 'Medicines lead',
}

export const RECORD_LABELS: Record<AlertRecordKind, string> = {
  COMPLAINT: 'Complaint',
  COMPLIMENT: 'Compliment',
  SAFEGUARDING: 'Safeguarding concern',
  INCIDENT: 'Incident',
}

/** Where each record is started (the existing pages). */
export const RECORD_PAGES: Record<AlertRecordKind, string> = {
  COMPLAINT: '/incidents/feedback',
  COMPLIMENT: '/incidents/feedback',
  SAFEGUARDING: '/safeguarding',
  INCIDENT: '/incidents/raise',
}

export const OUTCOME_LABELS: Record<AlertOutcomeKind, string> = {
  CONTACTED: 'Contacted',
  NOT_REACHED: 'Could not reach them',
  NO_LONGER_NEEDED: 'No longer needed',
  ACTIONED: 'Action taken',
}

/** "Within 7 days" (calendar days) or the working-day wording. */
export function ruleTimescaleLabel(rule: { dueWorkingDays: number; dueCalendarDays: number | null }): string {
  if (rule.dueCalendarDays != null) return rule.dueCalendarDays === 1 ? 'Within 1 day' : `Within ${rule.dueCalendarDays} days`
  return timescaleLabel(rule.dueWorkingDays)
}

/** "the same working day" / "within 3 working days". */
export function timescaleLabel(days: number): string {
  if (days <= 0) return 'The same working day'
  if (days === 1) return 'By the end of the next working day'
  return `Within ${days} working days`
}

export const alertKeys = {
  all: () => ['surveys', 'alerts'] as const,
  rules: (surveyId: string) => [...alertKeys.all(), 'rules', surveyId] as const,
  followUps: (view: FollowUpView, surveyId?: string, alertId?: string) =>
    [...alertKeys.all(), 'follow-ups', view, surveyId ?? '', alertId ?? ''] as const,
  owners: (alertId: string) => [...alertKeys.all(), 'owners', alertId] as const,
}

const qs = (p: Record<string, string | undefined>) => {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(p)) if (v) sp.set(k, v)
  const s = sp.toString()
  return s ? `?${s}` : ''
}

export async function fetchAlertRules(surveyId: string): Promise<SurveyAlertRulesPayload> {
  const res = await apiJson<ApiEnvelope<SurveyAlertRulesPayload>>(`/surveys/${surveyId}/alert-rules`, { method: 'GET' })
  return res.data as SurveyAlertRulesPayload
}

export async function fetchFollowUps(view: FollowUpView, surveyId?: string, alertId?: string): Promise<SurveyFollowUpsPayload> {
  const res = await apiJson<ApiEnvelope<SurveyFollowUpsPayload>>(`/survey-follow-ups${qs({ view, surveyId, alertId })}`, {
    method: 'GET',
  })
  return res.data as SurveyFollowUpsPayload
}

export function useAlertRules(surveyId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: alertKeys.rules(surveyId ?? ''),
    queryFn: () => fetchAlertRules(surveyId!),
    enabled: Boolean(surveyId) && enabled,
  })
}

export function useSaveAlertRule(surveyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: SaveAlertRuleInput }) =>
      apiJson<ApiEnvelope<{ id: string }>>(`/surveys/${surveyId}/alert-rules${id ? `/${id}` : ''}`, {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: alertKeys.rules(surveyId) }),
  })
}

export function useDeleteAlertRule(surveyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => apiJson(`/surveys/${surveyId}/alert-rules/${id}`, { method: 'DELETE' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: alertKeys.rules(surveyId) }),
  })
}

export function useRestoreLibraryRules(surveyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => apiJson(`/surveys/${surveyId}/alert-rules/restore-library`, { method: 'POST' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: alertKeys.rules(surveyId) }),
  })
}

export function useSetNeverRouteTo(surveyId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (ownerKeys: AlertOwnerKey[]) =>
      apiJson(`/surveys/${surveyId}/alert-rules/never-route-to`, { method: 'PUT', body: JSON.stringify({ ownerKeys }) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: alertKeys.rules(surveyId) }),
  })
}

export function useSetOwnerRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ ownerKey, roleId }: { ownerKey: AlertOwnerKey; roleId: string | null }) =>
      apiJson(`/survey-alert-roles/${ownerKey}`, { method: 'PUT', body: JSON.stringify({ roleId }) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: alertKeys.all() }),
  })
}

export function useFollowUps(view: FollowUpView, surveyId?: string, alertId?: string) {
  return useQuery({
    queryKey: alertKeys.followUps(view, surveyId, alertId),
    queryFn: () => fetchFollowUps(view, surveyId, alertId),
  })
}

export function useFollowUpOwners(alertId: string | undefined) {
  return useQuery({
    queryKey: alertKeys.owners(alertId ?? ''),
    queryFn: async () => {
      const res = await apiJson<ApiEnvelope<IdName[]>>(`/survey-follow-ups/${alertId}/owners`, { method: 'GET' })
      return res.data ?? []
    },
    enabled: Boolean(alertId),
  })
}

export function useUpdateFollowUp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateFollowUpInput }) =>
      apiJson(`/survey-follow-ups/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: alertKeys.all() })
      void qc.invalidateQueries({ queryKey: ['role-tasks'] })
    },
  })
}
