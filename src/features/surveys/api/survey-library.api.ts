import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import { surveyKeys } from '@/features/surveys/keys'
import type {
  SurveyCommentConfig,
  SurveyOtherOption,
  SurveyQuestionType,
  SurveyRecurrence,
  SurveyShowIf,
  SurveyTargetKind,
} from '@/features/surveys/types'
import { likertLabels } from '@/features/surveys/survey-likert'

export type CqcKeyQuestion = 'SAFE' | 'EFFECTIVE' | 'CARING' | 'RESPONSIVE' | 'WELL_LED'
export type LibraryChannel = 'ONLINE' | 'PORTAL' | 'TELEPHONE' | 'PAPER' | 'IN_PERSON'

/** A researched, ready-made survey an organisation can adopt as a template (Surveys → Ready-made surveys). */
export type LibrarySurvey = {
  id: string
  reference: string
  title: string
  summary: string
  group: { code: string; short: string; name: string; displayOrder: number }
  researchedOn: string
  audience: SurveyTargetKind
  /** Who answers, in plain words. */
  respondents: string
  anonymous: boolean
  /** Named survey: people may choose to answer without their name (online too). */
  allowAnonymousResponses?: boolean
  estimatedMinutes: number
  questionCount: number
  sectionCount: number
  cqc: { keyQuestions: CqcKeyQuestion[]; qualityStatements: string[] }
  timing: { when: string; recurrence: SurveyRecurrence | null; trigger: string | null }
  channels: LibraryChannel[]
  /** Library revision; raised whenever the survey changes after release. */
  revision: number
  revisionNote: string | null
  /** The organisation's template made from this one, if adopted. */
  adoptedTemplateId: string | null
  /** The library revision the adopted template is based on. */
  adoptedRevision: number | null
  updateAvailable: boolean
}

export type LibrarySurveyQuestion = {
  id: string
  questionText: string
  helpText: string | null
  questionType: SurveyQuestionType
  options: string[] | null
  /** Score: { min, max }; choice and scale questions: { notCountedOptions }. */
  config: Record<string, unknown> | null
  /** Answers left out of percentages ("Don't know"). */
  notCountedOptions?: string[]
  isRequired: boolean
  key?: string | null
  otherOption?: SurveyOtherOption | null
  /** Multiple choice: answers that clear the other ticks ("None of these"). */
  exclusiveOptions?: string[]
  commentConfig?: SurveyCommentConfig | null
  /** Asked only if the earlier question (its text given) has one of these answers. */
  showIf?: (SurveyShowIf & { questionText: string | null }) | null
}

export type LibrarySurveyDetail = LibrarySurvey & {
  purpose: string
  introduction: string
  privacyNotice: string
  /** Shown to people after they submit, or null. */
  closingMessage?: string | null
  sections: Array<{ title: string | null; evidence: string[]; introduction?: string | null; questions: LibrarySurveyQuestion[] }>
  managerGuidance: {
    howToRun: string[]
    actingOnResults: string[]
    alerts: Array<{ when: string; action: string }>
  }
  relatedPolicies: Array<{ reference: string; title: string | null }>
  regulatoryBasis: Array<{ source: string; url: string }>
  /** A named survey's anonymous version (chosen at New survey), or null. */
  anonymousVariant?: SurveyAnonymousVariant | null
}

/** The ready-made survey an organisation's template was adopted from. */
export type SurveyLibraryLink = {
  libraryId: string
  reference: string
  title: string
  adoptedRevision: number
  currentRevision: number
  revisionNote: string | null
  updateAvailable: boolean
  /** What applying the update does to the template's alert rules and section introductions. */
  plan?: SurveyLibraryUpdatePlan | null
  /** A named ready-made survey's anonymous version, offered at New survey (null when it has none). */
  anonymousVariant?: SurveyAnonymousVariant | null
}

/** The anonymous version of a named ready-made survey: what people read first and what it leaves out. */
export type SurveyAnonymousVariant = {
  introduction: string
  privacyNotice: string
  closingMessage?: string | null
  questionsLeftOut: string[]
  alertsLeftOut: string[]
}

/** Applying a ready-made update: what happens to the template's alert rules and section introductions. */
export type SurveyLibraryUpdatePlan = {
  /** Ready-made rules never changed here: take the new version. */
  refreshed: string[]
  added: string[]
  /** Ready-made rules the new version no longer has. */
  removed: string[]
  /** Own or changed rules whose answers were renamed. */
  renamedAnswers: Array<{ title: string; changes: string[] }>
  kept: string[]
  /** Rules that can no longer work as set: turned off, with why. */
  turnedOff: Array<{ title: string; reason: string }>
  sectionIntrosKept: string[]
  sectionIntrosDropped: string[]
}

export type AdoptSurveysResult = {
  created: Array<{ libraryId: string; templateId: string; reference: string; title: string }>
  /** Already adopted (also when someone adopted it at the same moment): templateId is their template. */
  skipped: Array<{ libraryId: string; reference: string; title: string; reason: string; templateId?: string }>
}

export async function fetchLibrarySurveys(): Promise<LibrarySurvey[]> {
  return (await apiJson<ApiEnvelope<LibrarySurvey[]>>('/survey-library', { method: 'GET' })).data
}

export async function fetchLibrarySurvey(id: string): Promise<LibrarySurveyDetail> {
  return (await apiJson<ApiEnvelope<LibrarySurveyDetail>>(`/survey-library/${encodeURIComponent(id)}`, { method: 'GET' })).data
}

export async function adoptLibrarySurveys(surveyIds: string[]): Promise<AdoptSurveysResult> {
  return (
    await apiJson<ApiEnvelope<AdoptSurveysResult>>('/survey-library/adopt', {
      method: 'POST',
      body: JSON.stringify({ surveyIds }),
    })
  ).data
}

export async function fetchSurveyLibraryLink(surveyId: string): Promise<SurveyLibraryLink | null> {
  return (
    await apiJson<ApiEnvelope<SurveyLibraryLink | null>>(
      `/survey-library/for-template/${encodeURIComponent(surveyId)}`,
      { method: 'GET' },
    )
  ).data
}

export async function applySurveyLibraryUpdate(
  surveyId: string,
): Promise<{ surveyId: string; revision: number } & Partial<SurveyLibraryUpdatePlan>> {
  return (
    await apiJson<ApiEnvelope<{ surveyId: string; revision: number } & Partial<SurveyLibraryUpdatePlan>>>(
      `/survey-library/apply-update/${encodeURIComponent(surveyId)}`,
      { method: 'POST' },
    )
  ).data
}

/** Question bank: who a question is for (the ready-made survey's group). */
export type BankAudience = 'PWS' | 'FAM' | 'STF' | 'PRO' | 'ORG' | 'CQC'
export const BANK_AUDIENCE_LABELS: Record<BankAudience, string> = {
  PWS: 'People we support',
  FAM: 'Families',
  STF: 'Staff',
  PRO: 'Professionals',
  ORG: 'Organisation / public',
  CQC: 'CQC',
}
/** Question bank: answer type filters. */
export type BankAnswerType = 'YES_NO' | 'SINGLE_SELECT' | 'MULTI_SELECT' | 'LIKERT' | 'RATING' | 'TEXT'
export const BANK_TYPE_LABELS: Record<BankAnswerType, string> = {
  YES_NO: 'Yes / No',
  SINGLE_SELECT: 'One answer',
  MULTI_SELECT: 'Several',
  LIKERT: 'Scale',
  RATING: 'Score',
  TEXT: 'Text',
}

/** A question of the ready-made library, once however many ready-made surveys ask it. */
export type BankQuestion = Omit<LibrarySurveyQuestion, 'showIf' | 'key'> & {
  /** Its section heading in the ready-made survey (a section suggestion). */
  topic: string | null
  /** "Would you like someone to contact you…": not for anonymous surveys. */
  contactRequest: boolean
  /** The original is asked only after an answer to another question (not copied). */
  askedOnlyIf: { questionText: string | null; answers: string[] } | null
  audiences: BankAudience[]
  sources: Array<{ surveyId: string; reference: string | null; title: string; group: string }>
}

export type QuestionBankQuery = {
  search?: string
  audience?: BankAudience
  topic?: string
  type?: BankAnswerType
  page?: number
  pageSize?: number
}

export type QuestionBankPage = { items: BankQuestion[]; total: number; page: number; pageSize: number; topics: string[] }

export async function fetchQuestionBank(query: QuestionBankQuery, init?: RequestInit): Promise<QuestionBankPage> {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== '') params.set(k, String(v))
  const qs = params.toString()
  return (
    await apiJson<ApiEnvelope<QuestionBankPage>>(`/surveys/question-bank${qs ? `?${qs}` : ''}`, { method: 'GET', ...init })
  ).data
}

const libraryKey = [...surveyKeys.all(), 'ready-made'] as const

export function useLibrarySurveys() {
  return useQuery({ queryKey: libraryKey, queryFn: fetchLibrarySurveys, staleTime: 60_000 })
}

export function useLibrarySurvey(id: string | null) {
  return useQuery({
    queryKey: [...libraryKey, id],
    queryFn: () => fetchLibrarySurvey(id!),
    enabled: Boolean(id),
    staleTime: 60_000,
  })
}

export function useAdoptLibrarySurveys() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: adoptLibrarySurveys,
    onSuccess: () => void qc.invalidateQueries({ queryKey: surveyKeys.all() }),
  })
}

export function useSurveyLibraryLink(surveyId: string, enabled = true) {
  return useQuery({
    queryKey: [...libraryKey, 'link', surveyId],
    queryFn: () => fetchSurveyLibraryLink(surveyId),
    enabled: enabled && Boolean(surveyId),
    staleTime: 60_000,
  })
}

export function useApplySurveyLibraryUpdate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: applySurveyLibraryUpdate,
    onSuccess: () => void qc.invalidateQueries({ queryKey: surveyKeys.all() }),
  })
}

export const CQC_KEY_QUESTION_LABELS: Record<CqcKeyQuestion, string> = {
  SAFE: 'Safe',
  EFFECTIVE: 'Effective',
  CARING: 'Caring',
  RESPONSIVE: 'Responsive',
  WELL_LED: 'Well-led',
}

export const LIBRARY_CHANNEL_LABELS: Record<LibraryChannel, string> = {
  ONLINE: 'Online link',
  PORTAL: 'Portal',
  TELEPHONE: 'Telephone',
  PAPER: 'Paper',
  IN_PERSON: 'In person',
}

/** How a question is answered, in plain words, with its scale or options. */
export function describeQuestionType(q: Pick<LibrarySurveyQuestion, 'questionType' | 'options' | 'config'>): string {
  switch (q.questionType) {
    case 'YES_NO':
      return 'Yes or no'
    case 'SINGLE_SELECT':
      return `Choose one: ${(q.options ?? []).join(' / ')}`
    case 'MULTI_SELECT':
      return `Choose any: ${(q.options ?? []).join(' / ')}`
    case 'TEXT':
      return 'Short written answer'
    case 'TEXTAREA':
      return 'Written comment'
    case 'NUMBER':
      return 'A number'
    case 'RATING': {
      const min = q.config?.min ?? 0
      const max = q.config?.max ?? 10
      return `Score from ${min} to ${max}`
    }
    case 'LIKERT':
      // Every label, in order — this is where people read exactly what a survey asks.
      return `Scale: ${likertLabels(q.options).join(' / ')}`
    default:
      return q.questionType
  }
}

export function useQuestionBank(query: QuestionBankQuery, enabled = true) {
  return useQuery({
    queryKey: [...libraryKey, 'question-bank', query],
    queryFn: ({ signal }) => fetchQuestionBank(query, { signal }),
    enabled,
    staleTime: 60_000,
    placeholderData: previous => previous,
  })
}
