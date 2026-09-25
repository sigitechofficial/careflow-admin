import * as React from 'react'
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
import { toastApiError, toastInfo, toastSuccess } from '@/shared/lib/toast'
import { fetchServiceUserBodyMap } from '@/features/service-users/body-map/api'
import { type ServiceUserDetail, type ServiceUserListRow } from '@/features/service-users/types'
import { serviceUserKeys } from '@/features/service-users/keys'
import { useServiceUsers } from '@/features/service-users/hooks/useServiceUsers'
import { useServiceUser } from '@/features/service-users/hooks/useServiceUser'
import { useServiceUserLookups } from '@/features/service-users/hooks/useServiceUserLookups'
import { useServiceUserDomCare, useServiceUserAllergies } from '@/features/service-users/hooks/useServiceUserTabs'
import { useAuthStore } from '@/features/auth/store'
import { PolicyContextPanel } from '@/features/policies/components/PolicyContextPanel'
import { Label } from '@/shared/ui/form-field'
import {
  InitialAssessmentTextarea as Textarea,
  focusInitialAssessmentTextarea,
  plainTextFromHtml,
  readInitialAssessmentTextareaValue,
} from '@/features/service-users/initial-assessment/components/InitialAssessmentTextarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Button } from '@/shared/ui/button'
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
  buildHolisticTabNavStatus,
  firstHolisticTabForEnterpriseSection,
  HOLISTIC_ASSESSMENT_TABS,
  HOLISTIC_TAB_COUNT,
  holisticTabById,
  holisticTabDisplayNumber,
  holisticTabTitle,
  questionsForDocumentTab,
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
  isEnvironmentAssessmentComplete,
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
  type CarePlanObjectivesMetadata,
} from '@/features/service-users/initial-assessment/utils/care-plan-objectives'
import {
  isMentalCapacityChecklistComplete,
  type MentalCapacityChecklistMetadata,
} from '@/features/service-users/initial-assessment/utils/mental-capacity-checklist'
import {
  isPhotographyConsentComplete,
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
import { computeWaterlowScore } from '@/features/service-users/initial-assessment/utils/waterlow-scoring'
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
import { draftAnswersEqual } from '@/features/service-users/initial-assessment/utils/draft-answers-equality'
import { getSubmitValidationIssues } from '@/features/service-users/initial-assessment/utils/submit-validation'
import { findQuestionBySpecRef } from '@/features/service-users/initial-assessment/utils/question-lookup'
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
} from '@/features/service-users/initial-assessment/hooks/useInitialAssessmentEnterprise'
import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentQuestion,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'
import type { IaAutofillLevel } from '@/features/service-users/initial-assessment/utils/ia-autofill-dev'
import {
  IA_CONDITION_LEVEL_LABELS,
  IA_QA_DEMO_DATA_BUTTON_LABEL,
  IA_QA_DEMO_DATA_BUTTON_TOOLTIP,
} from '@/features/service-users/initial-assessment/utils/ia-autofill-levels'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip'

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

type SaveIndicator = 'idle' | 'saving' | 'saved' | 'error'

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

export default function ServiceUserInitialAssessmentEnterprisePage() {
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
  const activeHolisticTab = urlSearch.section ?? 1

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

  const { data: listData, isLoading: listLoading } = useServiceUsers(
    { limit: 100, sortBy: 'lastName', sortOrder: 'asc' },
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
  // QA Demo Data: questionIds populated in-memory by "Fill Demo Data". NOT marked dirty (so the
  // fill never auto-saves), but preserved across answer refetches so the values are not clobbered.
  const demoFilledQuestionIdsRef = React.useRef(new Set<string>())
  const skipAutosaveRef = React.useRef(true)
  const syncSaveQuestionIdsRef = React.useRef<Set<string>>(new Set())
  const sectionContentRef = React.useRef<HTMLDivElement>(null)
  /** Left-nav tab switch: show feedback before heavy section mount blocks the main thread. */
  const [pendingHolisticTab, setPendingHolisticTab] = React.useState<number | null>(null)
  const tabSwitchTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const tabSwitchLoading = pendingHolisticTab != null
  const sectionCommentsLocalEditRef = React.useRef(false)
  const sectionCommentDraftRef = React.useRef<Record<string, string>>({})
  const saveSectionInProgressRef = React.useRef(false)
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
    const isFirstHydration = !answersHydratedRef.current

    setDraftAnswers((prev) => {
      let next: Record<string, InitialAssessmentAnswerInput>
      if (isFirstHydration) {
        next = gateSynced
      } else {
        // Preserve locally-edited (dirty) AND in-memory demo-filled answers so a refetch does
        // not clobber values the user has not saved yet.
        const preserveIds = new Set<string>([
          ...dirtyAnswerQuestionIdsRef.current,
          ...demoFilledQuestionIdsRef.current,
        ])
        if (!preserveIds.size) {
          next = gateSynced
        } else {
          const merged = { ...gateSynced }
          for (const id of preserveIds) {
            if (prev[id]) merged[id] = prev[id]
          }
          next = syncDerivedConcernGates(sections, merged).answers
        }
      }
      return draftAnswersEqual(prev, next) ? prev : next
    })

    answersHydratedRef.current = true
    const t = window.setTimeout(() => {
      skipAutosaveRef.current = false
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
    const equipmentGate = sec12.questions.find(
      (x) =>
        x.metadata?.fieldKey === 'clinicalEquipmentInUse' ||
        x.questionText.toLowerCase().includes('hoist / profiling bed'),
    )
    return (
      (hoistSling ? isYesAnswer(draftAnswers[hoistSling.id]) : false) ||
      (equipmentGate ? isYesAnswer(draftAnswers[equipmentGate.id]) : false)
    )
  }, [sections, draftAnswers])

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

  const clientValidation = React.useMemo(
    () =>
      getSubmitValidationIssues({
        sections,
        draftAnswers,
        waterlow,
        adl,
        status: submission?.status,
        agencySettings,
        progressContext,
      }),
    [sections, draftAnswers, waterlow, adl, submission?.status, agencySettings, progressContext],
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

  const holisticTabNavStatus = React.useMemo(
    () =>
      buildHolisticTabNavStatus({
        tabs: HOLISTIC_ASSESSMENT_TABS,
        sections,
        visibleQuestionsBySection,
        draftAnswers,
        editable,
        progressContext,
        sectionBlocks: validationMaps.sectionBlocks,
        sectionWarnings: validationMaps.sectionWarnings,
        questionErrors: validationMaps.questionErrors,
        revealFieldErrors: validationRevealed,
        waterlowComplete: computeWaterlowScore(waterlow) > 0,
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
        carePlanObjectivesComplete: isCarePlanObjectivesComplete(carePlanObjectives),
        mentalCapacityChecklistComplete: isMentalCapacityChecklistComplete(mentalCapacityChecklist),
        photographyConsentComplete: isPhotographyConsentComplete(photographyConsent),
        equipmentSelectionComplete: isEquipmentSelectionComplete(equipmentSelection),
      }),
    [
      sections,
      visibleQuestionsBySection,
      draftAnswers,
      editable,
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
      mentalCapacityChecklist,
      photographyConsent,
      equipmentSelection,
    ],
  )

  const openSubmitReview = React.useCallback(() => {
    setValidationRevealed(true)
    setSubmitModalOpen(true)
  }, [])

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
    (n: number) => {
      const tabId = holisticTabById(n) ? n : firstHolisticTabForEnterpriseSection(n)
      goToHolisticTab(tabId)
    },
    [goToHolisticTab],
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
      17: mentalCapacityChecklist,
      18: photographyConsent,
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
        for (const id of gateSync.syncedQuestionIds) {
          syncSaveQuestionIdsRef.current.add(id)
          dirtyAnswerQuestionIdsRef.current.add(id)
        }
        if (draftAnswersEqual(prev, gateSync.answers)) return prev
        return gateSync.answers
      })
    },
    [sections],
  )

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

  /** Prefill identity/GP/LPOA into ACP / Photography when those tabs open (empty fields only). */
  const identityPrefillTabRef = React.useRef<number | null>(null)
  React.useEffect(() => {
    if (hubTab !== 'form' || sections.length === 0) return
    if (activeHolisticTab !== 13 && activeHolisticTab !== 18) {
      identityPrefillTabRef.current = null
      return
    }
    if (identityPrefillTabRef.current === activeHolisticTab) return
    identityPrefillTabRef.current = activeHolisticTab

    if (activeHolisticTab === 13) {
      const next = prefillAcpFromIdentityAnswers(sections, draftAnswers, advanceCarePlanning)
      if (next !== advanceCarePlanning) {
        setAdvanceCarePlanning(next)
        void persistMetadata({ advanceCarePlanning: next })
      }
    }
    if (activeHolisticTab === 18) {
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
    },
    [persistMetadata],
  )

  const onEnvironmentAssessmentChange = React.useCallback(
    (next: EnvironmentAssessmentMetadata) => {
      setEnvironmentAssessment(next)
      void persistMetadata({ environmentAssessment: next })
      syncEnvPetsToSection3(sections, next.pets, draftAnswers, onAnswerChange)
    },
    [persistMetadata, sections, draftAnswers, onAnswerChange],
  )

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

  const onCarePlanObjectivesChange = React.useCallback(
    (next: CarePlanObjectivesMetadata) => {
      setCarePlanObjectives(next)
      void persistMetadata({ carePlanObjectives: next })
    },
    [persistMetadata],
  )

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
      const next =
        typeof updater === 'function' ? updater(mentalCapacityChecklistRef.current) : updater
      mentalCapacityChecklistRef.current = next
      setMentalCapacityChecklist(next)
      scheduleMentalCapacityPersist(next, options?.immediate ?? false)
    },
    [scheduleMentalCapacityPersist],
  )

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
      try {
        await persistMetadata({
          sectionComments: { [key]: entry ?? '' },
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
        break
      case 'mental-capacity-checklist':
        patch.mentalCapacityChecklist = mentalCapacityChecklist
        break
      case 'photography-consent':
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
    mentalCapacityChecklist,
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

  const persistTabAnswers = React.useCallback(
    async (questions: InitialAssessmentQuestion[], silent = false) => {
      if (!submissionId || !editable || !canUpdate) return
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
      syncSaveQuestionIdsRef.current.clear()
      const tabLabel = holisticTabTitle(currentHolisticTab.id)
      if (answers.length === 0) {
        if (!silent) {
          setSaveIndicator('saved')
          toastSuccess('Saved', `${tabLabel} saved.`)
        }
        return
      }
      setSaveIndicator('saving')
      const savedQuestionIds = answers.map((a) => a.questionId)
      try {
        await saveMutation.mutateAsync(answers)
        for (const id of savedQuestionIds) {
          dirtyAnswerQuestionIdsRef.current.delete(id)
          const saved = draftForSave[id]
          if (saved) serverBaselineAnswersRef.current[id] = saved
        }
        if (draftForSave !== draftAnswers) {
          setDraftAnswers((prev) => ({ ...prev, ...draftForSave }))
        }
        setSaveIndicator('saved')
        if (!silent) toastSuccess('Saved', `${tabLabel} saved.`)
      } catch (e) {
        setSaveIndicator('error')
        if (!silent) toastApiError(e, 'Save failed')
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
    ],
  )

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
  }, [draftAnswers, currentTabQuestions, editable, canUpdate, persistTabAnswers, submitModalOpen])

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
    sectionCommentsLocalEditRef.current = true
    try {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur()
        await new Promise<void>((resolve) => window.setTimeout(resolve, 0))
      }
      const commentText = resolveSectionCommentText(activeHolisticTab)
      await flushHolisticTabMetadata()
      await persistSectionComment(activeHolisticTab, commentText)
      await persistTabAnswers(
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
    const dirtyIds = [...dirtyAnswerQuestionIdsRef.current]
    if (dirtyIds.length > 0) {
      const dirtyQuestions = sections
        .flatMap((s) => s.questions)
        .filter((q) => dirtyIds.includes(q.id))
      await persistTabAnswers(dirtyQuestions, true)
      if (dirtyAnswerQuestionIdsRef.current.size > 0) {
        toastApiError(new Error('Some answers could not be saved'), 'Save failed')
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
    sections,
    persistTabAnswers,
  ])

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
            section: 1,
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
    try {
      await submitMutation.mutateAsync(
        skipIncompleteValidation ? { skipIncompleteValidation: true } : undefined,
      )
      setSubmitModalOpen(false)
      setHubTab('schedule')
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
          <Select value={selectedId || '_none'} onValueChange={(v) => onCustomerChange(v === '_none' ? '' : v)}>
            <SelectTrigger id="ia-enterprise-su">
              <SelectValue placeholder="Select a service user…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">Select a service user…</SelectItem>
              {selectedId && !selectedInList && detailQuery.data ? (
                <SelectItem value={selectedId}>{serviceUserDetailLabel(detailQuery.data)}</SelectItem>
              ) : null}
              {serviceUsers.map((su) => (
                <SelectItem key={su.id} value={su.id}>
                  {customerLabel(su)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                  {saveIndicator === 'saving' ? 'Saving…' : saveIndicator === 'saved' ? 'All changes saved' : 'Save failed'}
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
                    .then(() => toastSuccess('Reviewed', 'Assessment marked reviewed.'))
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
                serviceUserId={selectedId}
                submissionId={submissionId}
                recommendations={summaryQuery.data?.carePlanRecommendations ?? []}
                submissionStatus={submission?.status}
                canDecide={(canReview || canUpdate) && submission?.status === 'REVIEWED'}
                canCreate={canUpdate}
                onGoToSection={(n) => goToSection(n)}
              />
              <InitialAssessmentActionsPanel
                serviceUserId={selectedId}
                submissionId={submissionId}
                canUpdate={canUpdate}
                editable={editable}
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
                  {HOLISTIC_ASSESSMENT_TABS.map((tab) => {
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
                        </span>
                      </button>
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
                      currentHolisticTab.kind !== 'mental-capacity-checklist' &&
                      currentHolisticTab.kind !== 'photography-consent' ? (
                        <h2 className={IA_SECTION_TITLE_CLASS}>
                          {holisticTabDisplayNumber(currentHolisticTab)}. {holisticTabTitle(currentHolisticTab.id)}
                        </h2>
                      ) : null}
                      <InitialAssessmentDocumentTabContent
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
                        mentalCapacityChecklist={mentalCapacityChecklist}
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
                        onMustAssessmentChange={onMustAssessmentChange}
                        onFallsScreeningChange={onFallsScreeningChange}
                        onMovingHandlingOperationsChange={onMovingHandlingOperationsChange}
                        onEnvironmentAssessmentChange={onEnvironmentAssessmentChange}
                        onAdvanceCarePlanningChange={onAdvanceCarePlanningChange}
                        onEndOfLifeAssessmentChange={onEndOfLifeAssessmentChange}
                        onClinicalOutcomeSummaryChange={onClinicalOutcomeSummaryChange}
                        onCarePlanObjectivesChange={onCarePlanObjectivesChange}
                        onMentalCapacityChecklistChange={onMentalCapacityChecklistChange}
                        onPhotographyConsentChange={onPhotographyConsentChange}
                        onEquipmentSelectionChange={onEquipmentSelectionChange}
                        onSkinIntegrityRowSideChange={onSkinIntegrityRowSideChange}
                        sectionFooter={sectionFooters[String(activeHolisticTab)]}
                        onSectionFooterChange={(patch) => onSectionFooterChange(activeHolisticTab, patch)}
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
                      {editable && canUpdate ? (
                        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                          <Button type="button" onClick={() => void saveSection()} disabled={saveMutation.isPending}>
                            Save section
                          </Button>
                          {canSubmit ? (
                            <Button type="button" variant="secondary" onClick={openSubmitReview}>
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
        submitting={submitMutation.isPending}
        validating={validateQuery.isLoading}
        flaggedRiskCount={riskQuery.data?.count}
        carePlanTriggerCount={triggersQuery.data?.count}
        openActionsCount={openActionsCount}
        onGoToSection={(n) => {
          setSubmitModalOpen(false)
          goToSection(n)
        }}
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
