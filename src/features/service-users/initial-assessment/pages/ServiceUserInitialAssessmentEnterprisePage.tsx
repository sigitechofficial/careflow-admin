import { askForDueSurveys } from '@/features/surveys/reminders/SurveyDuePrompt'
import * as React from 'react'
import { useWaterlowReviewSchedule } from '@/features/service-users/assessments/hooks/useServiceUserAssessments'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import {
  ClipboardCheck,
  FileCode2,
  FileDown,
  FlaskConical,
  Loader2,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { ApiError } from '@/shared/api/api-client'
import { toastApiError, toastError, toastInfo, toastSuccess, toastWarning } from '@/shared/lib/toast'
import { useToastStore } from '@/store/toast.store'
import { fetchServiceUserBodyMap } from '@/features/service-users/body-map/api'
import { type ServiceUserDetail, type ServiceUserListRow } from '@/features/service-users/types'
import { serviceUserKeys } from '@/features/service-users/keys'
import { useServiceUsers } from '@/features/service-users/hooks/useServiceUsers'
import { useDebouncedValue } from '@/features/policies/hooks/useDebouncedValue'
import { Combobox } from '@/shared/ui/combobox'
import { useServiceUser } from '@/features/service-users/hooks/useServiceUser'
import { useServiceUserLookups } from '@/features/service-users/hooks/useServiceUserLookups'
import { useServiceUserDomCare, useServiceUserAllergies } from '@/features/service-users/hooks/useServiceUserTabs'
import { useAuthStore } from '@/features/auth/store'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import { PolicyContextPanel } from '@/features/policies/components/PolicyContextPanel'
import { Label } from '@/shared/ui/form-field'
import {
  InitialAssessmentTextarea as Textarea,
  focusInitialAssessmentTextarea,
  plainTextFromHtml,
  readInitialAssessmentTextareaValue,
} from '@/features/service-users/initial-assessment/components/InitialAssessmentTextarea'
import { Button } from '@/shared/ui/button'
import { DictationProvider } from '@/shared/ui/dictation'
import { Badge } from '@/shared/ui/badge'
import { cn } from '@/shared/lib/utils'
import { InitialAssessmentSection12Content } from '@/features/service-users/initial-assessment/components/InitialAssessmentSection12Content'
import { InitialAssessmentAuditPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentAuditPanel'
import {
  InitialAssessmentHubTabs,
  type HubTabId,
} from '@/features/service-users/initial-assessment/components/InitialAssessmentHubTabs'
import { InitialAssessmentHubListPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentHubListPanel'
import { InitialAssessmentManagerReviewPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentManagerReviewPanel'
import { InitialAssessmentReopenDialog } from '@/features/service-users/initial-assessment/components/InitialAssessmentReopenDialog'
import { InitialAssessmentHtmlExportDialog } from '@/features/service-users/initial-assessment/components/InitialAssessmentHtmlExportDialog'
import { InitialAssessmentPdfDialog } from '@/features/service-users/initial-assessment/components/InitialAssessmentPdfDialog'
import { InitialAssessmentQaDemoDataDialog } from '@/features/service-users/initial-assessment/components/InitialAssessmentQaDemoDataDialog'
import { InitialAssessmentWorkspaceSkeleton } from '@/features/service-users/initial-assessment/components/InitialAssessmentWorkspaceSkeleton'
import { InitialAssessmentProfileCard } from '@/features/service-users/initial-assessment/components/InitialAssessmentProfileCard'
import { InitialAssessmentStatusBadge } from '@/features/service-users/initial-assessment/components/InitialAssessmentStatusBadge'
import { InitialAssessmentRiskRecordsPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentRiskRecordsPanel'
import { InitialAssessmentActionsPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentActionsPanel'
import { InitialAssessmentCarePlanRecommendationsPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentCarePlanRecommendationsPanel'
import { InitialAssessmentAttachmentsPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentAttachmentsPanel'
import { InitialAssessmentTranscriptionPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentTranscriptionPanel'
import type { AiFillTarget } from '@/features/service-users/initial-assessment/components/InitialAssessmentAiFillReview'
import { InitialAssessmentRequiredAssessmentsPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentRequiredAssessmentsPanel'
import { InitialAssessmentSchedulePanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentSchedulePanel'
import { InitialAssessmentSectionComment } from '@/features/service-users/initial-assessment/components/InitialAssessmentSectionComment'
import { InitialAssessmentBlockingBanner } from '@/features/service-users/initial-assessment/components/InitialAssessmentBlockingBanner'
import { InitialAssessmentSignOffPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentSignOffPanel'
import { InitialAssessmentSectionQuestions } from '@/features/service-users/initial-assessment/components/InitialAssessmentSectionQuestions'
import { signOffQuestionIds } from '@/features/service-users/initial-assessment/utils/sign-off-questions'
import {
  isPainAssessmentComplete as isPainToolComplete,
  type PainAssessmentMetadata,
} from '@/features/service-users/initial-assessment/utils/pain-assessment-scoring'
import { HOLISTIC_FORM_TITLE } from '@/features/service-users/initial-assessment/utils/holistic-assessment-labels'
import { InitialAssessmentDocumentTabContent } from '@/features/service-users/initial-assessment/components/InitialAssessmentDocumentTabContent'
import { SectionQaDemoDataPanel } from '@/features/service-users/initial-assessment/components/SectionQaDemoDataPanel'
import {
  applySpecialistNavStatus,
  buildHolisticTabNavStatus,
  HOLISTIC_ASSESSMENT_TABS,
  HOLISTIC_TAB_GROUP_LABEL,
  HOLISTIC_TAB_COUNT,
  holisticTabById,
  holisticTabDisplayNumber,
  holisticTabForValidationIssue,
  holisticTabRef,
  holisticTabTitle,
  questionsForDocumentTab,
  retiredHolisticTabIdsFor,
} from '@/features/service-users/initial-assessment/utils/holistic-assessment-tabs'
import { getVisibleSectionQuestions } from '@/features/service-users/initial-assessment/utils/visible-section-questions'
import { demoFillQuestionsForDocumentTab } from '@/features/service-users/initial-assessment/utils/demo-fill-tab-questions'
import { iaDemoIdentityFromDetail, isIaDemoIdentityPrefillQuestion } from '@/features/service-users/initial-assessment/utils/ia-section-demo-dev'
import { HOLISTIC_FORM_PAGE_CLASS } from '@/features/service-users/initial-assessment/utils/holistic-form-typography'
import {
  iaAssessorNameDesignation,
  painPanelTemplateQuestionIds,
  stampPainAssessmentCompletion,
  syncPainAssessmentAnswers,
} from '@/features/service-users/initial-assessment/utils/pain-questions'
import {
  isMustScoringComplete,
  type MustMetadata,
} from '@/features/service-users/initial-assessment/utils/must-scoring'
import {
  isFallsScreeningComplete,
  type FallsScreeningMetadata,
} from '@/features/service-users/initial-assessment/utils/falls-screening'
import {
  isMovingHandlingOperationsComplete,
  type MovingHandlingOperationsMetadata,
} from '@/features/service-users/initial-assessment/utils/moving-handling-operations'
import { isTherapyAideMemoireComplete } from '@/features/service-users/initial-assessment/utils/therapy-aide-memoire'
import {
  ENVIRONMENT_ASSESSMENT_LONE_WORKER_FACTORS,
  isEnvironmentAssessmentComplete,
  type EnvironmentAssessmentLoneWorkerFactorId,
  type EnvironmentAssessmentMetadata,
} from '@/features/service-users/initial-assessment/utils/environment-assessment'
import {
  isAdvanceCarePlanningComplete,
  type AdvanceCarePlanningMetadata,
} from '@/features/service-users/initial-assessment/utils/advance-care-planning'
import {
  isEndOfLifeAssessmentComplete,
  type EndOfLifeAssessmentMetadata,
} from '@/features/service-users/initial-assessment/utils/end-of-life-assessment'
import {
  isClinicalAssessmentOutcomeSummaryComplete,
  type ClinicalAssessmentOutcomeSummaryMetadata,
} from '@/features/service-users/initial-assessment/utils/clinical-assessment-outcome-summary'
import {
  isCarePlanObjectivesComplete,
  carePlanVisitIdsFromSections,
  type CarePlanObjectivesMetadata,
} from '@/features/service-users/initial-assessment/utils/care-plan-objectives'
import {
  isMentalCapacityChecklistComplete,
  syncMentalCapacityChecklistFromScreening,
  type MentalCapacityChecklistMetadata,
} from '@/features/service-users/initial-assessment/utils/mental-capacity-checklist'
import {
  isIaPhotographyConsentComplete,
  type PhotographyConsentMetadata,
} from '@/features/service-users/initial-assessment/utils/photography-consent'
import {
  isEquipmentSelectionComplete,
  type EquipmentSelectionMetadata,
} from '@/features/service-users/initial-assessment/utils/equipment-selection'
import { syncFallsScreeningDerivedState } from '@/features/service-users/initial-assessment/utils/falls-screening-questions'
import {
  syncDnacprFromEndOfLife,
  syncEnvPetsToSection3,
  syncFallsToMovingHandling,
  syncWaterlowScoreToEquipment,
  prefillAcpFromIdentityAnswers,
  prefillPhotographyFromIdentityAnswers,
} from '@/features/service-users/initial-assessment/utils/semantic-cross-tab-sync'
import { syncFillDemoCatalogueAnswers } from '@/features/service-users/initial-assessment/utils/fill-demo-worksheet-sync'
import {
  mustTemplateQuestionIds,
  syncMustAssessmentAnswers,
} from '@/features/service-users/initial-assessment/utils/must-questions'
import {
  syncWaterlowCompletedAnswer,
  waterlowTemplateQuestionIds,
} from '@/features/service-users/initial-assessment/utils/waterlow-questions'
import {
  computeWaterlowScore,
  isWaterlowAllSectionsComplete,
  waterlowFollowUpPrefill,
} from '@/features/service-users/initial-assessment/utils/waterlow-scoring'
import {
  specialistInputsFromAssessment,
  specialistRelevance,
  type SpecialistOverrides,
} from '@/features/service-users/initial-assessment/utils/specialist-relevance'
import { useServiceUserDocuments } from '@/features/service-users/hooks/useServiceUserTabs'
import {
  capacityDecisionNeeds,
  isCapacityDecisionComplete,
  normalizeCapacityDecisions,
  usesLegacyCapacityScreening,
  type CapacityDecisionRecord,
} from '@/features/service-users/initial-assessment/utils/capacity-decisions'
import {
  normalizeConditionProposals,
  type ConditionProposal,
} from '@/features/service-users/initial-assessment/utils/condition-proposals'
import {
  specialistTriggerNotes,
  SpecialistTriggerNotesContext,
} from '@/features/service-users/initial-assessment/utils/specialist-question-triggers'
import { buildAssessmentSummary } from '@/features/service-users/initial-assessment/utils/assessment-summary'
import {
  autoOutcomeValues,
  fillOutcomeSummaryFromAssessment,
} from '@/features/service-users/initial-assessment/utils/outcome-summary-auto'
import { labelForQuestionOptionValue } from '@/features/service-users/initial-assessment/utils/question-options'
import { MCA_SCREENING_SPEC_REF } from '@/features/service-users/initial-assessment/utils/mca-screening'
import type { SpecialistOverride } from '@/features/service-users/initial-assessment/utils/specialist-relevance-rules'
import {
  InitialAssessmentSpecialistRelevanceBanner,
  SPECIALIST_STATUS_LABEL,
} from '@/features/service-users/initial-assessment/components/InitialAssessmentSpecialistRelevanceBanner'
import type { SpecialistStatus } from '@/features/service-users/initial-assessment/utils/specialist-relevance-rules'

import { InitialAssessmentSidePanels } from '@/features/service-users/initial-assessment/components/InitialAssessmentSidePanels'
import { InitialAssessmentSubmitDialog } from '@/features/service-users/initial-assessment/components/InitialAssessmentSubmitDialog'
import { InitialAssessmentVersionsPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentVersionsPanel'
import { InitialAssessmentWaterlowPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentWaterlowPanel'
import { InitialAssessmentTransferMatrixPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentTransferMatrixPanel'
import { InitialAssessmentFinanceSupportPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentFinanceSupportPanel'
import { InitialAssessmentEquipmentChecklistPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentEquipmentChecklistPanel'
import { InitialAssessmentCareActivationPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentCareActivationPanel'
import { InitialAssessmentQuestionField } from '@/features/service-users/initial-assessment/components/InitialAssessmentQuestionField'
import { sectionProgress, overallAssessmentProgress, formatSectionNavMeta, type SectionProgressContext } from '@/features/service-users/initial-assessment/utils/section-progress'
import {
  nextImportantSection,
  type NextImportantSection,
} from '@/features/service-users/initial-assessment/utils/next-important-section'
import {
  applyPrefillToDraftAnswers,
  buildPrefillMap,
  hasAssessmentAnswer,
} from '@/features/service-users/initial-assessment/utils/question-prefill'
import { formatAllergiesAssessmentText } from '@/features/service-users/utils/format-allergies-assessment-text'
import { prepareAnswersForSave } from '@/features/service-users/initial-assessment/utils/secure-field'
import { adlMetadataEqual } from '@/features/service-users/initial-assessment/utils/adl-scoring'
import {
  defaultAdlRows,
  mergeMetadataPatch,
  parseSubmissionMetadata,
  skinIntegrityCheckHasEntries,
  type SectionCommentEntry,
} from '@/features/service-users/initial-assessment/utils/submission-metadata'
import {
  patchSkinIntegrityCheckRow,
  type SkinIntegrityCheckMetadata,
} from '@/features/service-users/initial-assessment/utils/skin-integrity-check'
import { syncSkinIntegrityCheckFromBodyMap } from '@/features/service-users/initial-assessment/utils/sync-skin-integrity-from-body-map'
import { skinIntegrityBodyMapGateAnsweredYes } from '@/features/service-users/initial-assessment/utils/skin-integrity-body-map'
import { applyNoConcernLogic } from '@/features/service-users/initial-assessment/utils/no-concern-logic'
import { applyCrossFieldSync, collectAnswersForSave } from '@/features/service-users/initial-assessment/utils/cross-field-sync'
import { mergeLiveRichTextAnswersForQuestions } from '@/features/service-users/initial-assessment/utils/rich-text-save.util'
import { syncDerivedConcernGates } from '@/features/service-users/initial-assessment/utils/concern-gate-utils'
import {
  hasAgreedGoal,
  prefillFirstGoalFromSupportGoals,
  type AgreedGoalsMetadata,
} from '@/features/service-users/initial-assessment/utils/agreed-goals'
import {
  substanceMisuseImpliedByAnswers,
  syncCrossTabAnswerDefaults,
} from '@/features/service-users/initial-assessment/utils/cross-tab-answer-defaults'
import { syncHoistFromMovingHandling } from '@/features/service-users/initial-assessment/utils/sync-hoist-from-moving-handling'
import { draftAnswersEqual } from '@/features/service-users/initial-assessment/utils/draft-answers-equality'
import {
  getSubmitValidationIssues,
  type ValidationIssue,
  specialistRequiredBlocks,
} from '@/features/service-users/initial-assessment/utils/submit-validation'
import {
  findQuestionByFieldKey,
  findQuestionBySpecRef,
} from '@/features/service-users/initial-assessment/utils/question-lookup'
import { isYesAnswer } from '@/features/service-users/initial-assessment/utils/question-lookup'
import { DEFAULT_INITIAL_ASSESSMENT_AGENCY_SETTINGS } from '@/features/service-users/initial-assessment/utils/agency-settings-defaults'
import {
  IA_FORM_NAV_BUTTON_CLASS,
  IA_FORM_NAV_META_CLASS,
  IA_FORM_ROOT_CLASS,
  IA_SECTION_TITLE_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'
import { buildVitalsValidationErrors } from '@/features/service-users/initial-assessment/utils/vitals-validation'
import { useVitalAcceptedRangeLookup } from '@/features/service-users/initial-assessment/hooks/useVitalAcceptedRangeLookup'
import { vitalAcceptedRangesFromLookup } from '@/features/service-users/initial-assessment/utils/vital-accepted-ranges.lookup'
import { buildValidationMaps } from '@/features/service-users/initial-assessment/utils/validation-maps'
import { section12PanelExcludedIds } from '@/features/service-users/initial-assessment/utils/section-12-panel-exclusions'
import {
  buildInitialAssessmentEnterpriseSearch,
  parseInitialAssessmentEnterpriseSearch,
  type InitialAssessmentEnterpriseSearch,
} from '@/features/service-users/initial-assessment/utils/initial-assessment-url-search'
import {
  isEditableInitialAssessmentStatus,
  pickSubmissionFromList,
  resolveInitialAssessmentSubmissionId,
} from '@/features/service-users/initial-assessment/utils/resolve-initial-assessment-submission-id.util'
import {
  useCreateInitialAssessmentSubmission,
  useDefaultInitialAssessmentTemplate,
  useInitialAssessmentTemplate,
  useInitialAssessmentAnswers,
  useInitialAssessmentSummary,
  useInitialAssessmentActions,
  useInitialAssessmentCarePlanTriggers,
  useInitialAssessmentRiskSummary,
  useInitialAssessmentSubmissions,
  useReopenInitialAssessment,
  useReviewInitialAssessment,
  useSaveInitialAssessmentAnswers,
  useSubmitInitialAssessment,
  useUpdateInitialAssessmentSubmission,
  useValidateInitialAssessment,
  useInitialAssessmentAgencySettings,
  useLoneWorkerSystemFacts,
} from '@/features/service-users/initial-assessment/hooks/useInitialAssessmentEnterprise'
import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentFlaggedItem,
  InitialAssessmentQuestion,
  InitialAssessmentSection,
  VisitPlanDraftOutcome,
} from '@/features/service-users/initial-assessment/types'
import type { IaAutofillLevel } from '@/features/service-users/initial-assessment/utils/ia-autofill-dev'
import {
  IA_CONDITION_LEVEL_LABELS,
  IA_QA_DEMO_DATA_BUTTON_LABEL,
  IA_QA_DEMO_DATA_BUTTON_TOOLTIP,
} from '@/features/service-users/initial-assessment/utils/ia-autofill-levels'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip'
import {
  fillLoneWorkerFactorsFromFacts,
  loneWorkerFactsByFactor,
} from '@/features/service-users/initial-assessment/utils/lone-worker-system-facts'

/** Nav badge colours for specialist tabs. */
const SPECIALIST_NAV_BADGE_CLASS: Record<SpecialistStatus, string> = {
  required: 'bg-red-600 font-bold uppercase tracking-wide text-white dark:bg-red-500 dark:text-white',
  suggested: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
  not_needed: 'bg-muted text-muted-foreground',
  pending: 'bg-muted text-muted-foreground',
}

const ENTERPRISE_PATH = '/service-users/initial-assessment'
// const LEGACY_PATH = '/service-users/initial-assessment-checklist'

const AUTOSAVE_MS = 400
/** Stable fallback — avoid `?? []` creating a new array reference every render (infinite hydrate loops). */
const EMPTY_SECTIONS: InitialAssessmentSection[] = []

type ServerAnswerRow = NonNullable<ReturnType<typeof useInitialAssessmentAnswers>['data']>[number]

function preserveSelectedOptionsFromServer(
  raw: unknown,
): InitialAssessmentAnswerInput['selectedOptions'] {
  if (raw == null) return undefined
  if (Array.isArray(raw)) return raw as unknown[]
  if (typeof raw === 'string') return raw
  if (typeof raw === 'object') return raw as Record<string, unknown>
  return undefined
}

function draftAnswersFromServerRows(
  rows: ServerAnswerRow[],
): Record<string, InitialAssessmentAnswerInput> {
  const map: Record<string, InitialAssessmentAnswerInput> = {}
  for (const a of rows) {
    map[a.questionId] = {
      questionId: a.questionId,
      checked: a.checked ?? undefined,
      booleanValue: a.booleanValue ?? undefined,
      textValue: a.textValue ?? undefined,
      numberValue: a.numberValue ?? undefined,
      dateValue: a.dateValue ?? undefined,
      timeValue: a.timeValue ?? undefined,
      selectedOptions: preserveSelectedOptionsFromServer(a.selectedOptions),
      notes: a.notes ?? undefined,
      secureMasked: a.secureMasked,
      hasSecureValue: a.hasSecureValue,
    }
  }
  return map
}

function questionsHaveDirtyAnswers(
  questions: InitialAssessmentQuestion[],
  dirtyIds: Set<string>,
): boolean {
  return questions.some((q) => dirtyIds.has(q.id))
}

type SaveIndicator = 'idle' | 'saving' | 'saved' | 'error' | 'retrying'

/** Waits between automatic retries after an autosave fails (then we stop and ask for a manual save). */
const AUTOSAVE_RETRY_DELAYS_MS = [2_000, 5_000, 10_000, 20_000, 30_000]
const AUTOSAVE_FAILED_TOAST_ID = 'ia-autosave-failed'
const AUTOSAVE_GAVE_UP_TOAST_ID = 'ia-autosave-gave-up'

function customerLabel(row: Pick<ServiceUserListRow, 'id' | 'preferredName' | 'firstName' | 'lastName' | 'serviceUserNumber'>): string {
  const name = row.preferredName?.trim() || [row.firstName, row.lastName].filter(Boolean).join(' ')
  const num = row.serviceUserNumber ? ` (${row.serviceUserNumber})` : ''
  return `${name}${num}`.trim() || row.id
}

function serviceUserDetailLabel(detail: ServiceUserDetail): string {
  return customerLabel({
    id: detail.id,
    preferredName: detail.preferredName,
    firstName: detail.firstName,
    lastName: detail.lastName,
    serviceUserNumber: detail.serviceUserNumber,
  })
}

/**
 * Best-effort check for user-entered data inside a worksheet/metadata object (QA Demo Data
 * overwrite confirm). Treats non-empty strings, real numbers, `true`, and non-empty arrays as
 * "has data"; empty defaults read as no data. Dev/QA-only heuristic — safe to over-report.
 */
function worksheetHasMeaningfulValue(value: unknown): boolean {
  if (value == null) return false
  if (typeof value === 'string') return value.trim() !== ''
  if (typeof value === 'number') return Number.isFinite(value) && value !== 0
  if (typeof value === 'boolean') return value === true
  if (Array.isArray(value)) return value.some((v) => worksheetHasMeaningfulValue(v))
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some((v) =>
      worksheetHasMeaningfulValue(v),
    )
  }
  return false
}

/** The review is saved either way — only the auto visit-plan draft can be skipped (e.g. no weekly hours). */
function notifyReviewOutcome(visitPlanDraft: VisitPlanDraftOutcome | null | undefined) {
  if (!visitPlanDraft) {
    toastSuccess('Reviewed', 'Assessment marked reviewed.')
    return
  }
  if (visitPlanDraft.status === 'skipped') {
    toastWarning(
      'Approved — visit plan not created',
      `${visitPlanDraft.message} The approval is saved; create the visit plan once this is fixed.`,
    )
    return
  }
  toastSuccess(
    'Approved for care start',
    visitPlanDraft.status === 'created'
      ? 'A draft visit plan has been created from this assessment.'
      : 'A visit plan already exists for this assessment.',
  )
}

/** Text fields on this page get a speech-to-text mic. */
export default function ServiceUserInitialAssessmentEnterprisePage() {
  return (
    <DictationProvider>
      <InitialAssessmentEnterprisePageContent />
    </DictationProvider>
  )
}

function InitialAssessmentEnterprisePageContent() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const urlSearch = useRouterState({
    select: (s) =>
      s.location.pathname === ENTERPRISE_PATH
        ? parseInitialAssessmentEnterpriseSearch(s.location.search)
        : {},
  })
  const selectedId = urlSearch.serviceUserId ?? ''
  const hubTab = urlSearch.tab ?? 'form'
  /** Holistic document tab (1–30); stored in URL as `section`. */
  const activeHolisticTab = urlSearch.section ?? HOLISTIC_ASSESSMENT_TABS[0]!.id

  const patchUrlSearch = React.useCallback(
    (patch: Partial<InitialAssessmentEnterpriseSearch>) => {
      const next = buildInitialAssessmentEnterpriseSearch({ ...urlSearch, ...patch })
      void navigate({ to: ENTERPRISE_PATH, search: next, replace: true })
    },
    [navigate, urlSearch],
  )

  const setHubTab = React.useCallback(
    (tab: HubTabId) => patchUrlSearch({ tab }),
    [patchUrlSearch],
  )

  const setActiveSection = React.useCallback(
    (section: number) => patchUrlSearch({ section, tab: 'form' }),
    [patchUrlSearch],
  )
  const can = useAuthStore((s) => s.can)
  const canRead = can('service_users.initial_assessment.read') || can('service_users.read')
  const canUpdate = can('service_users.initial_assessment.update') || can('service_users.update')
  const canCreate = can('service_users.initial_assessment.create') || canUpdate
  const canSubmit = can('service_users.initial_assessment.submit')
  const canReview = can('service_users.initial_assessment.review')
  const canExportAssessment =
    can('service_users.initial_assessment.export') ||
    can('service_users.initial_assessment.read') ||
    can('service_users.read')
  const hasApi = !!getApiBaseUrl()
  const { locationId: globalLocationId } = useGlobalLocationScope()

  const [serviceUserSearch, setServiceUserSearch] = React.useState('')
  const debouncedServiceUserSearch = useDebouncedValue(serviceUserSearch.trim(), 300)
  const listParams = React.useMemo(
    () => ({
      limit: 100,
      sortBy: 'lastName' as const,
      sortOrder: 'asc' as const,
      locationId: globalLocationId ?? undefined,
      // The API matches each field separately, so "John Smith" would match nothing: send the first
      // word and let the picker narrow the rest against the full label.
      search: debouncedServiceUserSearch.split(/\s+/)[0] || undefined,
    }),
    [globalLocationId, debouncedServiceUserSearch],
  )

  const { data: listData, isLoading: listLoading, isFetching: listFetching } = useServiceUsers(
    listParams,
    hasApi && canRead,
  )
  const serviceUsers = listData?.rows ?? []
  const selected = React.useMemo(
    () => serviceUsers.find((su) => su.id === selectedId) ?? null,
    [serviceUsers, selectedId],
  )

  const submissionsQuery = useInitialAssessmentSubmissions(selectedId, hasApi && canRead && !!selectedId)
  const detailQuery = useServiceUser(selectedId, hasApi && canRead && !!selectedId)
  const domCareQuery = useServiceUserDomCare(selectedId, hasApi && canRead && !!selectedId)
  const suLookupsQuery = useServiceUserLookups()
  const allergiesQuery = useServiceUserAllergies(selectedId, hasApi && canRead && !!selectedId)
  const autoSubmissionId = React.useMemo(
    () => resolveInitialAssessmentSubmissionId(submissionsQuery.data, urlSearch.submissionId),
    [submissionsQuery.data, urlSearch.submissionId],
  )
  const [manualSubmissionId, setManualSubmissionId] = React.useState<string | null>(null)
  React.useEffect(() => {
    setManualSubmissionId(null)
  }, [selectedId, urlSearch.submissionId])
  const submissionId = manualSubmissionId ?? autoSubmissionId
  const [draftAnswers, setDraftAnswers] = React.useState<Record<string, InitialAssessmentAnswerInput>>({})
  const [sectionComments, setSectionComments] = React.useState<Record<string, SectionCommentEntry>>({})
  const [waterlow, setWaterlow] = React.useState(parseSubmissionMetadata(undefined).waterlow)
  const [painAssessment, setPainAssessment] = React.useState<PainAssessmentMetadata>(
    parseSubmissionMetadata(undefined).painAssessment,
  )
  const [skinIntegrityCheck, setSkinIntegrityCheck] = React.useState(
    parseSubmissionMetadata(undefined).skinIntegrityCheck,
  )
  const [mustAssessment, setMustAssessment] = React.useState<MustMetadata>(
    parseSubmissionMetadata(undefined).mustAssessment,
  )
  const [fallsScreening, setFallsScreening] = React.useState<FallsScreeningMetadata>(
    parseSubmissionMetadata(undefined).fallsScreening,
  )
  const [movingHandlingOperations, setMovingHandlingOperations] =
    React.useState<MovingHandlingOperationsMetadata>(
      parseSubmissionMetadata(undefined).movingHandlingOperations,
    )
  const [environmentAssessment, setEnvironmentAssessment] =
    React.useState<EnvironmentAssessmentMetadata>(
      parseSubmissionMetadata(undefined).environmentAssessment,
    )
  const [advanceCarePlanning, setAdvanceCarePlanning] =
    React.useState<AdvanceCarePlanningMetadata>(
      parseSubmissionMetadata(undefined).advanceCarePlanning,
    )
  const [endOfLifeAssessment, setEndOfLifeAssessment] =
    React.useState<EndOfLifeAssessmentMetadata>(
      parseSubmissionMetadata(undefined).endOfLifeAssessment,
    )
  const [clinicalOutcomeSummary, setClinicalOutcomeSummary] =
    React.useState<ClinicalAssessmentOutcomeSummaryMetadata>(
      parseSubmissionMetadata(undefined).clinicalOutcomeSummary,
    )
  const [carePlanObjectives, setCarePlanObjectives] = React.useState<CarePlanObjectivesMetadata>(
    parseSubmissionMetadata(undefined).carePlanObjectives,
  )
  const [agreedGoals, setAgreedGoals] = React.useState<AgreedGoalsMetadata>(
    parseSubmissionMetadata(undefined).agreedGoals,
  )
  const agreedGoalsPersistTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const [capacityDecisions, setCapacityDecisions] = React.useState<CapacityDecisionRecord[]>([])
  const [conditionProposals, setConditionProposals] = React.useState<ConditionProposal[]>([])
  const conditionProposalsPersistTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const capacityDecisionsPersistTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const [mentalCapacityChecklist, setMentalCapacityChecklist] =
    React.useState<MentalCapacityChecklistMetadata>(
      parseSubmissionMetadata(undefined).mentalCapacityChecklist,
    )
  const [photographyConsent, setPhotographyConsent] = React.useState<PhotographyConsentMetadata>(
    parseSubmissionMetadata(undefined).photographyConsent,
  )
  const [equipmentSelection, setEquipmentSelection] = React.useState<EquipmentSelectionMetadata>(
    parseSubmissionMetadata(undefined).equipmentSelection,
  )
  /** Audited overrides of a specialist tab's screening result (`metadata.tabRelevanceOverrides`). */
  const [relevanceOverrides, setRelevanceOverrides] = React.useState<SpecialistOverrides>({})
  const [showNotNeededSpecialists, setShowNotNeededSpecialists] = React.useState(false)
  const vitalAcceptedRangeLookup = useVitalAcceptedRangeLookup()
  const vitalAcceptedRanges = React.useMemo(
    () => vitalAcceptedRangesFromLookup(vitalAcceptedRangeLookup.data ?? []),
    [vitalAcceptedRangeLookup.data],
  )
  const [sectionFooters, setSectionFooters] = React.useState(
    parseSubmissionMetadata(undefined).sectionFooters,
  )
  const [adl, setAdl] = React.useState(parseSubmissionMetadata(undefined).adl)
  const [transfers, setTransfers] = React.useState(parseSubmissionMetadata(undefined).transfers)
  const [financeSupport, setFinanceSupport] = React.useState(parseSubmissionMetadata(undefined).financeSupport)
  const [equipmentChecklist, setEquipmentChecklist] = React.useState(
    parseSubmissionMetadata(undefined).equipmentChecklist,
  )
  const [dailyLivingAids, setDailyLivingAids] = React.useState(
    parseSubmissionMetadata(undefined).dailyLivingAids,
  )
  const [practicalCare, setPracticalCare] = React.useState(parseSubmissionMetadata(undefined).practicalCare)
  const [approvedForCareStart, setApprovedForCareStart] = React.useState(false)
  const [careStartConditions, setCareStartConditions] = React.useState('')
  const [saveIndicator, setSaveIndicator] = React.useState<SaveIndicator>('idle')
  const [submitModalOpen, setSubmitModalOpen] = React.useState(false)
  const [validationRevealed, setValidationRevealed] = React.useState(false)
  const [pdfModalOpen, setPdfModalOpen] = React.useState(false)
  const [htmlExportOpen, setHtmlExportOpen] = React.useState(false)
  const [syncBodyMapLoading, setSyncBodyMapLoading] = React.useState(false)
  const [rightSidebarOpen, setRightSidebarOpen] = React.useState(false)
  const [reviewNotes, setReviewNotes] = React.useState('')
  const [reopenOpen, setReopenOpen] = React.useState(false)
  const [reopenReason, setReopenReason] = React.useState('')
  const answersHydratedRef = React.useRef(false)
  const serverBaselineAnswersRef = React.useRef<Record<string, InitialAssessmentAnswerInput>>({})
  const dirtyAnswerQuestionIdsRef = React.useRef(new Set<string>())
  /** Edits per question, so a save can tell which answers changed while it was in flight. */
  const answerEditCountsRef = React.useRef(new Map<string, number>())
  // QA Demo Data: questionIds populated in-memory by "Fill Demo Data". NOT marked dirty (so the
  // fill never auto-saves), but preserved across answer refetches so the values are not clobbered.
  const demoFilledQuestionIdsRef = React.useRef(new Set<string>())
  const skipAutosaveRef = React.useRef(true)
  /** An autosave request is running; another one waits for it (`autosaveQueuedRef`). */
  const autosaveInFlightRef = React.useRef(false)
  const autosaveQueuedRef = React.useRef(false)
  /** Bumped to run the autosave effect again when answers are still dirty but nothing re-ran it. */
  const [autosaveNudge, setAutosaveNudge] = React.useState(0)
  const syncSaveQuestionIdsRef = React.useRef<Set<string>>(new Set())
  const sectionContentRef = React.useRef<HTMLDivElement>(null)
  /** Left-nav tab switch: show feedback before heavy section mount blocks the main thread. */
  const [pendingHolisticTab, setPendingHolisticTab] = React.useState<number | null>(null)
  const tabSwitchTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const tabSwitchLoading = pendingHolisticTab != null
  const sectionCommentsLocalEditRef = React.useRef(false)
  const sectionCommentDraftRef = React.useRef<Record<string, string>>({})
  const saveSectionInProgressRef = React.useRef(false)
  /** Shown under the form after "Save section"; `next: null` means nothing important is left. */
  const [nextSectionSuggestion, setNextSectionSuggestion] = React.useState<{
    fromTabId: number
    next: NextImportantSection | null
  } | null>(null)
  const submissionMetadataRef = React.useRef<Record<string, unknown>>({})
  const skinIntegrityLocalEditRef = React.useRef(false)
  const skinIntegrityPersistTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const skinIntegrityPendingPersistRef = React.useRef<SkinIntegrityCheckMetadata | null>(null)
  const skinIntegrityCheckRef = React.useRef<SkinIntegrityCheckMetadata>(
    parseSubmissionMetadata(undefined).skinIntegrityCheck,
  )
  skinIntegrityCheckRef.current = skinIntegrityCheck
  const mentalCapacityLocalEditRef = React.useRef(false)
  const mentalCapacityPersistTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const mentalCapacityPendingPersistRef = React.useRef<MentalCapacityChecklistMetadata | null>(null)
  const mentalCapacityPersistGenerationRef = React.useRef(0)
  const mentalCapacityChecklistRef = React.useRef<MentalCapacityChecklistMetadata>(
    parseSubmissionMetadata(undefined).mentalCapacityChecklist,
  )
  mentalCapacityChecklistRef.current = mentalCapacityChecklist
  // Unsaved leave guard disabled for now — see promptIfUnsaved / AlertDialog below.
  // const pendingLeaveActionRef = React.useRef<(() => void) | null>(null)
  // const suppressLeaveGuardRef = React.useRef(false)
  // const [unsavedLeaveOpen, setUnsavedLeaveOpen] = React.useState(false)
  // const [leaveSaving, setLeaveSaving] = React.useState(false)

  const answersQuery = useInitialAssessmentAnswers(selectedId, submissionId)
  const needsScheduleData =
    hubTab === 'schedule' || submitModalOpen
  const needsRiskSidebarData = rightSidebarOpen || submitModalOpen
  const actionsQuery = useInitialAssessmentActions(
    selectedId,
    submissionId,
    hasApi && canRead && !!submissionId && needsScheduleData,
  )
  const summaryQuery = useInitialAssessmentSummary(
    selectedId,
    submissionId,
    hasApi && canRead && !!submissionId && needsScheduleData,
  )
  const agencySettingsQuery = useInitialAssessmentAgencySettings(
    hasApi && canRead && needsScheduleData,
  )
  const agencySettings =
    summaryQuery.data?.agencySettings ??
    agencySettingsQuery.data ??
    DEFAULT_INITIAL_ASSESSMENT_AGENCY_SETTINGS
  const openActionsCount =
    actionsQuery.data?.filter((a) => a.status === 'OPEN' || a.status === 'IN_PROGRESS').length ?? 0
  const carePlanRecommendationCount = summaryQuery.data?.carePlanRecommendations?.length ?? 0
  const riskQuery = useInitialAssessmentRiskSummary(
    selectedId,
    submissionId,
    hasApi && canRead && !!submissionId && needsRiskSidebarData,
  )
  const triggersQuery = useInitialAssessmentCarePlanTriggers(
    selectedId,
    submissionId,
    hasApi && canRead && !!submissionId && needsRiskSidebarData,
  )
  const validateQuery = useValidateInitialAssessment(
    selectedId,
    submissionId,
    submitModalOpen && Boolean(submissionId),
  )
  const createMutation = useCreateInitialAssessmentSubmission(selectedId)
  const saveMutation = useSaveInitialAssessmentAnswers(selectedId, submissionId ?? '')
  const submitMutation = useSubmitInitialAssessment(selectedId, submissionId ?? '')
  const updateSubmissionMutation = useUpdateInitialAssessmentSubmission(selectedId, submissionId ?? '')
  const reviewMutation = useReviewInitialAssessment(selectedId, submissionId ?? '')
  const reopenMutation = useReopenInitialAssessment(selectedId, submissionId ?? '')

  const submission = React.useMemo(
    () => pickSubmissionFromList(submissionsQuery.data, submissionId),
    [submissionsQuery.data, submissionId],
  )

  const openHtmlExport = React.useCallback(() => {
    if (!submission?.id) return
    setHtmlExportOpen(true)
  }, [submission?.id])

  // QA Demo Data (dev/QA only): a chosen scenario drives per-section "Fill Demo Data".
  const [qaDemoSeverity, setQaDemoSeverity] = React.useState<IaAutofillLevel | null>(null)
  const [qaDemoDialogOpen, setQaDemoDialogOpen] = React.useState(false)
  // Which holistic tabs have had demo data populated this session (drives the nav "filled" badges).
  const [demoFilledTabs, setDemoFilledTabs] = React.useState<Set<number>>(() => new Set())

  const canExportSecure = can('service_users.initial_assessment.export')

  const templateIdForLoad = submission?.templateId ?? null
  const templateByIdQuery = useInitialAssessmentTemplate(
    templateIdForLoad,
    hasApi && canRead && !!selectedId && !!templateIdForLoad,
  )
  const defaultTemplateQuery = useDefaultInitialAssessmentTemplate(
    hasApi && canRead && !!selectedId && !templateIdForLoad,
  )
  const templateQuery = templateIdForLoad ? templateByIdQuery : defaultTemplateQuery

  React.useEffect(() => {
    setReviewNotes(submission?.reviewNotes ?? '')
  }, [submission?.id, submission?.reviewNotes])

  React.useEffect(() => {
    submissionMetadataRef.current = { ...(submission?.metadata ?? {}) }
  }, [submission?.metadata])

  React.useEffect(() => {
    const parsed = parseSubmissionMetadata(submission)
    if (!sectionCommentsLocalEditRef.current) {
      setSectionComments(parsed.sectionComments)
      sectionCommentDraftRef.current = Object.fromEntries(
        Object.entries(parsed.sectionComments).map(([key, entry]) => [key, entry.text]),
      )
    }
    setWaterlow((prev) => (prev === parsed.waterlow ? prev : parsed.waterlow))
    setPainAssessment((prev) =>
      JSON.stringify(prev) === JSON.stringify(parsed.painAssessment) ? prev : parsed.painAssessment,
    )
    setSkinIntegrityCheck((prev) => {
      if (skinIntegrityLocalEditRef.current) return prev
      return JSON.stringify(prev) === JSON.stringify(parsed.skinIntegrityCheck)
        ? prev
        : parsed.skinIntegrityCheck
    })
    setMustAssessment((prev) =>
      JSON.stringify(prev) === JSON.stringify(parsed.mustAssessment) ? prev : parsed.mustAssessment,
    )
    setFallsScreening((prev) =>
      JSON.stringify(prev) === JSON.stringify(parsed.fallsScreening) ? prev : parsed.fallsScreening,
    )
    setMovingHandlingOperations((prev) =>
      JSON.stringify(prev) === JSON.stringify(parsed.movingHandlingOperations)
        ? prev
        : parsed.movingHandlingOperations,
    )
    setEnvironmentAssessment((prev) =>
      JSON.stringify(prev) === JSON.stringify(parsed.environmentAssessment)
        ? prev
        : parsed.environmentAssessment,
    )
    setAdvanceCarePlanning((prev) =>
      JSON.stringify(prev) === JSON.stringify(parsed.advanceCarePlanning)
        ? prev
        : parsed.advanceCarePlanning,
    )
    setEndOfLifeAssessment((prev) =>
      JSON.stringify(prev) === JSON.stringify(parsed.endOfLifeAssessment)
        ? prev
        : parsed.endOfLifeAssessment,
    )
    setClinicalOutcomeSummary((prev) =>
      JSON.stringify(prev) === JSON.stringify(parsed.clinicalOutcomeSummary)
        ? prev
        : parsed.clinicalOutcomeSummary,
    )
    setCarePlanObjectives((prev) =>
      JSON.stringify(prev) === JSON.stringify(parsed.carePlanObjectives)
        ? prev
        : parsed.carePlanObjectives,
    )
    setAgreedGoals((prev) =>
      agreedGoalsPersistTimerRef.current || JSON.stringify(prev) === JSON.stringify(parsed.agreedGoals)
        ? prev
        : parsed.agreedGoals,
    )
    setMentalCapacityChecklist((prev) => {
      if (mentalCapacityLocalEditRef.current) return prev
      return JSON.stringify(prev) === JSON.stringify(parsed.mentalCapacityChecklist)
        ? prev
        : parsed.mentalCapacityChecklist
    })
    setPhotographyConsent((prev) =>
      JSON.stringify(prev) === JSON.stringify(parsed.photographyConsent)
        ? prev
        : parsed.photographyConsent,
    )
    setEquipmentSelection((prev) =>
      JSON.stringify(prev) === JSON.stringify(parsed.equipmentSelection)
        ? prev
        : parsed.equipmentSelection,
    )
    const storedConditions = normalizeConditionProposals(submission?.metadata?.conditionProposals)
    setConditionProposals((prev) =>
      conditionProposalsPersistTimerRef.current || JSON.stringify(prev) === JSON.stringify(storedConditions)
        ? prev
        : storedConditions,
    )
    const storedDecisions = normalizeCapacityDecisions(submission?.metadata?.capacityDecisions)
    setCapacityDecisions((prev) =>
      capacityDecisionsPersistTimerRef.current || JSON.stringify(prev) === JSON.stringify(storedDecisions)
        ? prev
        : storedDecisions,
    )
    const storedOverrides = submission?.metadata?.tabRelevanceOverrides
    setRelevanceOverrides(
      storedOverrides && typeof storedOverrides === 'object' && !Array.isArray(storedOverrides)
        ? (storedOverrides as SpecialistOverrides)
        : {},
    )
    setSectionFooters((prev) =>
      JSON.stringify(prev) === JSON.stringify(parsed.sectionFooters) ? prev : parsed.sectionFooters,
    )
    const nextAdl = parsed.adl?.rows?.length ? parsed.adl : { rows: defaultAdlRows() }
    setAdl((prev) => (adlMetadataEqual(prev, nextAdl) ? prev : nextAdl))
    setTransfers(parsed.transfers)
    setFinanceSupport(parsed.financeSupport)
    setEquipmentChecklist(parsed.equipmentChecklist)
    setDailyLivingAids(parsed.dailyLivingAids)
    setPracticalCare(parsed.practicalCare)
    setApprovedForCareStart(parsed.approvedForCareStart)
    setCareStartConditions(parsed.careStartConditions ?? '')
  }, [submission?.id, submission?.metadata, submission?.updatedAt])

  const template = templateQuery.data
  const sections = React.useMemo(
    () => template?.sections ?? EMPTY_SECTIONS,
    [template?.sections],
  )
  const sectionsHydrationKey = React.useMemo(
    () => `${template?.id ?? ''}:${sections.length}`,
    [template?.id, sections.length],
  )

  React.useEffect(() => {
    dirtyAnswerQuestionIdsRef.current.clear()
    answersHydratedRef.current = false
    skipAutosaveRef.current = true
  }, [submissionId])

  React.useEffect(() => {
    if (!answersQuery.data) return
    skipAutosaveRef.current = true
    const map = draftAnswersFromServerRows(answersQuery.data)
    serverBaselineAnswersRef.current = map
    const submissionEditable = isEditableInitialAssessmentStatus(submission?.status)
    const prefill = buildPrefillMap({
      detail: detailQuery.data,
      domCare: domCareQuery.data,
      lookups: suLookupsQuery.data,
      allergiesSummary: allergiesQuery.isSuccess
        ? formatAllergiesAssessmentText(allergiesQuery.data ?? [])
        : undefined,
    })
    const merged =
      submissionEditable && sections.length > 0 && prefill.size > 0
        ? applyPrefillToDraftAnswers(sections, map, prefill)
        : map
    const { answers: gateSynced } = syncDerivedConcernGates(sections, merged)
    const hoistSynced = syncHoistFromMovingHandling(
      sections,
      gateSynced,
      movingHandlingOperations,
    )
    const isFirstHydration = !answersHydratedRef.current

    setDraftAnswers((prev) => {
      let next: Record<string, InitialAssessmentAnswerInput>
      if (isFirstHydration) {
        next = hoistSynced
      } else {
        // Preserve locally-edited (dirty) AND in-memory demo-filled answers so a refetch does
        // not clobber values the user has not saved yet.
        const preserveIds = new Set<string>([
          ...dirtyAnswerQuestionIdsRef.current,
          ...demoFilledQuestionIdsRef.current,
        ])
        if (!preserveIds.size) {
          next = hoistSynced
        } else {
          const mergedLocal = { ...hoistSynced }
          for (const id of preserveIds) {
            if (prev[id]) mergedLocal[id] = prev[id]
          }
          next = syncHoistFromMovingHandling(
            sections,
            syncDerivedConcernGates(sections, mergedLocal).answers,
            movingHandlingOperations,
          )
        }
      }
      return draftAnswersEqual(prev, next) ? prev : next
    })

    answersHydratedRef.current = true
    const t = window.setTimeout(() => {
      skipAutosaveRef.current = false
      // A pending autosave was cancelled while this refetch was applied: schedule it again.
      if (dirtyAnswerQuestionIdsRef.current.size) setAutosaveNudge((n) => n + 1)
    }, 0)
    return () => window.clearTimeout(t)
  }, [
    answersQuery.dataUpdatedAt,
    answersQuery.data?.length,
    detailQuery.dataUpdatedAt,
    domCareQuery.dataUpdatedAt,
    allergiesQuery.dataUpdatedAt,
    sectionsHydrationKey,
    submission?.status,
    movingHandlingOperations,
  ])
  const waterlowExcludedIds = React.useMemo(() => waterlowTemplateQuestionIds(sections), [sections])
  const mustExcludedIds = React.useMemo(() => mustTemplateQuestionIds(sections), [sections])
  const hubTabExcludedIds = React.useMemo(() => {
    const ids = new Set<string>([...waterlowExcludedIds, ...mustExcludedIds])
    return ids
  }, [waterlowExcludedIds, mustExcludedIds])
  const painPanelExcludedIds = React.useMemo(() => painPanelTemplateQuestionIds(sections), [sections])
  const currentHolisticTab =
    holisticTabById(activeHolisticTab) ?? HOLISTIC_ASSESSMENT_TABS[0]!
  const currentSection = sections.find(
    (s) => s.sectionNumber === currentHolisticTab.enterpriseSection,
  )
  const editable = isEditableInitialAssessmentStatus(submission?.status)

  const isAssessmentWorkspaceLoading = React.useMemo(() => {
    if (!selectedId) return false
    if (submissionsQuery.isLoading) return true
    if (!submissionId) return false

    const needsTemplate =
      hubTab === 'form' ||
      hubTab === 'waterlow' ||
      hubTab === 'compare' ||
      hubTab === 'versions'

    if (needsTemplate && templateQuery.isLoading) return true

    if (hubTab === 'form' && answersQuery.isLoading) return true

    return false
  }, [
    selectedId,
    submissionsQuery.isLoading,
    submissionId,
    templateQuery.isLoading,
    hubTab,
    answersQuery.isLoading,
  ])

  const section12FinanceRequired = React.useMemo(() => {
    const sec12 = sections.find((s) => s.sectionNumber === 12)
    const q = sec12?.questions.find((x) => x.questionText.toLowerCase().includes('finance support required'))
    return q ? isYesAnswer(draftAnswers[q.id]) : false
  }, [sections, draftAnswers])

  const section12EquipmentVisible = React.useMemo(() => {
    const sec12 = sections.find((s) => s.sectionNumber === 12)
    if (!sec12) return false
    const hoistSling = sec12.questions.find(
      (x) =>
        x.metadata?.fieldKey === 'usesHoistOrSling' ||
        x.questionText.toLowerCase().includes('uses hoist or sling'),
    )
    const equipmentSelected = Boolean(equipmentSelection.selectedEquipment?.trim())
    return (hoistSling ? isYesAnswer(draftAnswers[hoistSling.id]) : false) || equipmentSelected
  }, [sections, draftAnswers, equipmentSelection.selectedEquipment])

  const financeConsentQuestion = React.useMemo(() => {
    const sec12 = sections.find((s) => s.sectionNumber === 12)
    return sec12?.questions.find((x) => x.questionText.toLowerCase().includes('finance support consent'))
  }, [sections])

  const progressContext = React.useMemo((): SectionProgressContext => {
    return {
      hubTabExcludedIds,
      financeConsentQuestion,
      financeSupportVisible: section12FinanceRequired,
      waterlow,
      adl,
      transfers,
      equipmentChecklist,
      equipmentChecklistVisible: section12EquipmentVisible,
      dailyLivingAids,
      financeSupport,
      practicalCare,
    }
  }, [
    hubTabExcludedIds,
    financeConsentQuestion,
    section12FinanceRequired,
    waterlow,
    adl,
    transfers,
    equipmentChecklist,
    section12EquipmentVisible,
    dailyLivingAids,
    financeSupport,
    practicalCare,
  ])

  const screeningSyncedMentalCapacityChecklist = React.useMemo(
    () => syncMentalCapacityChecklistFromScreening(mentalCapacityChecklist, sections, draftAnswers),
    [mentalCapacityChecklist, sections, draftAnswers],
  )

  // Specialist / conditional assessments: Required / Suggested / Not needed / Screening pending from
  // the Core IA screening answers, with any audited override applied.
  const specialistRelevanceByTab = React.useMemo(() => {
    const ctx = { sections, answers: draftAnswers, waterlow, mustAssessment, adl, movingHandlingOperations }
    const inputs = specialistInputsFromAssessment(ctx)
    const map = new Map<number, NonNullable<ReturnType<typeof specialistRelevance>>>()
    for (const tab of HOLISTIC_ASSESSMENT_TABS) {
      if (tab.group !== 'specialist') continue
      const relevance = specialistRelevance(tab.id, ctx, relevanceOverrides, inputs)
      if (relevance) map.set(tab.id, relevance)
    }
    return map
  }, [sections, draftAnswers, waterlow, mustAssessment, adl, movingHandlingOperations, relevanceOverrides])

  const specialistStatusByTab = React.useMemo(
    () => new Map([...specialistRelevanceByTab].map(([id, r]) => [id, r.status] as const)),
    [specialistRelevanceByTab],
  )
  const specialistRequiredCount = React.useMemo(
    () => [...specialistStatusByTab.values()].filter((s) => s === 'required').length,
    [specialistStatusByTab],
  )
  const specialistTriggerNoteMap = React.useMemo(
    () => specialistTriggerNotes(sections, draftAnswers, specialistStatusByTab),
    [sections, draftAnswers, specialistStatusByTab],
  )

  const specialistBlocks = React.useMemo(
    () =>
      specialistRequiredBlocks(specialistRelevanceByTab, {
        10: isPainToolComplete(painAssessment),
        7: isMustScoringComplete(mustAssessment),
        4: skinIntegrityCheckHasEntries(skinIntegrityCheck),
        5: isWaterlowAllSectionsComplete(waterlow),
        8: isFallsScreeningComplete(fallsScreening),
        9: isMovingHandlingOperationsComplete(movingHandlingOperations),
        6: isEquipmentSelectionComplete(equipmentSelection),
        13: isAdvanceCarePlanningComplete(advanceCarePlanning),
        14: isEndOfLifeAssessmentComplete(endOfLifeAssessment),
        17: isMentalCapacityChecklistComplete(screeningSyncedMentalCapacityChecklist),
      }),
    [
      specialistRelevanceByTab,
      painAssessment,
      mustAssessment,
      skinIntegrityCheck,
      waterlow,
      fallsScreening,
      movingHandlingOperations,
      equipmentSelection,
      advanceCarePlanning,
      endOfLifeAssessment,
      screeningSyncedMentalCapacityChecklist,
    ],
  )

  const clientValidation = React.useMemo(
    () =>
      getSubmitValidationIssues({
        sections,
        draftAnswers,
        waterlow,
        adl,
        environmentAssessment,
        agreedGoals,
        status: submission?.status,
        agencySettings,
        progressContext,
        specialistBlocks,
        capacityDecisions,
      }),
    [
      capacityDecisions,
      sections,
      draftAnswers,
      waterlow,
      adl,
      environmentAssessment,
      agreedGoals,
      submission?.status,
      agencySettings,
      progressContext,
      specialistBlocks,
    ],
  )

  const vitalsFieldErrors = React.useMemo(
    () => buildVitalsValidationErrors(sections, draftAnswers, vitalAcceptedRanges),
    [sections, draftAnswers, vitalAcceptedRanges],
  )

  const validation = {
    ...(validateQuery.data ?? clientValidation),
    canSubmitIncomplete:
      (validateQuery.data ?? clientValidation).canSubmitIncomplete ??
      clientValidation.canSubmitIncomplete,
  }
  const validationMaps = React.useMemo(() => {
    const base = buildValidationMaps({
      sections,
      blocks: validation.blocks,
      warnings: validation.warnings,
      draftAnswers,
      editable,
      progressContext,
      revealFieldErrors: validationRevealed,
    })
    if (validationRevealed && vitalsFieldErrors.size > 0) {
      const merged = new Map(base.questionErrors)
      for (const [id, msg] of vitalsFieldErrors) merged.set(id, msg)
      return { ...base, questionErrors: merged }
    }
    return base
  }, [
    sections,
    validation.blocks,
    validation.warnings,
    draftAnswers,
    editable,
    vitalsFieldErrors,
    progressContext,
    validationRevealed,
  ])

  const visibleQuestionsBySection = React.useMemo(() => {
    const map = new Map<number, InitialAssessmentQuestion[]>()
    const opts = {
      hubTabExcludedIds,
      financeConsentQuestion,
      financeSupportVisible: section12FinanceRequired,
    }
    for (const sec of sections) {
      map.set(
        sec.sectionNumber,
        getVisibleSectionQuestions(sec, sections, draftAnswers, opts),
      )
    }
    return map
  }, [
    sections,
    draftAnswers,
    hubTabExcludedIds,
    financeConsentQuestion,
    section12FinanceRequired,
  ])

  // Raw status = real completion; the specialist rules are applied on top (see below).
  const holisticTabNavStatusInput = React.useMemo(
    () => ({
        tabs: HOLISTIC_ASSESSMENT_TABS,
        sections,
        visibleQuestionsBySection,
        draftAnswers,
        progressContext,
        sectionBlocks: validationMaps.sectionBlocks,
        sectionWarnings: validationMaps.sectionWarnings,
        questionErrors: validationMaps.questionErrors,
        revealFieldErrors: validationRevealed,
        waterlowComplete: isWaterlowAllSectionsComplete(waterlow),
        painToolComplete: isPainToolComplete(painAssessment),
        skinIntegrityCheckComplete: skinIntegrityCheckHasEntries(skinIntegrityCheck),
        mustToolComplete: isMustScoringComplete(mustAssessment),
        fallsScreeningComplete: isFallsScreeningComplete(fallsScreening),
        movingHandlingComplete: isMovingHandlingOperationsComplete(movingHandlingOperations),
        therapyMemoireComplete: isTherapyAideMemoireComplete(painAssessment.therapyAideMemoire),
        environmentAssessmentComplete: isEnvironmentAssessmentComplete(environmentAssessment),
        advanceCarePlanningComplete: isAdvanceCarePlanningComplete(advanceCarePlanning),
        endOfLifeAssessmentComplete: isEndOfLifeAssessmentComplete(endOfLifeAssessment),
        clinicalOutcomeSummaryComplete:
          isClinicalAssessmentOutcomeSummaryComplete(clinicalOutcomeSummary),
        carePlanObjectivesComplete:
          isCarePlanObjectivesComplete(
            carePlanObjectives,
            carePlanVisitIdsFromSections(sections, draftAnswers, carePlanObjectives),
          ) && hasAgreedGoal(agreedGoals),
        mentalCapacityChecklistComplete: isMentalCapacityChecklistComplete(screeningSyncedMentalCapacityChecklist),
        photographyConsentComplete: isIaPhotographyConsentComplete(photographyConsent),
        equipmentSelectionComplete: isEquipmentSelectionComplete(equipmentSelection),
      }),
    [
      sections,
      visibleQuestionsBySection,
      draftAnswers,
      progressContext,
      validationMaps.sectionBlocks,
      validationMaps.sectionWarnings,
      validationMaps.questionErrors,
      validationRevealed,
      waterlow,
      painAssessment,
      skinIntegrityCheck,
      mustAssessment,
      fallsScreening,
      movingHandlingOperations,
      environmentAssessment,
      advanceCarePlanning,
      endOfLifeAssessment,
      clinicalOutcomeSummary,
      carePlanObjectives,
      agreedGoals,
      screeningSyncedMentalCapacityChecklist,
      photographyConsent,
      equipmentSelection,
    ],
  )
  const rawHolisticTabNavStatus = React.useMemo(
    () => buildHolisticTabNavStatus({ ...holisticTabNavStatusInput, editable }),
    [holisticTabNavStatusInput, editable],
  )
  /** Real completion, also on a read-only (submitted / reviewed) IA where the nav shows every tab as ok. */
  const holisticTabCompletionStatus = React.useMemo(
    () =>
      editable
        ? rawHolisticTabNavStatus
        : buildHolisticTabNavStatus({ ...holisticTabNavStatusInput, editable: true }),
    [editable, rawHolisticTabNavStatus, holisticTabNavStatusInput],
  )

  const holisticTabNavStatus = React.useMemo(
    () => applySpecialistNavStatus(rawHolisticTabNavStatus, specialistStatusByTab),
    [rawHolisticTabNavStatus, specialistStatusByTab],
  )

  React.useEffect(() => {
    if (submitModalOpen) setValidationRevealed(true)
  }, [submitModalOpen])

  React.useEffect(() => {
    setValidationRevealed(false)
  }, [submissionId])

  const goToHolisticTab = React.useCallback(
    (tabId: number) => {
      if (tabId === activeHolisticTab && pendingHolisticTab == null) return
      if (tabSwitchTimerRef.current != null) {
        clearTimeout(tabSwitchTimerRef.current)
        tabSwitchTimerRef.current = null
      }
      setPendingHolisticTab(tabId)
      // Let the loading UI paint before the heavy section commit freezes the main thread.
      tabSwitchTimerRef.current = setTimeout(() => {
        tabSwitchTimerRef.current = null
        setActiveSection(tabId)
      }, 40)
    },
    [activeHolisticTab, pendingHolisticTab, setActiveSection],
  )

  React.useEffect(() => {
    if (pendingHolisticTab == null) return
    if (activeHolisticTab !== pendingHolisticTab) return
    let cancelled = false
    const clearLoading = () => {
      if (!cancelled) setPendingHolisticTab(null)
    }
    const outer = requestAnimationFrame(() => {
      requestAnimationFrame(clearLoading)
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(outer)
    }
  }, [activeHolisticTab, pendingHolisticTab])

  React.useEffect(() => {
    return () => {
      if (tabSwitchTimerRef.current != null) clearTimeout(tabSwitchTimerRef.current)
    }
  }, [])

  const goToWaterlowTab = React.useCallback(() => {
    goToHolisticTab(5)
  }, [goToHolisticTab])

  const goToSkinIntegrityCheckTab = React.useCallback(() => {
    goToHolisticTab(4)
  }, [goToHolisticTab])

  const goToEnvironmentAssessmentTab = React.useCallback(() => {
    goToHolisticTab(12)
  }, [goToHolisticTab])

  const goToFallsScreeningTab = React.useCallback(() => {
    goToHolisticTab(8)
  }, [goToHolisticTab])

  const goToMcaScreeningTab = React.useCallback(() => {
    goToHolisticTab(3)
  }, [goToHolisticTab])

  const goToMustTab = React.useCallback(() => {
    goToHolisticTab(7)
  }, [goToHolisticTab])

  const goToPersonalDetailsTab = React.useCallback(() => {
    goToHolisticTab(1)
  }, [goToHolisticTab])

  const goToEndOfLifeTab = React.useCallback(() => {
    goToHolisticTab(14)
  }, [goToHolisticTab])

  const goToAdvanceCarePlanningTab = React.useCallback(() => {
    goToHolisticTab(13)
  }, [goToHolisticTab])

  const goToInfectionControlTab = React.useCallback(() => {
    goToHolisticTab(21)
  }, [goToHolisticTab])

  /** Validation banners pass enterprise § numbers — map to the matching holistic tab. */
  const goToSection = React.useCallback(
    (sectionNumber: number, message = '') => {
      goToHolisticTab(
        holisticTabForValidationIssue({ sectionNumber, message }, sections, visibleQuestionsBySection),
      )
    },
    [goToHolisticTab, sections, visibleQuestionsBySection],
  )

  const issueTabLabel = React.useCallback(
    (issue: ValidationIssue) =>
      holisticTabRef(holisticTabForValidationIssue(issue, sections, visibleQuestionsBySection)),
    [sections, visibleQuestionsBySection],
  )

  /** The tab a care plan trigger's question is on, else its section's tab. */
  const triggerTabId = React.useCallback(
    (trigger: InitialAssessmentFlaggedItem) =>
      HOLISTIC_ASSESSMENT_TABS.find((t) =>
        questionsForDocumentTab(t, sections, visibleQuestionsBySection).some((q) => q.id === trigger.questionId),
      )?.id ??
      holisticTabForValidationIssue(
        { sectionNumber: trigger.section?.sectionNumber ?? 1, message: '' },
        sections,
        visibleQuestionsBySection,
      ),
    [sections, visibleQuestionsBySection],
  )

  React.useEffect(() => {
    if (sections.length === 0) return
    if (!holisticTabById(activeHolisticTab)) {
      patchUrlSearch({ section: HOLISTIC_ASSESSMENT_TABS[0]!.id })
    }
  }, [sections, activeHolisticTab, patchUrlSearch])

  React.useEffect(() => {
    if (hubTab !== 'form') return
    sectionContentRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [activeHolisticTab, hubTab])

  const overallPercent = React.useMemo(
    () => overallAssessmentProgress(sections, draftAnswers, progressContext),
    [sections, draftAnswers, progressContext],
  )
  const sectionCommentCount = React.useMemo(
    () => Object.values(sectionComments).filter((c) => c?.text?.trim()).length,
    [sectionComments],
  )

  const prefillMap = React.useMemo(
    () =>
      buildPrefillMap({
        detail: detailQuery.data,
        domCare: domCareQuery.data,
        lookups: suLookupsQuery.data,
        allergiesSummary: allergiesQuery.isSuccess
          ? formatAllergiesAssessmentText(allergiesQuery.data ?? [])
          : undefined,
      }),
    [detailQuery.data, domCareQuery.data, suLookupsQuery.data, allergiesQuery.data, allergiesQuery.isSuccess],
  )

  const showBodyMapCta = React.useMemo(
    () => skinIntegrityBodyMapGateAnsweredYes(sections, draftAnswers),
    [sections, draftAnswers],
  )

  const showEmarCta = React.useMemo(() => {
    const sec9 = sections.find((s) => s.sectionNumber === 9)
    if (!sec9) return false
    return sec9.questions.some((q) => {
      const a = draftAnswers[q.id]
      const flagged = a?.checked === true || a?.booleanValue === true
      return (
        flagged &&
        (q.metadata?.emarModule === true ||
          /emar|mar \//i.test(q.questionText) ||
          q.questionText.toLowerCase().includes('administering medication'))
      )
    })
  }, [sections, draftAnswers])

  const managerReviewRequired = React.useMemo(() => {
    const meta = submission?.metadata
    if (!meta || typeof meta !== 'object') return false
    return (meta as Record<string, unknown>).managerReviewRequired === true
  }, [submission?.metadata])

  const excludeQuestionIds = React.useMemo(() => {
    const ids = new Set<string>([...hubTabExcludedIds, ...painPanelExcludedIds])
    const sec12 = sections.find((s) => s.sectionNumber === 12)
    if (sec12) {
      for (const id of section12PanelExcludedIds(sec12.questions)) {
        ids.add(id)
      }
    }
    if (section12FinanceRequired && financeConsentQuestion) {
      ids.add(financeConsentQuestion.id)
    }
    const sec14 = sections.find((s) => s.sectionNumber === 14)
    if (sec14) {
      for (const id of signOffQuestionIds(sec14.questions)) {
        ids.add(id)
      }
    }
    return ids
  }, [hubTabExcludedIds, painPanelExcludedIds, section12FinanceRequired, financeConsentQuestion, sections])

  const currentTabQuestions = React.useMemo(() => {
    const tabQuestions = questionsForDocumentTab(
      currentHolisticTab,
      sections,
      visibleQuestionsBySection,
    )
    // Tab 16 renders §14.6 / §14.8 sign-off here; do not strip them from save scope.
    if (currentHolisticTab.id === 16) return tabQuestions
    if (excludeQuestionIds.size === 0) return tabQuestions
    return tabQuestions.filter((q) => !excludeQuestionIds.has(q.id))
  }, [
    currentHolisticTab,
    sections,
    visibleQuestionsBySection,
    excludeQuestionIds,
  ])

  const demoFillQuestions = React.useMemo(
    () => demoFillQuestionsForDocumentTab(currentHolisticTab, sections),
    [currentHolisticTab, sections],
  )

  // Fill-from-transcript scope: every question on the open tab, including follow-ups that only
  // show once their gate is answered (the transcript may answer both at once).
  const transcriptFillQuestions = React.useMemo(() => {
    const allBySection = new Map(sections.map((s) => [s.sectionNumber, s.questions] as const))
    const tabQuestions = questionsForDocumentTab(currentHolisticTab, sections, allBySection)
    return excludeQuestionIds.size ? tabQuestions.filter((q) => !excludeQuestionIds.has(q.id)) : tabQuestions
  }, [currentHolisticTab, sections, excludeQuestionIds])

  // QA Demo Data: does the ACTIVE tab already hold answers or worksheet data?
  // Drives the overwrite confirm; only ever inspects the current tab, never other sections.
  const currentTabHasDemoData = React.useMemo(() => {
    if (!import.meta.env.DEV) return false
    const answered = [...currentTabQuestions, ...demoFillQuestions].some((q) => {
      const a = draftAnswers[q.id]
      if (!a) return false
      return (
        a.checked === true ||
        a.booleanValue != null ||
        (typeof a.textValue === 'string' && a.textValue.trim() !== '') ||
        a.numberValue != null ||
        (typeof a.dateValue === 'string' && a.dateValue !== '') ||
        (typeof a.timeValue === 'string' && a.timeValue !== '') ||
        (Array.isArray(a.selectedOptions) && a.selectedOptions.length > 0) ||
        (typeof a.notes === 'string' && a.notes.trim() !== '')
      )
    })
    if (answered) return true
    // Worksheet/metadata-backed tabs keep their data outside per-question answers.
    const worksheetByTab: Record<number, unknown> = {
      2: practicalCare,
      4: skinIntegrityCheck,
      5: waterlow,
      6: equipmentSelection,
      7: mustAssessment,
      8: fallsScreening,
      9: movingHandlingOperations,
      10: painAssessment,
      12: environmentAssessment,
      13: advanceCarePlanning,
      14: endOfLifeAssessment,
      15: clinicalOutcomeSummary,
      16: carePlanObjectives,
      17: screeningSyncedMentalCapacityChecklist,
      23: photographyConsent,
    }
    return worksheetHasMeaningfulValue(worksheetByTab[currentHolisticTab.id])
  }, [
    currentTabQuestions,
    demoFillQuestions,
    draftAnswers,
    currentHolisticTab.id,
    practicalCare,
    skinIntegrityCheck,
    waterlow,
    equipmentSelection,
    mustAssessment,
    fallsScreening,
    movingHandlingOperations,
    painAssessment,
    environmentAssessment,
    advanceCarePlanning,
    endOfLifeAssessment,
    clinicalOutcomeSummary,
    carePlanObjectives,
    mentalCapacityChecklist,
    photographyConsent,
  ])

  const waterlowScore = React.useMemo(() => computeWaterlowScore(waterlow), [waterlow])

  const onAnswerChange = React.useCallback(
    (questionId: string, patch: InitialAssessmentAnswerInput) => {
      dirtyAnswerQuestionIdsRef.current.add(questionId)
      answerEditCountsRef.current.set(questionId, (answerEditCountsRef.current.get(questionId) ?? 0) + 1)
      setDraftAnswers((prev) => {
        const merged: InitialAssessmentAnswerInput = {
          ...prev[questionId],
          ...patch,
          questionId,
        }
        const questionSection = sections.find((s) => s.questions.some((q) => q.id === questionId))
        const afterNoConcern = questionSection
          ? applyNoConcernLogic(questionSection, questionId, merged, prev)
          : { ...prev, [questionId]: merged }
        const { answers, syncedQuestionIds } = applyCrossFieldSync(
          sections,
          questionId,
          merged,
          afterNoConcern,
        )
        for (const id of syncedQuestionIds) syncSaveQuestionIdsRef.current.add(id)
        const gateSync = syncDerivedConcernGates(sections, answers)
        const defaults = syncCrossTabAnswerDefaults(sections, gateSync.answers)
        for (const id of [...gateSync.syncedQuestionIds, ...defaults.syncedQuestionIds]) {
          syncSaveQuestionIdsRef.current.add(id)
          dirtyAnswerQuestionIdsRef.current.add(id)
        }
        if (draftAnswersEqual(prev, defaults.answers)) return prev
        return defaults.answers
      })
    },
    [sections],
  )

  /** The open form tab, so a transcript (new or saved in attachments) can fill its fields. */
  const transcriptFillTarget: AiFillTarget = {
    tabTitle: currentHolisticTab.title,
    questions: transcriptFillQuestions,
    answers: draftAnswers,
    editable,
    onApply: (answers) => {
      for (const a of answers) onAnswerChange(a.questionId, a)
    },
  }

  // QA Demo Data (dev/QA only): merge GENERATED section values into the editable form IN MEMORY.
  // No persistence — nothing is saved, no submission is created, nothing is submitted. The user
  // reviews/edits and saves via the normal controls.
  const applyDemoDataToSection = React.useCallback(
    (tabId: number, answers: InitialAssessmentAnswerInput[], metadata: Record<string, unknown>) => {
      // 1) Answers → draft. NOT marked dirty (so the fill never auto-saves), but tracked in
      // demoFilledQuestionIdsRef so a refetch does not clobber them; a manual Save still persists
      // them because persistTabAnswers collects the tab's questions regardless of dirty state.
      if (answers.length) {
        setDraftAnswers((prev) => {
          const next = { ...prev }
          const questionsById = new Map(sections.flatMap((s) => s.questions.map((q) => [q.id, q] as const)))
          for (const a of answers) {
            if (!a?.questionId) continue
            const question = questionsById.get(a.questionId)
            if (
              question &&
              isIaDemoIdentityPrefillQuestion(question.metadata) &&
              hasAssessmentAnswer(prev[a.questionId], question)
            ) {
              continue
            }
            demoFilledQuestionIdsRef.current.add(a.questionId)
            next[a.questionId] = { ...next[a.questionId], ...a, questionId: a.questionId }
          }
          return syncDerivedConcernGates(sections, next).answers
        })
      }

      // 2) Worksheet/tool-tab metadata → the matching client state via raw setters (no persist).
      for (const [key, value] of Object.entries(metadata)) {
        switch (key) {
          case 'waterlow':
            setWaterlow(value as Parameters<typeof setWaterlow>[0])
            break
          case 'painAssessment': {
            const incoming = value as Partial<PainAssessmentMetadata>
            setPainAssessment((prev) => ({
              ...prev,
              ...incoming,
              abbey: incoming.abbey ?? prev.abbey,
              therapyAideMemoire: incoming.therapyAideMemoire
                ? {
                    ...prev.therapyAideMemoire,
                    ...(incoming.therapyAideMemoire as typeof prev.therapyAideMemoire),
                  }
                : prev.therapyAideMemoire,
            }))
            break
          }
          case 'therapyAideMemoire':
            setPainAssessment((prev) => ({
              ...prev,
              therapyAideMemoire: {
                ...prev.therapyAideMemoire,
                ...(value as NonNullable<typeof prev.therapyAideMemoire>),
              },
            }))
            break
          case 'skinIntegrityCheck':
            skinIntegrityLocalEditRef.current = true
            setSkinIntegrityCheck(value as Parameters<typeof setSkinIntegrityCheck>[0])
            break
          case 'mustAssessment':
            setMustAssessment(value as Parameters<typeof setMustAssessment>[0])
            break
          case 'fallsScreening':
            setFallsScreening(value as Parameters<typeof setFallsScreening>[0])
            break
          case 'movingHandlingOperations':
            setMovingHandlingOperations(value as Parameters<typeof setMovingHandlingOperations>[0])
            break
          case 'environmentAssessment':
            setEnvironmentAssessment(value as Parameters<typeof setEnvironmentAssessment>[0])
            break
          case 'advanceCarePlanning':
            setAdvanceCarePlanning(value as Parameters<typeof setAdvanceCarePlanning>[0])
            break
          case 'endOfLifeAssessment':
            setEndOfLifeAssessment(value as Parameters<typeof setEndOfLifeAssessment>[0])
            break
          case 'clinicalOutcomeSummary':
            setClinicalOutcomeSummary(value as Parameters<typeof setClinicalOutcomeSummary>[0])
            break
          case 'carePlanObjectives':
            setCarePlanObjectives(value as Parameters<typeof setCarePlanObjectives>[0])
            break
          case 'mentalCapacityChecklist':
            mentalCapacityLocalEditRef.current = true
            setMentalCapacityChecklist(value as Parameters<typeof setMentalCapacityChecklist>[0])
            break
          case 'photographyConsent':
            setPhotographyConsent(value as Parameters<typeof setPhotographyConsent>[0])
            break
          case 'equipmentSelection':
            setEquipmentSelection(value as Parameters<typeof setEquipmentSelection>[0])
            break
          case 'adl':
            setAdl(value as Parameters<typeof setAdl>[0])
            break
          case 'transfers':
            setTransfers(value as Parameters<typeof setTransfers>[0])
            break
          case 'financeSupport':
            setFinanceSupport(value as Parameters<typeof setFinanceSupport>[0])
            break
          case 'equipmentChecklist':
            setEquipmentChecklist(value as Parameters<typeof setEquipmentChecklist>[0])
            break
          case 'dailyLivingAids':
            setDailyLivingAids(value as Parameters<typeof setDailyLivingAids>[0])
            break
          case 'practicalCare':
            setPracticalCare(value as Parameters<typeof setPracticalCare>[0])
            break
          default:
            // sectionComments / sectionFooters are auxiliary and left untouched.
            break
        }
      }

      // 2b) Worksheet → catalogue dual-write (same helpers as live worksheet edits).
      // Do not use onAnswerChange here: that marks answers dirty and would auto-save Fill Demo.
      syncFillDemoCatalogueAnswers(
        sections,
        metadata,
        (metadata.adl as typeof adl | undefined) ?? adl,
        (nextAdl) => setAdl(nextAdl),
        (questionId, patch) => {
          demoFilledQuestionIdsRef.current.add(questionId)
          setDraftAnswers((prev) => {
            const next = {
              ...prev,
              [questionId]: { ...prev[questionId], ...patch, questionId },
            }
            return syncDerivedConcernGates(sections, next).answers
          })
        },
      )

      // 3) Mark this tab as filled (drives the nav "Demo data filled" badge).
      setDemoFilledTabs((prev) => {
        if (prev.has(tabId)) return prev
        const next = new Set(prev)
        next.add(tabId)
        return next
      })
    },
    [sections, adl],
  )

  const syncEmergencyContactFromProfile = React.useCallback(() => {
    const emergencyQ = findQuestionBySpecRef(sections, '13.3')
    if (!emergencyQ) return
    const detail = queryClient.getQueryData<ServiceUserDetail>(serviceUserKeys.profile(selectedId))
    const contacts = detail?.contacts ?? detailQuery.data?.contacts ?? []
    const hasEmergency = contacts.some((c) => c.isEmergencyContact) || contacts.length > 0
    if (!hasEmergency) return
    onAnswerChange(emergencyQ.id, {
      questionId: emergencyQ.id,
      checked: true,
      booleanValue: true,
    })
  }, [sections, detailQuery.data?.contacts, onAnswerChange, queryClient, selectedId])

  const markMedicationListVerified = React.useCallback(() => {
    const verifiedQ = sections
      .flatMap((s) => s.questions)
      .find((q) => q.questionText.toLowerCase().includes('medication list verified'))
    if (!verifiedQ) return
    onAnswerChange(verifiedQ.id, {
      questionId: verifiedQ.id,
      checked: true,
      booleanValue: true,
    })
  }, [sections, onAnswerChange])

  const persistMetadata = React.useCallback(
    async (patch: Record<string, unknown>) => {
      if (!submissionId || !editable || !canUpdate) return
      const merged = mergeMetadataPatch(submissionMetadataRef.current, patch)
      submissionMetadataRef.current = merged
      try {
        await updateSubmissionMutation.mutateAsync({ metadata: merged })
      } catch (e) {
        submissionMetadataRef.current = { ...(submission?.metadata ?? {}) }
        toastApiError(e, 'Could not save assessment notes')
        throw e
      }
    },
    [submissionId, editable, canUpdate, submission?.metadata, updateSubmissionMutation],
  )

  const currentUser = useAuthStore((st) => st.user)
  /**
   * Override a specialist tab's screening result. Downgrading a trigger needs a reason; every change
   * is kept (who, when, why, from → to) in `tabRelevanceOverrideHistory` for audit.
   */
  const onSpecialistOverride = React.useCallback(
    (tabId: number, next: SpecialistOverride['status'] | null, reason?: string) => {
      const computedStatus = specialistRelevanceByTab.get(tabId)?.computed?.status ?? null
      const at = new Date().toISOString()
      const nextOverrides: SpecialistOverrides = { ...relevanceOverrides }
      if (next) {
        nextOverrides[String(tabId)] = {
          status: next,
          ...(reason ? { reason } : {}),
          byUserId: currentUser?.id,
          byName: currentUser?.displayName,
          at,
        }
      } else {
        delete nextOverrides[String(tabId)]
      }
      const history = Array.isArray(submissionMetadataRef.current.tabRelevanceOverrideHistory)
        ? (submissionMetadataRef.current.tabRelevanceOverrideHistory as unknown[])
        : []
      setRelevanceOverrides(nextOverrides)
      void persistMetadata({
        tabRelevanceOverrides: nextOverrides,
        tabRelevanceOverrideHistory: [
          ...history,
          {
            tabId,
            from: computedStatus,
            to: next ?? 'screening',
            reason: reason ?? null,
            byUserId: currentUser?.id ?? null,
            byName: currentUser?.displayName ?? null,
            at,
          },
        ],
      })
    },
    [specialistRelevanceByTab, relevanceOverrides, currentUser, persistMetadata],
  )

  /** Prefill identity/GP/LPOA into ACP / Photography (Consent tab) when those tabs open (empty fields only). */
  const identityPrefillTabRef = React.useRef<number | null>(null)
  React.useEffect(() => {
    if (hubTab !== 'form' || sections.length === 0) return
    if (activeHolisticTab !== 13 && activeHolisticTab !== 23) {
      identityPrefillTabRef.current = null
      return
    }
    // Consent is the first tab, so it can open before answers hydrate — wait for them.
    if (!answersHydratedRef.current) return
    if (identityPrefillTabRef.current === activeHolisticTab) return
    identityPrefillTabRef.current = activeHolisticTab

    if (activeHolisticTab === 13) {
      const next = prefillAcpFromIdentityAnswers(sections, draftAnswers, advanceCarePlanning)
      if (next !== advanceCarePlanning) {
        setAdvanceCarePlanning(next)
        void persistMetadata({ advanceCarePlanning: next })
      }
    }
    if (activeHolisticTab === 23) {
      const next = prefillPhotographyFromIdentityAnswers(sections, draftAnswers, photographyConsent)
      if (next !== photographyConsent) {
        setPhotographyConsent(next)
        void persistMetadata({ photographyConsent: next })
      }
    }
  }, [
    activeHolisticTab,
    hubTab,
    sections,
    draftAnswers,
    advanceCarePlanning,
    photographyConsent,
    persistMetadata,
  ])

  const waterlowReviewSchedule = useWaterlowReviewSchedule()
  const onWaterlowChange = React.useCallback(
    (next: typeof waterlow) => {
      setWaterlow(next)
      const nextEquipment = syncWaterlowScoreToEquipment(next, equipmentSelection)
      if (nextEquipment !== equipmentSelection) {
        setEquipmentSelection(nextEquipment)
        void persistMetadata({ waterlow: next, equipmentSelection: nextEquipment })
      } else {
        void persistMetadata({ waterlow: next })
      }
      syncWaterlowCompletedAnswer(sections, next, onAnswerChange)
    },
    [sections, persistMetadata, onAnswerChange, equipmentSelection],
  )

  // Equipment Selection keeps a read-only copy of the Waterlow score / band: bring older or stale
  // copies (typed by hand before the copy became derived) back in line with the Waterlow tab.
  React.useEffect(() => {
    if (!isEditableInitialAssessmentStatus(submission?.status)) return
    const synced = syncWaterlowScoreToEquipment(waterlow, equipmentSelection)
    if (synced === equipmentSelection) return
    setEquipmentSelection(synced)
    void persistMetadata({ equipmentSelection: synced })
  }, [waterlow, equipmentSelection, submission?.status, persistMetadata])

  const onSectionFooterChange = React.useCallback(
    (sectionNumber: number, patch: { dateCompleted?: string; assessorNameDesignation?: string }) => {
      setSectionFooters((prev) => {
        const key = String(sectionNumber)
        const next = { ...prev, [key]: { ...prev[key], ...patch } }
        void persistMetadata({ sectionFooters: next })
        return next
      })
    },
    [persistMetadata],
  )

  // Specialist tools: stamp "completed on / by" when the tab opens and nothing is recorded yet
  // (editable — the assessor can change it). Never touches other tabs' saved footers.
  React.useEffect(() => {
    if (hubTab !== 'form' || !editable || !canUpdate || !answersHydratedRef.current) return
    const footerTab = holisticTabById(activeHolisticTab)
    if (footerTab?.group !== 'specialist') return
    // Only tabs that show the footer (worksheet tools keep their own completed-by fields).
    if (!['form-section', 'mca-screening', 'section12-blocks'].includes(footerTab.kind)) return
    const key = String(activeHolisticTab)
    const stored = (submission?.metadata?.sectionFooters as Record<string, { dateCompleted?: string; assessorNameDesignation?: string }> | undefined)?.[key]
    const current = sectionFooters[key]
    const patch: { dateCompleted?: string; assessorNameDesignation?: string } = {}
    if (!current?.dateCompleted && !stored?.dateCompleted) {
      patch.dateCompleted = `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`
    }
    if (!current?.assessorNameDesignation?.trim() && !stored?.assessorNameDesignation?.trim()) {
      const who =
        iaAssessorNameDesignation(sections, draftAnswers) ||
        [currentUser?.displayName, currentUser?.jobTitle].filter(Boolean).join(' — ')
      if (who) patch.assessorNameDesignation = who
    }
    if (Object.keys(patch).length) onSectionFooterChange(activeHolisticTab, patch)
  }, [
    hubTab,
    editable,
    canUpdate,
    activeHolisticTab,
    submission?.metadata,
    sectionFooters,
    sections,
    draftAnswers,
    currentUser?.displayName,
    currentUser?.jobTitle,
    onSectionFooterChange,
  ])

  const onPainAssessmentChange = React.useCallback(
    (next: PainAssessmentMetadata) => {
      const footer = sectionFooters['10']
      const stamped = stampPainAssessmentCompletion(next, {
        dateCompleted: footer?.dateCompleted || new Date().toISOString().slice(0, 10),
        assessorNameDesignation:
          footer?.assessorNameDesignation || iaAssessorNameDesignation(sections, draftAnswers),
      })
      setPainAssessment(stamped)
      void persistMetadata({ painAssessment: stamped })
      syncPainAssessmentAnswers(sections, stamped, onAnswerChange)
    },
    [sections, persistMetadata, onAnswerChange, sectionFooters, draftAnswers],
  )

  const syncSkinIntegrityFromBodyMap = React.useCallback(async () => {
    if (!selectedId || !editable || !canUpdate) return
    setSyncBodyMapLoading(true)
    try {
      const { records } = await fetchServiceUserBodyMap(selectedId, { includeResolved: false })
      const { metadata, syncedRecordCount, skippedRecordCount } = syncSkinIntegrityCheckFromBodyMap(
        skinIntegrityCheckRef.current,
        records,
      )

      if (syncedRecordCount === 0) {
        toastInfo(
          'Nothing to sync',
          records.length
            ? 'No open skin-related body map records matched a worksheet body part.'
            : 'Add markers on the body map first, then sync again.',
        )
        return
      }

      if (skinIntegrityPersistTimerRef.current) {
        clearTimeout(skinIntegrityPersistTimerRef.current)
        skinIntegrityPersistTimerRef.current = null
      }
      skinIntegrityLocalEditRef.current = true
      skinIntegrityPendingPersistRef.current = metadata
      skinIntegrityCheckRef.current = metadata
      setSkinIntegrityCheck(metadata)
      await persistMetadata({ skinIntegrityCheck: metadata })
      skinIntegrityLocalEditRef.current = false

      toastSuccess(
        'Body map synced',
        skippedRecordCount > 0
          ? `${syncedRecordCount} record${syncedRecordCount === 1 ? '' : 's'} added to the worksheet (${skippedRecordCount} skipped).`
          : `${syncedRecordCount} record${syncedRecordCount === 1 ? '' : 's'} added to the worksheet.`,
      )
    } catch (e) {
      skinIntegrityLocalEditRef.current = false
      toastApiError(e, 'Could not sync body map')
    } finally {
      setSyncBodyMapLoading(false)
    }
  }, [selectedId, editable, canUpdate, persistMetadata])

  const onSkinIntegrityRowSideChange = React.useCallback(
    (rowId: string, side: 'right' | 'left', text: string) => {
      skinIntegrityLocalEditRef.current = true
      setSkinIntegrityCheck((prev) => {
        const next: SkinIntegrityCheckMetadata = {
          rows: patchSkinIntegrityCheckRow(prev.rows, rowId, side, text),
        }
        skinIntegrityPendingPersistRef.current = next
        if (skinIntegrityPersistTimerRef.current) {
          clearTimeout(skinIntegrityPersistTimerRef.current)
        }
        skinIntegrityPersistTimerRef.current = setTimeout(() => {
          const payload = skinIntegrityPendingPersistRef.current
          if (!payload) return
          void persistMetadata({ skinIntegrityCheck: payload }).finally(() => {
            skinIntegrityLocalEditRef.current = false
          })
        }, 400)
        return next
      })
    },
    [persistMetadata],
  )

  const onMustAssessmentChange = React.useCallback(
    (next: MustMetadata) => {
      setMustAssessment(next)
      void persistMetadata({ mustAssessment: next })
      syncMustAssessmentAnswers(sections, next, onAnswerChange)
    },
    [sections, persistMetadata, onAnswerChange],
  )

  const onMovingHandlingOperationsChange = React.useCallback(
    (next: MovingHandlingOperationsMetadata) => {
      setMovingHandlingOperations(next)
      void persistMetadata({ movingHandlingOperations: next })
      setDraftAnswers((prev) => {
        const synced = syncHoistFromMovingHandling(sections, prev, next)
        return draftAnswersEqual(prev, synced) ? prev : synced
      })
    },
    [persistMetadata, sections],
  )

  const onEnvironmentAssessmentChange = React.useCallback(
    (next: EnvironmentAssessmentMetadata) => {
      setEnvironmentAssessment(next)
      void persistMetadata({ environmentAssessment: next })
      syncEnvPetsToSection3(sections, next.pets, draftAnswers, onAnswerChange)
    },
    [persistMetadata, sections, draftAnswers, onAnswerChange],
  )

  // Lone-worker factors the system already knows (visit plan, DOM Care, SOS, incidents): shown as
  // hints and used to answer unanswered factors when the Environment tab opens.
  const loneWorkerFactsQuery = useLoneWorkerSystemFacts(selectedId, hubTab === 'form' && activeHolisticTab === 12)
  // Legal authority register — which verified authority (if any) covers each capacity decision (MCA tab).
  const legalAuthoritiesQuery = useServiceUserDocuments(selectedId, hubTab === 'form' && activeHolisticTab === 3)
  const loneWorkerFacts = React.useMemo(
    () => loneWorkerFactsByFactor(loneWorkerFactsQuery.data),
    [loneWorkerFactsQuery.data],
  )
  const loneWorkerFactorHints = React.useMemo(() => {
    const hints: Partial<Record<EnvironmentAssessmentLoneWorkerFactorId, string>> = {}
    for (const [id, fact] of Object.entries(loneWorkerFacts)) {
      hints[id as EnvironmentAssessmentLoneWorkerFactorId] = `System: ${fact.note}`
    }
    if (substanceMisuseImpliedByAnswers(sections, draftAnswers)) {
      hints.substanceMisuse =
        'Personal Details records alcohol / drug use — answer Yes only if it has affected staff safety.'
    }
    return hints
  }, [loneWorkerFacts, sections, draftAnswers])
  React.useEffect(() => {
    if (!editable || !canUpdate || activeHolisticTab !== 12 || !loneWorkerFactsQuery.data) return
    const next = fillLoneWorkerFactorsFromFacts(environmentAssessment, loneWorkerFacts, (id) =>
      ENVIRONMENT_ASSESSMENT_LONE_WORKER_FACTORS.find((f) => f.id === id)!.detailsKey,
    )
    if (next === environmentAssessment) return
    setEnvironmentAssessment(next)
    void persistMetadata({ environmentAssessment: next })
  }, [
    editable,
    canUpdate,
    activeHolisticTab,
    loneWorkerFactsQuery.data,
    loneWorkerFacts,
    environmentAssessment,
    persistMetadata,
  ])

  const onAdvanceCarePlanningChange = React.useCallback(
    (next: AdvanceCarePlanningMetadata) => {
      setAdvanceCarePlanning(next)
      void persistMetadata({ advanceCarePlanning: next })
    },
    [persistMetadata],
  )

  const onEndOfLifeAssessmentChange = React.useCallback(
    (next: EndOfLifeAssessmentMetadata) => {
      setEndOfLifeAssessment(next)
      void persistMetadata({ endOfLifeAssessment: next })
      syncDnacprFromEndOfLife(sections, next, onAnswerChange)
    },
    [persistMetadata, sections, onAnswerChange],
  )

  const onClinicalOutcomeSummaryChange = React.useCallback(
    (next: ClinicalAssessmentOutcomeSummaryMetadata) => {
      setClinicalOutcomeSummary(next)
      void persistMetadata({ clinicalOutcomeSummary: next })
    },
    [persistMetadata],
  )

  // Waterlow follow-up: fill empty recommendation / by whom / date / next review (from the API's Waterlow schedule) once scored.
  React.useEffect(() => {
    if (!editable || !canUpdate) return
    if (hubTab !== 'waterlow' && !(hubTab === 'form' && activeHolisticTab === 5)) return
    const dateQ = findQuestionByFieldKey(sections, 'assessmentDate')
    const answered = dateQ ? draftAnswers[dateQ.id]?.dateValue : undefined
    const today = new Date()
    const localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const patch = waterlowFollowUpPrefill(waterlow, {
      assessorName: currentUser?.displayName,
      assessmentDate: answered || localToday,
      reviewSchedule: waterlowReviewSchedule,
    })
    if (patch) onWaterlowChange({ ...waterlow, ...patch })
  }, [editable, canUpdate, hubTab, activeHolisticTab, sections, draftAnswers, waterlow, currentUser?.displayName, onWaterlowChange, waterlowReviewSchedule])

  // Outcome summary: fill empty "initial" cells from the worksheets and baseline vitals (fill-empty).
  React.useEffect(() => {
    if (!editable || !canUpdate || activeHolisticTab !== 15) return
    const answerOf = (key: string) => {
      const q = findQuestionByFieldKey(sections, key)
      return q ? { q, a: draftAnswers[q.id] } : null
    }
    const numberOf = (key: string): number | null => {
      const a = answerOf(key)?.a
      const n = a?.numberValue ?? (a?.textValue?.trim() ? Number(a.textValue) : undefined)
      return typeof n === 'number' && Number.isFinite(n) ? n : null
    }
    const rhythm = answerOf('pulseRhythm')
    const rhythmRaw = rhythm?.a?.selectedOptions
    const rhythmValue = Array.isArray(rhythmRaw) ? rhythmRaw[0] : rhythmRaw
    const values = autoOutcomeValues({
      waterlow,
      must: mustAssessment,
      pain: painAssessment,
      movingHandlingComplete: isMovingHandlingOperationsComplete(movingHandlingOperations),
      skinRecorded: skinIntegrityCheckHasEntries(skinIntegrityCheck),
      vitals: {
        bpSystolic: numberOf('bpSystolic'),
        bpDiastolic: numberOf('bpDiastolic'),
        pulse: numberOf('pulse'),
        pulseRhythm:
          typeof rhythmValue === 'string' && rhythm ? labelForQuestionOptionValue(rhythmValue, rhythm.q) : null,
        spo2: numberOf('spo2'),
        respirations: numberOf('respirations'),
        temperature: numberOf('temperature'),
      },
    })
    const next = fillOutcomeSummaryFromAssessment(clinicalOutcomeSummary, values, {
      assessmentDate: new Date().toISOString().slice(0, 10),
      practitioner: currentUser?.displayName,
    })
    if (next !== clinicalOutcomeSummary) onClinicalOutcomeSummaryChange(next)
  }, [
    editable,
    canUpdate,
    activeHolisticTab,
    sections,
    draftAnswers,
    waterlow,
    mustAssessment,
    painAssessment,
    movingHandlingOperations,
    skinIntegrityCheck,
    clinicalOutcomeSummary,
    currentUser?.displayName,
    onClinicalOutcomeSummaryChange,
  ])

  const onCarePlanObjectivesChange = React.useCallback(
    (next: CarePlanObjectivesMetadata) => {
      setCarePlanObjectives(next)
      void persistMetadata({ carePlanObjectives: next })
    },
    [persistMetadata],
  )

  const onConditionProposalsChange = React.useCallback(
    (next: ConditionProposal[]) => {
      setConditionProposals(next)
      if (conditionProposalsPersistTimerRef.current) clearTimeout(conditionProposalsPersistTimerRef.current)
      conditionProposalsPersistTimerRef.current = setTimeout(() => {
        conditionProposalsPersistTimerRef.current = null
        void persistMetadata({ conditionProposals: next })
      }, AUTOSAVE_MS)
    },
    [persistMetadata],
  )

  const onCapacityDecisionsChange = React.useCallback(
    (next: CapacityDecisionRecord[]) => {
      setCapacityDecisions(next)
      if (capacityDecisionsPersistTimerRef.current) clearTimeout(capacityDecisionsPersistTimerRef.current)
      capacityDecisionsPersistTimerRef.current = setTimeout(() => {
        capacityDecisionsPersistTimerRef.current = null
        void persistMetadata({ capacityDecisions: next })
      }, AUTOSAVE_MS)
    },
    [persistMetadata],
  )

  // Old IAs recorded one global MCA screening (§2.mca); they keep it until a decision record is added.
  const legacyCapacityScreeningAnswered = React.useMemo(
    () =>
      sections.some((sec) =>
        sec.questions.some((q) => {
          if (q.metadata?.specRef !== MCA_SCREENING_SPEC_REF) return false
          const a = draftAnswers[q.id]
          if (!a) return false
          if (typeof a.booleanValue === 'boolean' || typeof a.checked === 'boolean') return true
          const opts = a.selectedOptions
          if (Array.isArray(opts) ? opts.length > 0 : typeof opts === 'string' && opts !== '') return true
          return Boolean(a.textValue?.replace(/<[^>]*>/g, '').trim())
        }),
      ),
    [sections, draftAnswers],
  )
  const legacyCapacityScreening = usesLegacyCapacityScreening(capacityDecisions, legacyCapacityScreeningAnswered)

  /** Required / Suggested specialist assessments that are done — shown as "Completed" in the nav. */
  const specialistCompleteTabs = React.useMemo(() => {
    const done = new Set<number>()
    for (const [tabId, status] of specialistStatusByTab) {
      if (status !== 'required' && status !== 'suggested') continue
      if (holisticTabCompletionStatus.get(tabId) !== 'ok') continue
      // MCA: a decision-specific record (or the old global screening on legacy IAs).
      if (
        tabId === 3 &&
        !(legacyCapacityScreeningAnswered || capacityDecisions.some(isCapacityDecisionComplete))
      ) {
        continue
      }
      done.add(tabId)
    }
    return done
  }, [specialistStatusByTab, holisticTabCompletionStatus, legacyCapacityScreeningAnswered, capacityDecisions])
  const specialistOutstandingRequiredCount = [...specialistStatusByTab].filter(
    ([tabId, status]) => status === 'required' && !specialistCompleteTabs.has(tabId),
  ).length

  /** Read-only whole-assessment overview for the outcome summary tab. */
  const assessmentSummary = React.useMemo(
    () =>
      buildAssessmentSummary({
        sections,
        answers: draftAnswers,
        specialists: HOLISTIC_ASSESSMENT_TABS.filter((tab) => tab.group === 'specialist').flatMap((tab) => {
          const status = specialistStatusByTab.get(tab.id)
          return status
            ? [{ tabId: tab.id, title: tab.title, status, completed: specialistCompleteTabs.has(tab.id) }]
            : []
        }),
        capacityDecisions,
        goals: (agreedGoals.goals ?? []).map((g) => g.goal ?? ''),
        conditions: conditionProposals.map((c) => c.conditionName ?? ''),
      }),
    [sections, draftAnswers, specialistStatusByTab, specialistCompleteTabs, capacityDecisions, agreedGoals, conditionProposals],
  )
  const capacityNeeds = React.useMemo(() => {
    const inputs = specialistInputsFromAssessment({ sections, answers: draftAnswers })
    return capacityDecisionNeeds({
      capacityDoubt: inputs.capacityDoubt,
      covertMedication: inputs.covertMedication,
      dolRestrictions: inputs.dolRestrictions,
      dolConcern: inputs.dolConcern,
    })
  }, [sections, draftAnswers])

  const onAgreedGoalsChange = React.useCallback(
    (next: AgreedGoalsMetadata) => {
      setAgreedGoals(next)
      if (agreedGoalsPersistTimerRef.current) clearTimeout(agreedGoalsPersistTimerRef.current)
      agreedGoalsPersistTimerRef.current = setTimeout(() => {
        agreedGoalsPersistTimerRef.current = null
        void persistMetadata({ agreedGoals: next })
      }, AUTOSAVE_MS)
    },
    [persistMetadata],
  )

  /** Goal #1 starts from §1.3 "What do they want support to achieve?" the first time the final tab opens. */
  React.useEffect(() => {
    if (hubTab !== 'form' || activeHolisticTab !== 16) return
    if (!editable || !canUpdate || !answersHydratedRef.current) return
    const supportGoalsQ = findQuestionByFieldKey(sections, 'supportGoals')
    const text = supportGoalsQ ? draftAnswers[supportGoalsQ.id]?.textValue : undefined
    const next = prefillFirstGoalFromSupportGoals(agreedGoals, text)
    if (next === agreedGoals) return
    setAgreedGoals(next)
    void persistMetadata({ agreedGoals: next })
  }, [hubTab, activeHolisticTab, editable, canUpdate, sections, draftAnswers, agreedGoals, persistMetadata])

  const scheduleMentalCapacityPersist = React.useCallback(
    (payload: MentalCapacityChecklistMetadata, immediate: boolean) => {
      mentalCapacityPendingPersistRef.current = payload
      const generation = ++mentalCapacityPersistGenerationRef.current

      if (mentalCapacityPersistTimerRef.current) {
        clearTimeout(mentalCapacityPersistTimerRef.current)
        mentalCapacityPersistTimerRef.current = null
      }

      const runPersist = () => {
        const toSave = mentalCapacityPendingPersistRef.current
        if (!toSave) return
        void persistMetadata({ mentalCapacityChecklist: toSave }).finally(() => {
          if (mentalCapacityPersistGenerationRef.current !== generation) return
          if (mentalCapacityPendingPersistRef.current !== toSave) return
          mentalCapacityLocalEditRef.current = false
        })
      }

      if (immediate) {
        runPersist()
        return
      }

      mentalCapacityPersistTimerRef.current = setTimeout(() => {
        mentalCapacityPersistTimerRef.current = null
        runPersist()
      }, 400)
    },
    [persistMetadata],
  )

  const onMentalCapacityChecklistChange = React.useCallback(
    (
      updater:
        | MentalCapacityChecklistMetadata
        | ((prev: MentalCapacityChecklistMetadata) => MentalCapacityChecklistMetadata),
      options?: { immediate?: boolean },
    ) => {
      mentalCapacityLocalEditRef.current = true
      const edited =
        typeof updater === 'function' ? updater(mentalCapacityChecklistRef.current) : updater
      // Rows 1–6 always mirror the Tab 3 screening answers.
      const next = syncMentalCapacityChecklistFromScreening(edited, sections, draftAnswers)
      mentalCapacityChecklistRef.current = next
      setMentalCapacityChecklist(next)
      scheduleMentalCapacityPersist(next, options?.immediate ?? false)
    },
    [scheduleMentalCapacityPersist, sections, draftAnswers],
  )

  /** Opening the checklist tab writes the mirrored screening answers so exports/promotion see them. */
  React.useEffect(() => {
    if (hubTab !== 'form' || activeHolisticTab !== 17) return
    if (!editable || !canUpdate || !answersHydratedRef.current) return
    if (screeningSyncedMentalCapacityChecklist === mentalCapacityChecklist) return
    mentalCapacityChecklistRef.current = screeningSyncedMentalCapacityChecklist
    setMentalCapacityChecklist(screeningSyncedMentalCapacityChecklist)
    scheduleMentalCapacityPersist(screeningSyncedMentalCapacityChecklist, true)
  }, [
    hubTab,
    activeHolisticTab,
    editable,
    canUpdate,
    screeningSyncedMentalCapacityChecklist,
    mentalCapacityChecklist,
    scheduleMentalCapacityPersist,
  ])

  const onPhotographyConsentChange = React.useCallback(
    (next: PhotographyConsentMetadata) => {
      setPhotographyConsent(next)
      void persistMetadata({ photographyConsent: next })
    },
    [persistMetadata],
  )

  const onEquipmentSelectionChange = React.useCallback(
    (next: EquipmentSelectionMetadata) => {
      setEquipmentSelection(next)
      void persistMetadata({ equipmentSelection: next })
    },
    [persistMetadata],
  )

  const onFallsScreeningChange = React.useCallback(
    (next: FallsScreeningMetadata) => {
      setFallsScreening(next)
      const nextMh = syncFallsToMovingHandling(next, movingHandlingOperations)
      if (nextMh !== movingHandlingOperations) {
        setMovingHandlingOperations(nextMh)
      }
      syncFallsScreeningDerivedState(
        sections,
        next,
        adl,
        (nextAdl) => {
          setAdl(nextAdl)
          void persistMetadata({
            fallsScreening: next,
            adl: nextAdl,
            ...(nextMh !== movingHandlingOperations
              ? { movingHandlingOperations: nextMh }
              : {}),
          })
        },
        onAnswerChange,
      )
    },
    [sections, adl, persistMetadata, onAnswerChange, movingHandlingOperations],
  )

  const resolveSectionCommentText = React.useCallback((holisticTabId: number): string => {
    const key = String(holisticTabId)
    const host = document.getElementById(`ia-sec-comment-${holisticTabId}`)
    const fromDom = readInitialAssessmentTextareaValue(host)
    if (plainTextFromHtml(fromDom)) return fromDom
    const fromDraft = sectionCommentDraftRef.current[key]
    if (fromDraft != null) return fromDraft
    return sectionComments[key]?.text ?? ''
  }, [sectionComments])

  const persistSectionComment = React.useCallback(
    async (holisticTabId: number, text: string) => {
      const key = String(holisticTabId)
      const entry = plainTextFromHtml(text) ? { text } : undefined
      sectionCommentDraftRef.current[key] = text
      setSectionComments((prev) => {
        const next = { ...prev }
        if (entry) next[key] = entry
        else delete next[key]
        return next
      })
      // Saving on a tab also clears any comment left under a retired alias id (e.g. photography 18 → 23).
      const retiredKeys = Object.fromEntries(
        retiredHolisticTabIdsFor(holisticTabId).map((id) => [String(id), '']),
      )
      try {
        await persistMetadata({
          sectionComments: { ...retiredKeys, [key]: entry ?? '' },
          sectionCommentsKeyedByHolisticTab: true,
        })
      } finally {
        if (!saveSectionInProgressRef.current) {
          sectionCommentsLocalEditRef.current = false
        }
      }
    },
    [persistMetadata],
  )

  const flushHolisticTabMetadata = React.useCallback(async () => {
    const tab = currentHolisticTab
    const patch: Record<string, unknown> = {}

    switch (tab.kind) {
      case 'waterlow':
        patch.waterlow = waterlow
        break
      case 'pain-tool':
      case 'therapy-memoire':
        patch.painAssessment = painAssessment
        break
      case 'skin-integrity-check':
        patch.skinIntegrityCheck = skinIntegrityCheck
        break
      case 'equipment-selection':
        patch.equipmentSelection = equipmentSelection
        break
      case 'must-tool':
        patch.mustAssessment = mustAssessment
        break
      case 'falls-screening':
        patch.fallsScreening = fallsScreening
        break
      case 'moving-handling':
        patch.movingHandlingOperations = movingHandlingOperations
        break
      case 'environment-assessment':
        patch.environmentAssessment = environmentAssessment
        break
      case 'advance-care-planning':
        patch.advanceCarePlanning = advanceCarePlanning
        break
      case 'end-of-life-assessment':
        patch.endOfLifeAssessment = endOfLifeAssessment
        break
      case 'clinical-outcome-summary':
        patch.clinicalOutcomeSummary = clinicalOutcomeSummary
        break
      case 'care-plan-objectives':
        patch.carePlanObjectives = carePlanObjectives
        patch.agreedGoals = agreedGoals
        break
      case 'mental-capacity-checklist':
        patch.mentalCapacityChecklist = screeningSyncedMentalCapacityChecklist
        break
      case 'mca-screening':
        patch.capacityDecisions = capacityDecisions
        break
      case 'consent':
        patch.photographyConsent = photographyConsent
        break
      case 'section12-blocks':
        patch.adl = adl
        patch.transfers = transfers
        patch.equipmentChecklist = equipmentChecklist
        patch.dailyLivingAids = dailyLivingAids
        patch.practicalCare = practicalCare
        patch.financeSupport = {
          ...financeSupport,
          required: section12FinanceRequired,
          consentRecorded: financeConsentQuestion
            ? isYesAnswer(draftAnswers[financeConsentQuestion.id])
            : financeSupport.consentRecorded,
        }
        break
      case 'multi-section':
        if (tab.id === 1) {
          patch.painAssessment = painAssessment
        }
        break
      default:
        break
    }

    if (sectionFooters[String(tab.id)]) {
      patch.sectionFooters = sectionFooters
    }

    if (Object.keys(patch).length === 0) return
    await persistMetadata(patch)
  }, [
    currentHolisticTab,
    waterlow,
    painAssessment,
    skinIntegrityCheck,
    equipmentSelection,
    mustAssessment,
    fallsScreening,
    movingHandlingOperations,
    environmentAssessment,
    advanceCarePlanning,
    endOfLifeAssessment,
    clinicalOutcomeSummary,
    carePlanObjectives,
    agreedGoals,
    screeningSyncedMentalCapacityChecklist,
    photographyConsent,
    adl,
    transfers,
    equipmentChecklist,
    dailyLivingAids,
    practicalCare,
    financeSupport,
    section12FinanceRequired,
    financeConsentQuestion,
    draftAnswers,
    sectionFooters,
    persistMetadata,
  ])

  // Autosave retry: failures used to only flip the small indicator, so answers could silently stay unsaved.
  const autosaveRetryRef = React.useRef<{
    attempt: number
    timer: ReturnType<typeof setTimeout> | null
    failing: boolean
    gaveUp: boolean
  }>({ attempt: 0, timer: null, failing: false, gaveUp: false })
  const persistTabAnswersRef = React.useRef<
    (questions: InitialAssessmentQuestion[], silent?: boolean) => Promise<boolean>
  >(async () => false)
  const currentTabQuestionsRef = React.useRef(currentTabQuestions)
  currentTabQuestionsRef.current = currentTabQuestions

  const retryAutosaveNow = React.useCallback(() => {
    const state = autosaveRetryRef.current
    if (state.timer) {
      clearTimeout(state.timer)
      state.timer = null
    }
    void persistTabAnswersRef.current(currentTabQuestionsRef.current, true)
  }, [])

  const scheduleAutosaveRetry = React.useCallback(() => {
    const state = autosaveRetryRef.current
    if (state.timer) {
      setSaveIndicator('retrying')
      return
    }
    if (!state.failing) {
      state.failing = true
      useToastStore.getState().push({
        id: AUTOSAVE_FAILED_TOAST_ID,
        variant: 'destructive',
        title: 'Autosave failed',
        description: 'Your latest answers are not saved yet. Retrying automatically — keep this page open.',
      })
    }
    const delay = AUTOSAVE_RETRY_DELAYS_MS[state.attempt]
    if (delay == null) {
      setSaveIndicator('error')
      if (!state.gaveUp) {
        state.gaveUp = true
        // Stays until the answers save (or it is closed) — this one must not be missed.
        useToastStore.getState().push({
          id: AUTOSAVE_GAVE_UP_TOAST_ID,
          variant: 'destructive',
          duration: 0,
          title: 'Answers still not saved',
          description:
            'Check your connection, then press "Save section". Your answers are kept on this page until then.',
        })
      }
      return
    }
    state.attempt += 1
    setSaveIndicator('retrying')
    state.timer = setTimeout(() => {
      state.timer = null
      void persistTabAnswersRef.current(currentTabQuestionsRef.current, true)
    }, delay)
  }, [])

  const markAutosaveRecovered = React.useCallback(() => {
    const state = autosaveRetryRef.current
    if (state.timer) clearTimeout(state.timer)
    const wasFailing = state.failing
    autosaveRetryRef.current = { attempt: 0, timer: null, failing: false, gaveUp: false }
    if (wasFailing) {
      const toasts = useToastStore.getState()
      toasts.dismiss(AUTOSAVE_FAILED_TOAST_ID)
      toasts.dismiss(AUTOSAVE_GAVE_UP_TOAST_ID)
      toastSuccess('Saved', 'Your answers are saved again.')
    }
  }, [])

  // A pending retry belongs to the assessment it failed on.
  React.useEffect(() => {
    const state = autosaveRetryRef.current
    if (state.timer) clearTimeout(state.timer)
    autosaveRetryRef.current = { attempt: 0, timer: null, failing: false, gaveUp: false }
  }, [submissionId])

  // Connection back → retry straight away instead of waiting for the next back-off step.
  React.useEffect(() => {
    const onOnline = () => {
      const state = autosaveRetryRef.current
      if (!state.failing) return
      state.attempt = 0
      state.gaveUp = false
      retryAutosaveNow()
    }
    window.addEventListener('online', onOnline)
    return () => {
      window.removeEventListener('online', onOnline)
      const state = autosaveRetryRef.current
      if (state.timer) clearTimeout(state.timer)
    }
  }, [retryAutosaveNow])

  const persistTabAnswers = React.useCallback(
    async (questions: InitialAssessmentQuestion[], silent = false): Promise<boolean> => {
      if (!submissionId || !editable || !canUpdate) return false
      // One autosave at a time: two in flight could reach the server out of order, so the older
      // answer would be stored last. This one runs when the current one is done.
      if (silent && autosaveInFlightRef.current) {
        autosaveQueuedRef.current = true
        return false
      }
      const extraIds = [...syncSaveQuestionIdsRef.current]
      const syncedQuestions = sections
        .flatMap((s) => s.questions)
        .filter((q) => syncSaveQuestionIdsRef.current.has(q.id))
      const questionsForSave = [...questions]
      for (const synced of syncedQuestions) {
        if (!questionsForSave.some((q) => q.id === synced.id)) questionsForSave.push(synced)
      }
      for (const q of sections.flatMap((s) => s.questions)) {
        if (!dirtyAnswerQuestionIdsRef.current.has(q.id)) continue
        if (questionsForSave.some((x) => x.id === q.id)) continue
        questionsForSave.push(q)
      }
      const draftForSave = mergeLiveRichTextAnswersForQuestions(questionsForSave, draftAnswers)
      const answers = prepareAnswersForSave(
        questionsForSave,
        collectAnswersForSave(questionsForSave, draftForSave, extraIds),
      )
      const pendingSyncIds = [...syncSaveQuestionIdsRef.current]
      syncSaveQuestionIdsRef.current.clear()
      const tabLabel = holisticTabTitle(currentHolisticTab.id)
      if (answers.length === 0) {
        if (!silent) {
          setSaveIndicator('saved')
          toastSuccess('Saved', `${tabLabel} saved.`)
        }
        return true
      }
      setSaveIndicator('saving')
      const savedQuestionIds = answers.map((a) => a.questionId)
      const editCountsAtSave = new Map(answerEditCountsRef.current)
      // Answers edited while the save was in flight (e.g. dictation still writing) are newer than
      // what was saved: they stay dirty, so the refetch keeps them and the next autosave saves them.
      const unchangedSinceSave = (id: string) =>
        (answerEditCountsRef.current.get(id) ?? 0) === (editCountsAtSave.get(id) ?? 0)
      autosaveInFlightRef.current = true
      autosaveQueuedRef.current = false
      try {
        await saveMutation.mutateAsync(answers)
        for (const id of savedQuestionIds) {
          if (unchangedSinceSave(id)) dirtyAnswerQuestionIdsRef.current.delete(id)
          const saved = draftForSave[id]
          if (saved) serverBaselineAnswersRef.current[id] = saved
        }
        if (draftForSave !== draftAnswers) {
          setDraftAnswers((prev) => {
            const next = { ...prev }
            for (const [id, answer] of Object.entries(draftForSave)) {
              if (unchangedSinceSave(id)) next[id] = answer
            }
            return next
          })
        }
        setSaveIndicator('saved')
        markAutosaveRecovered()
        if (!silent) toastSuccess('Saved', `${tabLabel} saved.`)
        // Answers edited while it was saving (nothing may re-run the autosave for them): save them now.
        if (autosaveQueuedRef.current || !savedQuestionIds.every(unchangedSinceSave)) {
          setAutosaveNudge((n) => n + 1)
        }
        return true
      } catch (e) {
        // Dirty ids are still set; keep the synced extras too so the retry saves the same answers.
        for (const id of pendingSyncIds) syncSaveQuestionIdsRef.current.add(id)
        if (silent) {
          scheduleAutosaveRetry()
        } else {
          setSaveIndicator('error')
          toastApiError(e, 'Save failed')
        }
        return false
      } finally {
        autosaveInFlightRef.current = false
        autosaveQueuedRef.current = false
      }
    },
    [
      submissionId,
      editable,
      canUpdate,
      draftAnswers,
      saveMutation,
      sections,
      currentHolisticTab,
      markAutosaveRecovered,
      scheduleAutosaveRetry,
    ],
  )
  persistTabAnswersRef.current = persistTabAnswers

  React.useEffect(() => {
    if (!editable || !canUpdate || !answersHydratedRef.current) return
    if (submitModalOpen) return
    if (skipAutosaveRef.current) return
    if (!questionsHaveDirtyAnswers(currentTabQuestions, dirtyAnswerQuestionIdsRef.current)) return
    const timer = window.setTimeout(() => {
      if (!questionsHaveDirtyAnswers(currentTabQuestions, dirtyAnswerQuestionIdsRef.current)) return
      void persistTabAnswers(currentTabQuestions, true)
    }, AUTOSAVE_MS)
    return () => window.clearTimeout(timer)
  }, [draftAnswers, currentTabQuestions, editable, canUpdate, persistTabAnswers, submitModalOpen, autosaveNudge])

  const onCustomerChange = (id: string) => {
    void navigate({
      to: ENTERPRISE_PATH,
      search: id ? { serviceUserId: id } : {},
      replace: true,
    })
    setManualSubmissionId(null)
    setDraftAnswers({})
    dirtyAnswerQuestionIdsRef.current.clear()
  }

  const saveSection = async () => {
    if (!currentSection) return
    saveSectionInProgressRef.current = true
    let saved = false
    sectionCommentsLocalEditRef.current = true
    try {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur()
        await new Promise<void>((resolve) => window.setTimeout(resolve, 0))
      }
      const commentText = resolveSectionCommentText(activeHolisticTab)
      await flushHolisticTabMetadata()
      await persistSectionComment(activeHolisticTab, commentText)
      saved = await persistTabAnswers(
        [
          ...currentTabQuestions,
          ...demoFillQuestions.filter((q) => demoFilledQuestionIdsRef.current.has(q.id)),
        ].filter((q, i, arr) => arr.findIndex((x) => x.id === q.id) === i),
        false,
      )
    } finally {
      saveSectionInProgressRef.current = false
      sectionCommentsLocalEditRef.current = false
    }
    if (saved) {
      // Point the assessor at the section that matters most next (from the live tab statuses).
      // Same per-tab required counts as the side nav ("N required").
      const requiredMissing = new Map<number, number>()
      for (const tab of HOLISTIC_ASSESSMENT_TABS) {
        const enterprise = sections.find((sec) => sec.sectionNumber === tab.enterpriseSection)
        if (!enterprise) continue
        const prog = sectionProgress(
          { ...enterprise, questions: questionsForDocumentTab(tab, sections, visibleQuestionsBySection) },
          draftAnswers,
          sections,
          progressContext,
        )
        requiredMissing.set(tab.id, Math.max(0, prog.requiredTotal - prog.requiredAnswered))
      }
      const next = nextImportantSection({
        tabs: HOLISTIC_ASSESSMENT_TABS,
        currentTabId: activeHolisticTab,
        navStatus: rawHolisticTabNavStatus,
        requiredMissing,
        specialistRelevance: specialistRelevanceByTab,
      })
      setNextSectionSuggestion({ fromTabId: activeHolisticTab, next })
      if (next) toastInfo('Next important section', `Tab ${next.displayNumber} — ${next.title}`)
    }
  }

  // Unsaved leave guard disabled for now — "Save changes?" modal and route blocker.
  /*
  const assessmentHasUnsavedChanges = React.useCallback((): boolean => {
    if (suppressLeaveGuardRef.current) return false
    if (!editable || !canUpdate || !submissionId) return false
    if (dirtyAnswerQuestionIdsRef.current.size > 0) return true
    if (sectionCommentsLocalEditRef.current) return true
    if (skinIntegrityLocalEditRef.current) return true
    if (mentalCapacityLocalEditRef.current) return true
    for (const [key, draft] of Object.entries(sectionCommentDraftRef.current)) {
      const saved = sectionComments[key]?.text ?? ''
      if (plainTextFromHtml(draft) !== plainTextFromHtml(saved)) return true
    }
    return false
  }, [editable, canUpdate, submissionId, sectionComments, draftAnswers])

  const discardUnsavedChanges = React.useCallback(() => {
    dirtyAnswerQuestionIdsRef.current.clear()
    syncSaveQuestionIdsRef.current.clear()
    sectionCommentsLocalEditRef.current = false
    skinIntegrityLocalEditRef.current = false
    if (skinIntegrityPersistTimerRef.current) {
      clearTimeout(skinIntegrityPersistTimerRef.current)
      skinIntegrityPersistTimerRef.current = null
    }
    skinIntegrityPendingPersistRef.current = null
    mentalCapacityLocalEditRef.current = false
    if (mentalCapacityPersistTimerRef.current) {
      clearTimeout(mentalCapacityPersistTimerRef.current)
      mentalCapacityPersistTimerRef.current = null
    }
    mentalCapacityPendingPersistRef.current = null
    setDraftAnswers({ ...serverBaselineAnswersRef.current })
    const parsed = parseSubmissionMetadata(submission)
    setSectionComments(parsed.sectionComments)
    sectionCommentDraftRef.current = Object.fromEntries(
      Object.entries(parsed.sectionComments).map(([key, entry]) => [key, entry.text]),
    )
    setSkinIntegrityCheck(parsed.skinIntegrityCheck)
    setMentalCapacityChecklist(parsed.mentalCapacityChecklist)
  }, [submission])

  const leaveBlocker = useBlocker({
    shouldBlockFn: ({ current, next }) => {
      if (!assessmentHasUnsavedChanges()) return false
      if (next.pathname !== ENTERPRISE_PATH) return true
      const currentSearch = parseInitialAssessmentEnterpriseSearch(current.search)
      const nextSearch = parseInitialAssessmentEnterpriseSearch(next.search)
      return currentSearch.serviceUserId !== nextSearch.serviceUserId
    },
    enableBeforeUnload: () => assessmentHasUnsavedChanges(),
    withResolver: true,
  })

  React.useEffect(() => {
    if (leaveBlocker.status === 'blocked') {
      setUnsavedLeaveOpen(true)
    }
  }, [leaveBlocker.status])

  const completePendingLeave = React.useCallback(() => {
    pendingLeaveActionRef.current?.()
    pendingLeaveActionRef.current = null
    if (leaveBlocker.status === 'blocked') leaveBlocker.proceed()
    setUnsavedLeaveOpen(false)
  }, [leaveBlocker])

  const cancelUnsavedLeave = React.useCallback(() => {
    pendingLeaveActionRef.current = null
    if (leaveBlocker.status === 'blocked') leaveBlocker.reset()
    setUnsavedLeaveOpen(false)
  }, [leaveBlocker])

  const promptIfUnsaved = React.useCallback(
    (action: () => void) => {
      if (!assessmentHasUnsavedChanges()) {
        action()
        return
      }
      pendingLeaveActionRef.current = action
      setUnsavedLeaveOpen(true)
    },
    [assessmentHasUnsavedChanges],
  )

  const confirmUnsavedLeave = React.useCallback(
    async (saveFirst: boolean) => {
      if (saveFirst) {
        setLeaveSaving(true)
        try {
          const ok = await saveAllPendingChanges()
          if (!ok) return
        } finally {
          setLeaveSaving(false)
        }
      } else {
        discardUnsavedChanges()
      }
      suppressLeaveGuardRef.current = true
      try {
        completePendingLeave()
      } finally {
        suppressLeaveGuardRef.current = false
      }
    },
    [completePendingLeave, discardUnsavedChanges, saveAllPendingChanges],
  )
  */

  const saveAllPendingChanges = React.useCallback(async (): Promise<boolean> => {
    if (!submissionId || !editable || !canUpdate) return true
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0))
    }
    for (const key of Object.keys(sectionCommentDraftRef.current)) {
      const tabId = Number(key)
      if (!holisticTabById(tabId)) continue
      const text = resolveSectionCommentText(tabId)
      const saved = sectionComments[key]?.text ?? ''
      if (plainTextFromHtml(text) === plainTextFromHtml(saved)) continue
      await persistSectionComment(tabId, text)
    }
    await flushHolisticTabMetadata()
    if (skinIntegrityPersistTimerRef.current) {
      clearTimeout(skinIntegrityPersistTimerRef.current)
      skinIntegrityPersistTimerRef.current = null
    }
    if (skinIntegrityPendingPersistRef.current) {
      await persistMetadata({ skinIntegrityCheck: skinIntegrityPendingPersistRef.current })
      skinIntegrityPendingPersistRef.current = null
      skinIntegrityLocalEditRef.current = false
    }
    if (mentalCapacityPersistTimerRef.current) {
      clearTimeout(mentalCapacityPersistTimerRef.current)
      mentalCapacityPersistTimerRef.current = null
    }
    if (mentalCapacityPendingPersistRef.current) {
      await persistMetadata({ mentalCapacityChecklist: mentalCapacityPendingPersistRef.current })
      mentalCapacityPendingPersistRef.current = null
      mentalCapacityLocalEditRef.current = false
    }
    if (agreedGoalsPersistTimerRef.current) {
      clearTimeout(agreedGoalsPersistTimerRef.current)
      agreedGoalsPersistTimerRef.current = null
      await persistMetadata({ agreedGoals })
    }
    if (capacityDecisionsPersistTimerRef.current) {
      clearTimeout(capacityDecisionsPersistTimerRef.current)
      capacityDecisionsPersistTimerRef.current = null
      await persistMetadata({ capacityDecisions })
    }
    if (conditionProposalsPersistTimerRef.current) {
      clearTimeout(conditionProposalsPersistTimerRef.current)
      conditionProposalsPersistTimerRef.current = null
      await persistMetadata({ conditionProposals })
    }
    const dirtyIds = [...dirtyAnswerQuestionIdsRef.current]
    if (dirtyIds.length > 0 || syncSaveQuestionIdsRef.current.size > 0) {
      const dirtyQuestions = sections
        .flatMap((s) => s.questions)
        .filter((q) => dirtyIds.includes(q.id))
      await persistTabAnswers(dirtyQuestions, true)
      // The autosave-failed toast + retry already tell the assessor; callers add their own message.
      if (dirtyAnswerQuestionIdsRef.current.size > 0 || syncSaveQuestionIdsRef.current.size > 0) {
        return false
      }
    }
    return true
  }, [
    submissionId,
    editable,
    canUpdate,
    sectionComments,
    resolveSectionCommentText,
    persistSectionComment,
    flushHolisticTabMetadata,
    persistMetadata,
    agreedGoals,
    capacityDecisions,
    conditionProposals,
    sections,
    persistTabAnswers,
  ])

  // B7: answers still waiting for autosave (400 ms debounce, paused while the submit dialog is open)
  // were never sent, so an IA could be submitted — and locked — without the last change.
  const [submitSaving, setSubmitSaving] = React.useState(false)

  /** Sends every pending change; false (after an error toast) when something could not be saved. */
  const savePendingBeforeSubmit = React.useCallback(async (): Promise<boolean> => {
    setSubmitSaving(true)
    try {
      return await saveAllPendingChanges()
    } catch {
      return false // persistMetadata already showed why
    } finally {
      setSubmitSaving(false)
    }
  }, [saveAllPendingChanges])

  /** Save first so the dialog's server check sees what is on screen, then open it. */
  const openSubmitReview = React.useCallback(() => {
    setValidationRevealed(true)
    void savePendingBeforeSubmit().then(() => setSubmitModalOpen(true))
  }, [savePendingBeforeSubmit])

  const promptIfUnsaved = React.useCallback((action: () => void) => {
    action()
  }, [])

  const selectSubmission = (id: string) => {
    promptIfUnsaved(() => {
      if (id !== submissionId) {
        setManualSubmissionId(id)
        setDraftAnswers({})
        dirtyAnswerQuestionIdsRef.current.clear()
        answersHydratedRef.current = false
        skipAutosaveRef.current = true
      }
      void navigate({
        to: ENTERPRISE_PATH,
        search: (prev) =>
          buildInitialAssessmentEnterpriseSearch({
            ...parseInitialAssessmentEnterpriseSearch(prev),
            serviceUserId: selectedId || undefined,
            submissionId: id,
            section: HOLISTIC_ASSESSMENT_TABS[0]!.id,
            tab: 'form',
          }),
        replace: true,
      })
    })
  }

  const startAssessment = async () => {
    if (!canCreate) return
    const existingEditable = submissionsQuery.data?.find((s) =>
      isEditableInitialAssessmentStatus(s.status),
    )
    if (existingEditable) {
      selectSubmission(existingEditable.id)
      return
    }
    try {
      const created = await createMutation.mutateAsync()
      selectSubmission(created.id)
      toastSuccess('Assessment started', 'Enterprise initial assessment draft created.')
    } catch (e) {
      toastApiError(e, 'Could not start assessment')
    }
  }

  const confirmSubmit = async (skipIncompleteValidation = false) => {
    if (!submissionId) return
    if (!skipIncompleteValidation && !validation.canSubmit) return
    if (skipIncompleteValidation && !validation.canSubmitIncomplete) return
    if (!(await savePendingBeforeSubmit())) {
      toastError('Not submitted', 'Some changes are not saved yet. Check your connection and try again.')
      return
    }
    try {
      await submitMutation.mutateAsync(
        skipIncompleteValidation ? { skipIncompleteValidation: true } : undefined,
      )
      setSubmitModalOpen(false)
      setHubTab('schedule')
      if (selectedId) askForDueSurveys(selectedId, 'the assessment')
      toastSuccess(
        'Submitted',
        skipIncompleteValidation
          ? 'Assessment submitted incomplete — review schedule for care plan recommendations.'
          : 'Assessment submitted — review schedule for care plan recommendations.',
      )
    } catch (e) {
      toastApiError(e, 'Submit failed')
    }
  }

  if (!hasApi) {
    return <p className="p-6 text-sm text-muted-foreground">Configure VITE_API_BASE_URL to load assessments.</p>
  }

  const selectedInList = serviceUsers.some((su) => su.id === selectedId)
  const showServiceUserPicker = !listLoading || Boolean(selectedId)

  if (!canRead) {
    return <p className="p-6 text-sm text-destructive">You do not have permission to view initial assessments.</p>
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6" data-testid="initial-assessment-enterprise-page">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <ClipboardCheck className="h-7 w-7 text-teal-700 dark:text-teal-400" aria-hidden />
          <h1 className="text-lg font-bold leading-snug md:text-xl">{HOLISTIC_FORM_TITLE}</h1>
        </div>

        <PolicyContextPanel
          moduleType="INITIAL_ASSESSMENT"
          recordId={submissionId || undefined}
          sectionKey={
            currentHolisticTab.enterpriseSection != null
              ? String(currentHolisticTab.enterpriseSection)
              : undefined
          }
        />

        {/* QA Demo Data — dev/QA only; hidden entirely in production builds. */}
        {import.meta.env.DEV && canUpdate ? (
          <div className="flex flex-wrap items-center gap-3">
            <TooltipProvider delayDuration={250}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="shrink-0"
                    data-testid="ia-qa-demo-data-open"
                    onClick={() => setQaDemoDialogOpen(true)}
                  >
                    <FlaskConical className="mr-2 h-4 w-4" />
                    {IA_QA_DEMO_DATA_BUTTON_LABEL}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-sm text-left leading-snug">
                  {IA_QA_DEMO_DATA_BUTTON_TOOLTIP}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {qaDemoSeverity ? (
              <Badge
                variant="outline"
                data-testid="ia-qa-demo-active-scenario"
                className="text-xs"
              >
                QA scenario: {IA_CONDITION_LEVEL_LABELS[qaDemoSeverity]}
              </Badge>
            ) : (
              <span className="text-xs text-muted-foreground">No QA scenario selected</span>
            )}
            <InitialAssessmentQaDemoDataDialog
              open={qaDemoDialogOpen}
              onOpenChange={setQaDemoDialogOpen}
              activeLevel={qaDemoSeverity}
              onSelect={setQaDemoSeverity}
            />
          </div>
        ) : null}
      </div>

      <div className="max-w-xl space-y-2 rounded-xl border border-border bg-card p-4 shadow-sm">
        <Label htmlFor="ia-enterprise-su">
          Service user <span className="text-destructive">*</span>
        </Label>
        {showServiceUserPicker ? (
          <Combobox
            id="ia-enterprise-su"
            data-testid="ia-enterprise-su-picker"
            value={selectedId}
            onChange={(id) => {
              if (id) onCustomerChange(id)
            }}
            allowDeselect={false}
            options={[
              ...(selectedId && !selectedInList && detailQuery.data
                ? [{ value: selectedId, label: serviceUserDetailLabel(detailQuery.data) }]
                : []),
              ...serviceUsers.map((su) => ({ value: su.id, label: customerLabel(su) })),
            ]}
            onSearchChange={setServiceUserSearch}
            loading={listFetching}
            placeholder="Select a service user…"
            searchPlaceholder="Search by name or service user number…"
            emptyText={listFetching ? 'Searching…' : 'No service users match.'}
          />
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        )}
      </div>

      {!selectedId ? (
        <div className="rounded-lg border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
          Select a service user to open the enterprise assessment.
        </div>
      ) : isAssessmentWorkspaceLoading ? (
        <InitialAssessmentWorkspaceSkeleton />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
              {submission ? (
                <InitialAssessmentStatusBadge
                  status={submission.status}
                  managerReviewRequired={managerReviewRequired}
                />
              ) : null}
              {saveIndicator !== 'idle' && submission ? (
                <span className="text-xs text-muted-foreground">
                  {saveIndicator === 'saving'
                    ? 'Saving…'
                    : saveIndicator === 'saved'
                      ? 'All changes saved'
                      : saveIndicator === 'retrying'
                        ? 'Not saved — retrying…'
                        : 'Save failed'}
                </span>
              ) : null}
              {canCreate && !editable ? (
                <Button
                  type="button"
                  size="sm"
                  data-testid="ia-start-new-assessment"
                  onClick={() => void startAssessment()}
                  disabled={createMutation.isPending}
                >
                  Start new assessment
                </Button>
              ) : null}
              {submission && canExportAssessment ? (
                <>
                  <Button type="button" size="sm" variant="outline" onClick={openHtmlExport}>
                    <FileCode2 className="mr-2 h-4 w-4" />
                    Export HTML
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setPdfModalOpen(true)}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </>
              ) : null}
              {/* Legacy checklist — retired in favour of enterprise initial assessment
              <Button type="button" size="sm" variant="outline" asChild>
                <Link to={LEGACY_PATH} search={{ serviceUserId: selectedId }}>
                  Legacy checklist
                </Link>
              </Button>
              */}
            </div>
          </div>

          <InitialAssessmentHubTabs
            active={hubTab}
            submissionCount={submissionsQuery.data?.length}
            openActionsCount={openActionsCount}
            carePlanRecommendationCount={carePlanRecommendationCount}
            waterlowScore={submission ? waterlowScore : null}
            onChange={setHubTab}
          />

          {hubTab === 'submissions' ? (
            <InitialAssessmentHubListPanel
              submissions={submissionsQuery.data ?? []}
              activeId={submissionId}
              canCreate={canCreate}
              creating={createMutation.isPending}
              onSelect={selectSubmission}
              onStartNew={() => void startAssessment()}
            />
          ) : null}

          {hubTab === 'versions' ? (
            <InitialAssessmentVersionsPanel
              serviceUserId={selectedId}
              submissions={submissionsQuery.data ?? []}
              sections={sections}
              activeId={submissionId}
              onSelect={selectSubmission}
            />
          ) : null}

          {hubTab === 'review' ? (
            <div className="space-y-6">
              <InitialAssessmentManagerReviewPanel
                serviceUserId={selectedId}
                submission={submission}
                reviewNotes={reviewNotes}
                onReviewNotesChange={setReviewNotes}
                approvedForCareStart={approvedForCareStart}
                weeklyHoursMissing={domCareQuery.isSuccess && !domCareQuery.data?.weeklyContractedHours?.trim()}
                onApprovedForCareStartChange={setApprovedForCareStart}
                careStartConditions={careStartConditions}
                onCareStartConditionsChange={setCareStartConditions}
                canReview={canReview}
                canReopen={canUpdate}
                reviewing={reviewMutation.isPending}
                canExport={canExportAssessment && Boolean(submission?.id)}
                onExportHtml={openHtmlExport}
                onExportPdf={() => setPdfModalOpen(true)}
                onApprove={() =>
                  void reviewMutation
                    .mutateAsync({
                      status: 'REVIEWED',
                      reviewNotes: reviewNotes.trim() || undefined,
                      approvedForCareStart,
                      careStartConditions: careStartConditions.trim() || undefined,
                    })
                    .then((reviewed) => notifyReviewOutcome(reviewed.visitPlanDraft))
                    .catch((e) => toastApiError(e, 'Review failed'))
                }
                onArchive={() =>
                  void reviewMutation
                    .mutateAsync({ status: 'ARCHIVED', reviewNotes: reviewNotes.trim() || undefined })
                    .then(() => toastSuccess('Archived', 'Assessment archived.'))
                    .catch((e) => toastApiError(e, 'Archive failed'))
                }
                onReopen={() => setReopenOpen(true)}
              />
              <InitialAssessmentRiskRecordsPanel
                serviceUserId={selectedId}
                submissionId={submissionId}
                canUpdate={canUpdate}
                editable={editable || submission?.status === 'SUBMITTED'}
                showOwner
              />
            </div>
          ) : null}

          {hubTab === 'schedule' ? (
            <div className="space-y-6">
              <InitialAssessmentCareActivationPanel
                careActivation={summaryQuery.data?.careActivation}
                serviceUserId={selectedId}
              />
              <InitialAssessmentSchedulePanel
                submission={submission}
                sections={sections}
                draftAnswers={draftAnswers}
              />
              <InitialAssessmentCarePlanRecommendationsPanel
                layout="grid"
                serviceUserId={selectedId}
                submissionId={submissionId}
                recommendations={summaryQuery.data?.carePlanRecommendations ?? []}
                submissionStatus={submission?.status}
                canDecide={(canReview || canUpdate) && submission?.status === 'REVIEWED'}
                canCreate={canUpdate}
                onGoToSection={(n) => goToSection(n)}
              />
              <InitialAssessmentRequiredAssessmentsPanel
                serviceUserId={selectedId}
                items={summaryQuery.data?.requiredAssessments ?? []}
              />
              <InitialAssessmentActionsPanel
                serviceUserId={selectedId}
                submissionId={submissionId}
                canUpdate={canUpdate}
                // Actions are worked after submit (e.g. verify DNACPR), so their status stays editable then too.
                editable={editable || submission?.status === 'SUBMITTED' || submission?.status === 'REVIEWED'}
              />
            </div>
          ) : null}

          {hubTab === 'audit' ? (
            <InitialAssessmentAuditPanel serviceUserId={selectedId} submissionId={submissionId} enabled={canRead} />
          ) : null}

          {hubTab === 'compare' && (submissionsQuery.data?.length ?? 0) >= 2 ? (
            <InitialAssessmentVersionsPanel
              serviceUserId={selectedId}
              submissions={submissionsQuery.data ?? []}
              sections={sections}
              activeId={submissionId}
              onSelect={selectSubmission}
            />
          ) : hubTab === 'compare' ? (
            <p className="text-sm text-muted-foreground">Need at least two submissions to compare.</p>
          ) : null}

          {templateQuery.error && (
            <p className="text-sm text-destructive">
              {templateQuery.error instanceof ApiError ? templateQuery.error.message : 'Failed to load template.'}
            </p>
          )}

          {hubTab === 'waterlow' && submission && template ? (
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              {!editable ? (
                <p className="mb-4 text-sm text-muted-foreground">
                  Read-only — reopen from Manager review to edit Waterlow scoring.
                </p>
              ) : null}
              <InitialAssessmentWaterlowPanel
                value={waterlow}
                disabled={!editable || !canUpdate}
                onChange={onWaterlowChange}
              />
            </div>
          ) : hubTab === 'waterlow' ? (
            <p className="text-sm text-muted-foreground">Select or start an assessment to complete Waterlow.</p>
          ) : null}

          {hubTab === 'form' && !submission && canCreate ? (
            <div className="rounded-lg border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
              No active assessment. Use &ldquo;Start new assessment&rdquo; above or open the Submissions tab.
            </div>
          ) : null}

          {hubTab === 'form' && submission && template && sections.length > 0 ? (
            <>
              {!editable ? (
                <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200">
                  Read-only ({submission.status.replace('_', ' ')}). Reopen from Manager review to edit.
                </div>
              ) : null}

              {editable && validationRevealed ? (
                <InitialAssessmentBlockingBanner
                  blocks={validation.blocks}
                  warnings={validation.warnings}
                  editable={editable}
                  onGoToSection={goToSection}
                  issueTabLabel={issueTabLabel}
                  onGoToHubTab={(tab) => setHubTab(tab)}
                  onReviewSubmit={openSubmitReview}
                />
              ) : null}

              {detailQuery.data ? (
                <InitialAssessmentProfileCard
                  detail={detailQuery.data}
                  domCare={domCareQuery.data}
                  contactCount={detailQuery.data.contacts?.length ?? 0}
                  assessmentStatus={submission?.status}
                  managerReviewRequired={managerReviewRequired}
                />
              ) : null}

              <InitialAssessmentAttachmentsPanel
                serviceUserId={selectedId}
                submissionId={submissionId}
                activeSection={currentHolisticTab.enterpriseSection}
                canUpdate={canUpdate}
                editable={editable}
                fillTarget={canUpdate ? transcriptFillTarget : undefined}
              />

              <InitialAssessmentTranscriptionPanel
                serviceUserId={selectedId}
                submissionId={submissionId}
                // A recording is saved to the assessment, so only while it can still be changed.
                canUpdate={canUpdate && editable}
                fillTarget={transcriptFillTarget}
              />

              <div
                className={cn(
                  'grid grid-cols-1 items-start gap-6 min-[900px]:grid-cols-[minmax(220px,260px)_minmax(0,1fr)]',
                  rightSidebarOpen
                    ? 'min-[1200px]:grid-cols-[minmax(260px,300px)_minmax(0,1fr)_minmax(260px,320px)]'
                    : 'min-[1200px]:grid-cols-[minmax(260px,300px)_minmax(0,1fr)]',
                )}
              >
                <nav
                  data-testid="ia-section-nav"
                  className="flex max-h-[calc(100vh-7rem)] flex-col gap-1 overflow-y-auto rounded-xl border border-border bg-card p-2 shadow-sm min-[900px]:sticky min-[900px]:top-4 min-[900px]:self-start"
                >
                  {(['core', 'specialist', 'finalisation'] as const).map((group) => {
                    const renderNavTab = (tab: (typeof HOLISTIC_ASSESSMENT_TABS)[number]) => {
                    const enterprise = sections.find((s) => s.sectionNumber === tab.enterpriseSection)
                    const tabQuestions = questionsForDocumentTab(
                      tab,
                      sections,
                      visibleQuestionsBySection,
                    )
                    const prog = enterprise
                      ? sectionProgress(
                          { ...enterprise, questions: tabQuestions },
                          draftAnswers,
                          sections,
                          progressContext,
                        )
                      : { percent: 0, total: 0, answered: 0, requiredTotal: 0, requiredAnswered: 0 }
                    const hasComment = Boolean(sectionComments[String(tab.id)]?.text?.trim())
                    const navStatus = holisticTabNavStatus.get(tab.id) ?? 'ok'
                    const relevance = specialistRelevanceByTab.get(tab.id)
                    const isSwitchTarget = pendingHolisticTab === tab.id
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        className={cn(
                          IA_FORM_NAV_BUTTON_CLASS,
                          activeHolisticTab === tab.id
                            ? 'bg-teal-900 text-white dark:bg-teal-800'
                            : 'hover:bg-muted',
                          isSwitchTarget && activeHolisticTab !== tab.id
                            ? 'bg-teal-100 text-teal-950 dark:bg-teal-950 dark:text-teal-100'
                            : null,
                        )}
                        aria-busy={isSwitchTarget || undefined}
                        disabled={tabSwitchLoading}
                        onClick={() => goToHolisticTab(tab.id)}
                      >
                        <span className="flex items-center gap-1.5">
                          <span className="font-semibold">{holisticTabDisplayNumber(tab)}.</span>
                          <span className="min-w-0 flex-1">{tab.title}</span>
                          {isSwitchTarget ? (
                            <Loader2
                              className="h-3.5 w-3.5 shrink-0 animate-spin"
                              aria-hidden
                              data-testid={`ia-nav-loading-${tab.id}`}
                            />
                          ) : navStatus === 'blocking' ? (
                            <span
                              className="h-2 w-2 shrink-0 rounded-full bg-red-500"
                              title="Blocking issues — fix before submit"
                            />
                          ) : navStatus === 'warning' ? (
                            <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" title="Warnings" />
                          ) : navStatus === 'incomplete' ? (
                            <span className="h-2 w-2 shrink-0 rounded-full bg-muted-foreground/50" title="Incomplete" />
                          ) : null}
                          {hasComment ? (
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400" title="Section comment" />
                          ) : null}
                          {import.meta.env.DEV ? (
                            demoFilledTabs.has(tab.id) ? (
                              <span
                                className="shrink-0 text-[11px] font-bold leading-none text-emerald-400"
                                title="Demo data filled"
                                data-testid={`ia-nav-demo-filled-${tab.id}`}
                              >
                                ✓
                              </span>
                            ) : (
                              <span
                                className="h-2 w-2 shrink-0 rounded-full border border-muted-foreground/40"
                                title="Demo data not filled"
                                data-testid={`ia-nav-demo-unfilled-${tab.id}`}
                              />
                            )
                          ) : null}
                        </span>
                        <span className={IA_FORM_NAV_META_CLASS}>
                          {isSwitchTarget ? 'Loading…' : formatSectionNavMeta(prog)}
                          {relevance && relevance.status !== 'pending' ? (
                            <span
                              className={cn(
                                'ml-1.5 rounded px-1.5 py-0.5 text-[11px] font-semibold',
                                SPECIALIST_NAV_BADGE_CLASS[relevance.status],
                              )}
                              data-testid={`ia-nav-relevance-${tab.id}`}
                            >
                              {SPECIALIST_STATUS_LABEL[relevance.status]}
                            </span>
                          ) : null}
                          {relevance && specialistCompleteTabs.has(tab.id) ? (
                            <span
                              className="ml-1 rounded bg-emerald-600 px-1.5 py-0.5 text-[11px] font-bold text-white dark:bg-emerald-500"
                              data-testid={`ia-nav-completed-${tab.id}`}
                            >
                              ✓ Completed
                            </span>
                          ) : null}
                        </span>
                      </button>
                    )
                  }
                    const inGroup = HOLISTIC_ASSESSMENT_TABS.filter((tab) => tab.group === group)
                    // Required, then Suggested, float to the top of the group (stable; numbers unchanged so
                    // "Tab n" references stay valid).
                    // Outstanding first, then completed ones, then the rest.
                    const statusOf = (tabId: number) =>
                      specialistCompleteTabs.has(tabId) ? 'completed' : specialistRelevanceByTab.get(tabId)?.status
                    const groupTabs =
                      group === 'specialist'
                        ? [
                            ...inGroup.filter((tab) => statusOf(tab.id) === 'required'),
                            ...inGroup.filter((tab) => statusOf(tab.id) === 'suggested'),
                            ...inGroup.filter((tab) => statusOf(tab.id) === 'completed'),
                            ...inGroup.filter(
                              (tab) => !['required', 'suggested', 'completed'].includes(String(statusOf(tab.id))),
                            ),
                          ]
                        : inGroup
                    const hidden =
                      group === 'specialist' && !showNotNeededSpecialists
                        ? groupTabs.filter(
                            (tab) =>
                              specialistRelevanceByTab.get(tab.id)?.status === 'not_needed' &&
                              tab.id !== activeHolisticTab,
                          )
                        : []
                    const hiddenIds = new Set(hidden.map((tab) => tab.id))
                    return (
                      <React.Fragment key={group}>
                        <p className="mt-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground first:mt-0">
                          {HOLISTIC_TAB_GROUP_LABEL[group]}
                          {group === 'specialist' && specialistOutstandingRequiredCount > 0 ? (
                            <span
                              className="ml-1 font-bold text-red-700 dark:text-red-400"
                              data-testid="ia-nav-specialist-required-count"
                            >
                              — {specialistOutstandingRequiredCount} required
                            </span>
                          ) : null}
                        </p>
                        {groupTabs.filter((tab) => !hiddenIds.has(tab.id)).map(renderNavTab)}
                        {group === 'specialist' && (hidden.length > 0 || showNotNeededSpecialists) ? (
                          <button
                            type="button"
                            className="px-3 py-1.5 text-left text-xs font-medium text-teal-700 hover:underline dark:text-teal-300"
                            onClick={() => setShowNotNeededSpecialists((v) => !v)}
                            data-testid="ia-nav-not-needed-toggle"
                          >
                            {showNotNeededSpecialists ? 'Hide not needed' : `Not needed (${hidden.length})`}
                          </button>
                        ) : null}
                      </React.Fragment>
                    )
                  })}
                </nav>

                <div className="relative min-w-0">
                  {!rightSidebarOpen ? (
                    <div className="mb-3 hidden min-[1200px]:flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        data-testid="ia-sidebar-show"
                        onClick={() => setRightSidebarOpen(true)}
                      >
                        <PanelRightOpen className="h-4 w-4" aria-hidden />
                        Show summary panel
                      </Button>
                    </div>
                  ) : null}
                  {tabSwitchLoading ? (
                    <div
                      className="mb-3 flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50/90 px-3 py-2 text-sm font-medium text-teal-950 dark:border-teal-900 dark:bg-teal-950/60 dark:text-teal-100"
                      role="status"
                      aria-live="polite"
                      data-testid="ia-tab-switch-loading"
                    >
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                      Loading section…
                    </div>
                  ) : null}
                  <div
                    ref={sectionContentRef}
                    key={`holistic-tab-${activeHolisticTab}-${currentSection?.id ?? 'none'}`}
                    className={cn(
                      'relative min-w-0 space-y-6 rounded-sm border border-slate-300 bg-white p-6 shadow-sm dark:border-slate-600 dark:bg-card',
                      IA_FORM_ROOT_CLASS,
                      HOLISTIC_FORM_PAGE_CLASS,
                    )}
                    aria-busy={tabSwitchLoading || undefined}
                  >
                  {tabSwitchLoading ? (
                    <div
                      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-sm bg-white/75 backdrop-blur-[1px] dark:bg-card/80"
                      data-testid="ia-tab-switch-overlay"
                    >
                      <Loader2 className="h-8 w-8 animate-spin text-teal-800 dark:text-teal-300" aria-hidden />
                      <p className="text-sm font-medium text-muted-foreground">Loading section…</p>
                    </div>
                  ) : null}
                  {import.meta.env.DEV && canUpdate ? (
                    <SectionQaDemoDataPanel
                      tabId={currentHolisticTab.id}
                      tabTitle={holisticTabTitle(currentHolisticTab.id)}
                      questionIds={demoFillQuestions.map((q) => q.id)}
                      activeLevel={qaDemoSeverity}
                      editable={editable}
                      sectionHasData={currentTabHasDemoData}
                      alreadyFilled={demoFilledTabs.has(currentHolisticTab.id)}
                      identity={iaDemoIdentityFromDetail(detailQuery.data, {
                        allergiesSummary: allergiesQuery.isSuccess
                          ? formatAllergiesAssessmentText(allergiesQuery.data ?? [])
                          : null,
                        accessInstruction: domCareQuery.data?.accessInstruction ?? null,
                      })}
                      serviceUserId={selectedId}
                      gpContactId={
                        detailQuery.data?.contacts?.find((c) => c.relationshipType?.code === 'GP')?.id ?? null
                      }
                      onProfilePersisted={() =>
                        queryClient.invalidateQueries({ queryKey: serviceUserKeys.detail(selectedId) })
                      }
                      onApply={applyDemoDataToSection}
                      onPickScenario={() => setQaDemoDialogOpen(true)}
                    />
                  ) : null}
                  {currentSection ? (
                    <>
                      {currentHolisticTab.kind !== 'skin-integrity-check' &&
                      currentHolisticTab.kind !== 'waterlow' &&
                      currentHolisticTab.kind !== 'equipment-selection' &&
                      currentHolisticTab.kind !== 'must-tool' &&
                      currentHolisticTab.kind !== 'falls-screening' &&
                      currentHolisticTab.kind !== 'moving-handling' &&
                      currentHolisticTab.kind !== 'pain-tool' &&
                      currentHolisticTab.kind !== 'therapy-memoire' &&
                      currentHolisticTab.kind !== 'environment-assessment' &&
                      currentHolisticTab.kind !== 'advance-care-planning' &&
                      currentHolisticTab.kind !== 'end-of-life-assessment' &&
                      currentHolisticTab.kind !== 'clinical-outcome-summary' &&
                      currentHolisticTab.kind !== 'care-plan-objectives' &&
                      currentHolisticTab.kind !== 'mental-capacity-checklist' ? (
                        <h2 className={IA_SECTION_TITLE_CLASS}>
                          {holisticTabDisplayNumber(currentHolisticTab)}. {holisticTabTitle(currentHolisticTab.id)}
                        </h2>
                      ) : null}
                      {specialistRelevanceByTab.get(currentHolisticTab.id) ? (
                        <InitialAssessmentSpecialistRelevanceBanner
                          key={`relevance-${currentHolisticTab.id}`}
                          relevance={specialistRelevanceByTab.get(currentHolisticTab.id)!}
                          disabled={!editable || !canUpdate}
                          onOverride={(next, reason) => onSpecialistOverride(currentHolisticTab.id, next, reason)}
                        />
                      ) : null}
                      <SpecialistTriggerNotesContext.Provider value={specialistTriggerNoteMap}>
                      <InitialAssessmentDocumentTabContent
                        loneWorkerFactorHints={loneWorkerFactorHints}
                        tab={currentHolisticTab}
                        sections={sections}
                        draftAnswers={draftAnswers}
                        prefillMap={prefillMap}
                        questionErrors={validationMaps.questionErrors}
                        disabled={!editable || !canUpdate}
                        serviceUserId={selectedId}
                        submissionId={submissionId}
                        serviceUserDetail={detailQuery.data}
                        excludeQuestionIds={excludeQuestionIds}
                        painAssessment={painAssessment}
                        waterlow={waterlow}
                        mustAssessment={mustAssessment}
                        fallsScreening={fallsScreening}
                        movingHandlingOperations={movingHandlingOperations}
                        environmentAssessment={environmentAssessment}
                        advanceCarePlanning={advanceCarePlanning}
                        endOfLifeAssessment={endOfLifeAssessment}
                        clinicalOutcomeSummary={clinicalOutcomeSummary}
                        carePlanObjectives={carePlanObjectives}
                        agreedGoals={agreedGoals}
                        mentalCapacityChecklist={screeningSyncedMentalCapacityChecklist}
                        photographyConsent={photographyConsent}
                        equipmentSelection={equipmentSelection}
                        skinIntegrityCheck={skinIntegrityCheck}
                        showBodyMapCta={showBodyMapCta}
                        onSyncEmergencyContact={syncEmergencyContactFromProfile}
                        onMarkMedicationVerified={markMedicationListVerified}
                        onSyncBodyMap={syncSkinIntegrityFromBodyMap}
                        syncBodyMapLoading={syncBodyMapLoading}
                        onOpenWaterlowTab={goToWaterlowTab}
                        onOpenSkinIntegrityCheckTab={goToSkinIntegrityCheckTab}
                        onOpenEnvironmentAssessmentTab={goToEnvironmentAssessmentTab}
                        onOpenFallsScreeningTab={goToFallsScreeningTab}
                        onOpenMcaScreeningTab={goToMcaScreeningTab}
                        onOpenMustTab={goToMustTab}
                        onOpenPersonalDetailsTab={goToPersonalDetailsTab}
                        onOpenEndOfLifeTab={goToEndOfLifeTab}
                        onOpenAdvanceCarePlanningTab={goToAdvanceCarePlanningTab}
                        onOpenInfectionControlTab={goToInfectionControlTab}
                        onPainAssessmentChange={onPainAssessmentChange}
                        onWaterlowChange={onWaterlowChange}
                        capacityDecisions={capacityDecisions}
                        capacityDecisionNeeds={capacityNeeds}
                        legacyCapacityScreening={legacyCapacityScreening}
                        legacyCapacityScreeningAnswered={legacyCapacityScreeningAnswered}
                        capacityAssessorName={currentUser?.displayName}
                        assessmentSummary={assessmentSummary}
                        legalAuthorities={legalAuthoritiesQuery.data?.legalAuthorities ?? []}
                        conditionProposals={conditionProposals}
                        onConditionProposalsChange={editable && canUpdate ? onConditionProposalsChange : undefined}
                        onCapacityDecisionsChange={editable && canUpdate ? onCapacityDecisionsChange : undefined}
                        onMustAssessmentChange={onMustAssessmentChange}
                        onFallsScreeningChange={onFallsScreeningChange}
                        onMovingHandlingOperationsChange={onMovingHandlingOperationsChange}
                        onEnvironmentAssessmentChange={onEnvironmentAssessmentChange}
                        onAdvanceCarePlanningChange={onAdvanceCarePlanningChange}
                        onEndOfLifeAssessmentChange={onEndOfLifeAssessmentChange}
                        onClinicalOutcomeSummaryChange={onClinicalOutcomeSummaryChange}
                        onCarePlanObjectivesChange={onCarePlanObjectivesChange}
                        onAgreedGoalsChange={onAgreedGoalsChange}
                        onMentalCapacityChecklistChange={onMentalCapacityChecklistChange}
                        onPhotographyConsentChange={onPhotographyConsentChange}
                        onEquipmentSelectionChange={onEquipmentSelectionChange}
                        onSkinIntegrityRowSideChange={onSkinIntegrityRowSideChange}
                        sectionFooter={sectionFooters[String(activeHolisticTab)]}
                        onSectionFooterChange={
                          // "Completed by / on" only matters for specialist tools; Core tabs are covered by
                          // the final sign-off and the audit trail.
                          holisticTabById(activeHolisticTab)?.group === 'specialist'
                            ? (patch) => onSectionFooterChange(activeHolisticTab, patch)
                            : undefined
                        }
                        onChange={onAnswerChange}
                        section12={{
                          adl,
                          transfers,
                          equipmentChecklist,
                          equipmentChecklistVisible: section12EquipmentVisible,
                          dailyLivingAids,
                          practicalCare,
                          financeSupport,
                          financeSupportVisible: section12FinanceRequired,
                          financeConsentQuestion,
                          renderFinanceConsentField:
                            financeConsentQuestion
                              ? () => (
                                  <InitialAssessmentQuestionField
                                    question={financeConsentQuestion}
                                    value={draftAnswers[financeConsentQuestion.id]}
                                    disabled={!editable || !canUpdate}
                                    serviceUserId={selectedId}
                                    submissionId={submissionId}
                                    layout="section12"
                                    onChange={(patch) => onAnswerChange(financeConsentQuestion.id, patch)}
                                  />
                                )
                              : undefined,
                          onAdlChange: (next) => {
                            setAdl(next)
                            void persistMetadata({ adl: next })
                          },
                          onTransfersChange: (next) => {
                            setTransfers(next)
                            void persistMetadata({ transfers: next })
                          },
                          onEquipmentChecklistChange: (next) => {
                            setEquipmentChecklist(next)
                            void persistMetadata({ equipmentChecklist: next })
                          },
                          onDailyLivingAidsChange: (next) => {
                            setDailyLivingAids(next)
                            void persistMetadata({ dailyLivingAids: next })
                          },
                          onPracticalCareChange: (next) => {
                            setPracticalCare(next)
                            void persistMetadata({ practicalCare: next })
                          },
                          onFinanceSupportChange: (next) => {
                            setFinanceSupport(next)
                            void persistMetadata({
                              financeSupport: {
                                ...next,
                                required: true,
                                consentRecorded: financeConsentQuestion
                                  ? isYesAnswer(draftAnswers[financeConsentQuestion.id])
                                  : next.consentRecorded,
                              },
                            })
                          },
                        }}
                      />
                      </SpecialistTriggerNotesContext.Provider>
                      {showEmarCta && currentHolisticTab.id === 1 && selectedId ? (
                        <Button type="button" variant="outline" size="sm" asChild>
                          <Link
                            to="/service-users/$serviceUserId/medication"
                            params={{ serviceUserId: selectedId }}
                            search={{ from: 'initial-assessment', submissionId: submissionId ?? undefined }}
                          >
                            Configure eMAR / medication
                          </Link>
                        </Button>
                      ) : null}
                      <InitialAssessmentSectionComment
                        holisticTabId={activeHolisticTab}
                        value={sectionComments[String(activeHolisticTab)]?.text ?? ''}
                        disabled={!editable || !canUpdate}
                        onChange={(tabId, text) => {
                          sectionCommentsLocalEditRef.current = true
                          const key = String(tabId)
                          sectionCommentDraftRef.current[key] = text
                          setSectionComments((prev) => {
                            const next = { ...prev }
                            if (plainTextFromHtml(text)) next[key] = { text }
                            else delete next[key]
                            return next
                          })
                        }}
                        onBlur={(tabId, text) => void persistSectionComment(tabId, text)}
                      />
                      {editable && canUpdate && nextSectionSuggestion?.fromTabId === activeHolisticTab ? (
                        <div
                          className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-sky-200 bg-sky-50 px-3 py-2.5 text-sm text-sky-950 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100"
                          role="status"
                          data-testid="ia-next-important-section"
                        >
                          {nextSectionSuggestion.next ? (
                            <>
                              <div className="min-w-0">
                                <p className="font-medium">
                                  Next important section: Tab {nextSectionSuggestion.next.displayNumber} —{' '}
                                  {nextSectionSuggestion.next.title}
                                </p>
                                <p className="text-xs text-sky-900/80 dark:text-sky-200/80">{nextSectionSuggestion.next.reason}</p>
                              </div>
                              <div className="flex shrink-0 gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => goToHolisticTab(nextSectionSuggestion.next!.tabId)}
                                  data-testid="ia-next-important-section-go"
                                >
                                  Go to Tab {nextSectionSuggestion.next.displayNumber}
                                </Button>
                                <Button type="button" size="sm" variant="ghost" onClick={() => setNextSectionSuggestion(null)}>
                                  Dismiss
                                </Button>
                              </div>
                            </>
                          ) : (
                            <p className="font-medium">
                              No important sections are left to complete — review the assessment and submit it.
                            </p>
                          )}
                        </div>
                      ) : null}
                      {editable && canUpdate ? (
                        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                          <Button type="button" onClick={() => void saveSection()} disabled={saveMutation.isPending}>
                            Save section
                          </Button>
                          {canSubmit ? (
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={openSubmitReview}
                              disabled={submitSaving}
                            >
                              Submit assessment
                            </Button>
                          ) : null}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">This assessment is read-only.</p>
                      )}
                    </>
                  ) : null}
                  </div>
                </div>

                {rightSidebarOpen ? (
                  <aside className="hidden min-[1200px]:block min-[1200px]:sticky min-[1200px]:top-4 min-[1200px]:self-start">
                    <div className="mb-3 flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        data-testid="ia-sidebar-hide"
                        onClick={() => setRightSidebarOpen(false)}
                      >
                        <PanelRightClose className="h-4 w-4" aria-hidden />
                        Hide summary panel
                      </Button>
                    </div>
                    <InitialAssessmentSidePanels
                      riskItems={riskQuery.data?.items ?? []}
                      riskCount={riskQuery.data?.count ?? 0}
                      triggerItems={triggersQuery.data?.items ?? []}
                      triggerCount={triggersQuery.data?.count ?? 0}
                      overallPercent={overallPercent}
                      sectionCommentCount={sectionCommentCount}
                      sectionTotal={HOLISTIC_TAB_COUNT}
                      onGoToSection={goToSection}
                    />
                  </aside>
                ) : null}
              </div>
            </>
          ) : null}
        </>
      )}

      <InitialAssessmentSubmitDialog
        open={submitModalOpen}
        onOpenChange={setSubmitModalOpen}
        blocks={validation.blocks}
        warnings={validation.warnings}
        canSubmit={validation.canSubmit}
        canSubmitIncomplete={validation.canSubmitIncomplete}
        submitting={submitMutation.isPending || submitSaving}
        validating={validateQuery.isLoading}
        flaggedRiskCount={riskQuery.data?.count}
        carePlanTriggerCount={triggersQuery.data?.count}
        carePlanTriggers={triggersQuery.data?.items}
        triggerTabLabel={(t) => holisticTabRef(triggerTabId(t))}
        onGoToTrigger={(t) => {
          setSubmitModalOpen(false)
          goToHolisticTab(triggerTabId(t))
        }}
        openActionsCount={openActionsCount}
        onGoToSection={(n, message) => {
          setSubmitModalOpen(false)
          goToSection(n, message)
        }}
        issueTabLabel={issueTabLabel}
        onGoToHubTab={(tab) => {
          setSubmitModalOpen(false)
          setHubTab(tab)
        }}
        onConfirm={() => void confirmSubmit(false)}
        onConfirmIncomplete={() => void confirmSubmit(true)}
      />

      <InitialAssessmentHtmlExportDialog
        open={htmlExportOpen}
        onOpenChange={setHtmlExportOpen}
        serviceUserId={selectedId}
        submission={submission}
        canExportSecure={canExportSecure}
      />

      <InitialAssessmentPdfDialog
        open={pdfModalOpen}
        onOpenChange={setPdfModalOpen}
        serviceUserId={selectedId}
        submission={submission}
        sections={sections}
        canExportSecure={canExportSecure}
        onPreviewHtml={() => {
          setPdfModalOpen(false)
          setHtmlExportOpen(true)
        }}
      />

      <InitialAssessmentReopenDialog
        open={reopenOpen}
        onOpenChange={setReopenOpen}
        reason={reopenReason}
        onReasonChange={setReopenReason}
        submitting={reopenMutation.isPending}
        onConfirm={() =>
          void reopenMutation
            .mutateAsync(reopenReason.trim())
            .then(() => {
              setReopenOpen(false)
              setReopenReason('')
              setHubTab('form')
              toastSuccess('Reopened', 'Assessment returned to assessor.')
            })
            .catch((e) => toastApiError(e, 'Reopen failed'))
        }
      />

      {/* Unsaved leave guard disabled for now — "Save changes?" modal
      <AlertDialog
        open={unsavedLeaveOpen}
        onOpenChange={(open) => {
          if (!open) cancelUnsavedLeave()
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes to this assessment. Save them before leaving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={leaveSaving}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="outline"
              disabled={leaveSaving}
              onClick={() => void confirmUnsavedLeave(false)}
            >
              Don&apos;t save
            </Button>
            <Button
              type="button"
              disabled={leaveSaving}
              onClick={() => void confirmUnsavedLeave(true)}
            >
              {leaveSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              Save and leave
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      */}
    </div>
  )
}
