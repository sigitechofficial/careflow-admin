import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { ClipboardCheck, FileCode2, FileDown, Loader2, TestTube2 } from 'lucide-react'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { ApiError } from '@/shared/api/api-client'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { type ServiceUserDetail, type ServiceUserListRow } from '@/features/service-users/types'
import { serviceUserKeys } from '@/features/service-users/keys'
import { useServiceUsers } from '@/features/service-users/hooks/useServiceUsers'
import { useServiceUser } from '@/features/service-users/hooks/useServiceUser'
import { useServiceUserDomCare } from '@/features/service-users/hooks/useServiceUserTabs'
import { useBodyMapSummary } from '@/features/service-users/body-map/hooks/useBodyMap'
import { useAuthStore } from '@/features/auth/store'
import { Label, Textarea } from '@/shared/ui/form-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'
import { InitialAssessmentSection12Content } from '@/features/service-users/initial-assessment/components/InitialAssessmentSection12Content'
import { InitialAssessmentAuditPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentAuditPanel'
import { InitialAssessmentBodyMapDialog } from '@/features/service-users/initial-assessment/components/InitialAssessmentBodyMapDialog'
import {
  InitialAssessmentHubTabs,
  type HubTabId,
} from '@/features/service-users/initial-assessment/components/InitialAssessmentHubTabs'
import { InitialAssessmentHubListPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentHubListPanel'
import { InitialAssessmentManagerReviewPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentManagerReviewPanel'
import { InitialAssessmentReopenDialog } from '@/features/service-users/initial-assessment/components/InitialAssessmentReopenDialog'
import { InitialAssessmentHtmlExportDialog } from '@/features/service-users/initial-assessment/components/InitialAssessmentHtmlExportDialog'
import { InitialAssessmentPdfDialog } from '@/features/service-users/initial-assessment/components/InitialAssessmentPdfDialog'
import { InitialAssessmentPlaywrightTestsDialog } from '@/features/service-users/initial-assessment/components/InitialAssessmentPlaywrightTestsDialog'
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
  syncWaterlowCompletedAnswer,
  waterlowTemplateQuestionIds,
} from '@/features/service-users/initial-assessment/utils/waterlow-questions'
import { computeWaterlowScore } from '@/features/service-users/initial-assessment/utils/waterlow-scoring'
import { InitialAssessmentSidePanels } from '@/features/service-users/initial-assessment/components/InitialAssessmentSidePanels'
import { InitialAssessmentSubmitDialog } from '@/features/service-users/initial-assessment/components/InitialAssessmentSubmitDialog'
import { InitialAssessmentVersionsPanel } from '@/features/service-users/initial-assessment/components/InitialAssessmentVersionsPanel'
import { InitialAssessmentSkinPressureSection } from '@/features/service-users/initial-assessment/components/InitialAssessmentSkinPressureSection'
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
} from '@/features/service-users/initial-assessment/utils/question-prefill'
import { prepareAnswersForSave } from '@/features/service-users/initial-assessment/utils/secure-field'
import { adlMetadataEqual } from '@/features/service-users/initial-assessment/utils/adl-scoring'
import {
  defaultAdlRows,
  mergeMetadataPatch,
  parseSubmissionMetadata,
  type SectionCommentEntry,
} from '@/features/service-users/initial-assessment/utils/submission-metadata'
import { applyNoConcernLogic } from '@/features/service-users/initial-assessment/utils/no-concern-logic'
import { applyCrossFieldSync, collectAnswersForSave } from '@/features/service-users/initial-assessment/utils/cross-field-sync'
import { batchRequiresCorrectionReason } from '@/features/service-users/initial-assessment/utils/answer-correction-check'
import { syncDerivedConcernGates } from '@/features/service-users/initial-assessment/utils/concern-gate-utils'
import { practicalCareHasAssistanceNeeds } from '@/features/service-users/initial-assessment/utils/practical-care-utils'
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
import {
  buildVitalsValidationErrors,
} from '@/features/service-users/initial-assessment/utils/vitals-validation'
import { buildValidationMaps } from '@/features/service-users/initial-assessment/utils/validation-maps'
import { section12PanelExcludedIds } from '@/features/service-users/initial-assessment/utils/section-12-panel-exclusions'
import {
  buildInitialAssessmentEnterpriseSearch,
  parseInitialAssessmentEnterpriseSearch,
  type InitialAssessmentEnterpriseSearch,
} from '@/features/service-users/initial-assessment/utils/initial-assessment-url-search'
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
  InitialAssessmentSection,
  InitialAssessmentStatus,
} from '@/features/service-users/initial-assessment/types'
import { initialAssessmentKeys } from '@/features/service-users/initial-assessment/keys'
import { runIaAutofillDev } from '@/features/service-users/initial-assessment/utils/ia-autofill-dev'
import { iaAutofillLevelUi } from '@/features/service-users/initial-assessment/utils/ia-autofill-levels'

const ENTERPRISE_PATH = '/service-users/initial-assessment'
const LEGACY_PATH = '/service-users/initial-assessment-checklist'

const EDITABLE: InitialAssessmentStatus[] = ['DRAFT', 'IN_PROGRESS']
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

function sectionHasDirtyAnswers(
  section: InitialAssessmentSection,
  dirtyIds: Set<string>,
): boolean {
  return section.questions.some((q) => dirtyIds.has(q.id))
}

type SaveIndicator = 'idle' | 'saving' | 'saved' | 'error'

function customerLabel(row: ServiceUserListRow): string {
  const name = row.preferredName?.trim() || [row.firstName, row.lastName].filter(Boolean).join(' ')
  const num = row.serviceUserNumber ? ` (${row.serviceUserNumber})` : ''
  return `${name}${num}`.trim() || row.id
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
  const activeSection = urlSearch.section ?? 1

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
  const bodyMapSummaryQuery = useBodyMapSummary(selectedId)

  const [submissionId, setSubmissionId] = React.useState<string | null>(null)
  const [draftAnswers, setDraftAnswers] = React.useState<Record<string, InitialAssessmentAnswerInput>>({})
  const [sectionComments, setSectionComments] = React.useState<Record<string, SectionCommentEntry>>({})
  const [waterlow, setWaterlow] = React.useState(parseSubmissionMetadata(undefined).waterlow)
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
  const [bodyMapOpen, setBodyMapOpen] = React.useState(false)
  const [reviewNotes, setReviewNotes] = React.useState('')
  const [reopenOpen, setReopenOpen] = React.useState(false)
  const [reopenReason, setReopenReason] = React.useState('')
  const answersHydratedRef = React.useRef(false)
  const serverBaselineAnswersRef = React.useRef<Record<string, InitialAssessmentAnswerInput>>({})
  const correctionReasonRef = React.useRef<HTMLTextAreaElement>(null)
  const dirtyAnswerQuestionIdsRef = React.useRef(new Set<string>())
  const skipAutosaveRef = React.useRef(true)
  const syncSaveQuestionIdsRef = React.useRef<Set<string>>(new Set())
  const sectionContentRef = React.useRef<HTMLDivElement>(null)

  const answersQuery = useInitialAssessmentAnswers(selectedId, submissionId)
  const actionsQuery = useInitialAssessmentActions(selectedId, submissionId, hasApi && canRead && !!submissionId)
  const summaryQuery = useInitialAssessmentSummary(selectedId, submissionId, hasApi && canRead && !!submissionId)
  const agencySettingsQuery = useInitialAssessmentAgencySettings(hasApi && canRead)
  const agencySettings =
    summaryQuery.data?.agencySettings ??
    agencySettingsQuery.data ??
    DEFAULT_INITIAL_ASSESSMENT_AGENCY_SETTINGS
  const openActionsCount =
    actionsQuery.data?.filter((a) => a.status === 'OPEN' || a.status === 'IN_PROGRESS').length ?? 0
  const riskQuery = useInitialAssessmentRiskSummary(selectedId, submissionId)
  const triggersQuery = useInitialAssessmentCarePlanTriggers(selectedId, submissionId)
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
    () => submissionsQuery.data?.find((s) => s.id === submissionId) ?? submissionsQuery.data?.[0],
    [submissionsQuery.data, submissionId],
  )

  const openHtmlExport = React.useCallback(() => {
    if (!submission?.id) return
    setHtmlExportOpen(true)
  }, [submission?.id])

  const [iaAutofillRunning, setIaAutofillRunning] = React.useState<
    'low' | 'normal' | 'critical' | null
  >(null)
  const [playwrightTestsOpen, setPlaywrightTestsOpen] = React.useState(false)

  const runIaPlaywrightAutofill = React.useCallback(
    async (level: 'low' | 'normal' | 'critical') => {
      if (!selectedId || iaAutofillRunning) return
      setIaAutofillRunning(level)
      try {
        const ui = iaAutofillLevelUi(level)
        const message = await runIaAutofillDev(selectedId, level)
        toastSuccess(ui.completeToastTitle, message)
        await queryClient.invalidateQueries({ queryKey: initialAssessmentKeys.all() })
        if (submissionId) {
          await queryClient.invalidateQueries({
            queryKey: initialAssessmentKeys.submission(selectedId, submissionId),
          })
        }
      } catch (e) {
        toastApiError(e, iaAutofillLevelUi(level).failedToastTitle)
      } finally {
        setIaAutofillRunning(null)
      }
    },
    [selectedId, submissionId, iaAutofillRunning, queryClient],
  )

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
    const rows = submissionsQuery.data
    if (!rows?.length) {
      setSubmissionId(null)
      return
    }
    const active = rows.find((r) => EDITABLE.includes(r.status))
    setSubmissionId((prev) => prev ?? active?.id ?? rows[0]?.id ?? null)
  }, [submissionsQuery.data])

  React.useEffect(() => {
    setReviewNotes(submission?.reviewNotes ?? '')
  }, [submission?.id, submission?.reviewNotes])

  React.useEffect(() => {
    const parsed = parseSubmissionMetadata(submission)
    setSectionComments(parsed.sectionComments)
    setWaterlow((prev) => (prev === parsed.waterlow ? prev : parsed.waterlow))
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
    const submissionEditable = submission ? EDITABLE.includes(submission.status) : false
    const prefill = buildPrefillMap({ detail: detailQuery.data, domCare: domCareQuery.data })
    const merged =
      submissionEditable && sections.length > 0 && prefill.size > 0
        ? applyPrefillToDraftAnswers(sections, map, prefill)
        : map
    const { answers: gateSynced } = syncDerivedConcernGates(sections, merged)
    const isFirstHydration = !answersHydratedRef.current

    setDraftAnswers((prev) => {
      if (isFirstHydration) return gateSynced
      const dirty = dirtyAnswerQuestionIdsRef.current
      if (!dirty.size) return gateSynced
      const next = { ...gateSynced }
      for (const id of dirty) {
        if (prev[id]) next[id] = prev[id]
      }
      return syncDerivedConcernGates(sections, next).answers
    })

    answersHydratedRef.current = true
    const t = window.setTimeout(() => {
      skipAutosaveRef.current = false
    }, 0)
    return () => window.clearTimeout(t)
  }, [
    answersQuery.data,
    detailQuery.data,
    domCareQuery.data,
    sections,
    submission?.status,
  ])
  const waterlowExcludedIds = React.useMemo(() => waterlowTemplateQuestionIds(sections), [sections])
  const currentSection = sections.find((s) => s.sectionNumber === activeSection)
  const editable = submission ? EDITABLE.includes(submission.status) : false

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
      hubTabExcludedIds: waterlowExcludedIds,
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
    waterlowExcludedIds,
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
    () => buildVitalsValidationErrors(sections, draftAnswers),
    [sections, draftAnswers],
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

  const goToWaterlowTab = React.useCallback(() => setHubTab('waterlow'), [setHubTab])

  const goToSection = React.useCallback(
    (n: number) => setActiveSection(n),
    [setActiveSection],
  )

  React.useEffect(() => {
    if (sections.length === 0) return
    if (!sections.some((s) => s.sectionNumber === activeSection)) {
      patchUrlSearch({ section: sections[0]!.sectionNumber })
    }
  }, [sections, activeSection, patchUrlSearch])

  React.useEffect(() => {
    if (hubTab !== 'form') return
    sectionContentRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [activeSection, hubTab])
  const overallPercent = React.useMemo(
    () => validateQuery.data?.overallPercent ?? overallAssessmentProgress(sections, draftAnswers, progressContext),
    [validateQuery.data?.overallPercent, sections, draftAnswers, progressContext],
  )
  const sectionCommentCount = React.useMemo(
    () => Object.values(sectionComments).filter((c) => c?.text?.trim()).length,
    [sectionComments],
  )

  const prefillMap = React.useMemo(
    () => buildPrefillMap({ detail: detailQuery.data, domCare: domCareQuery.data }),
    [detailQuery.data, domCareQuery.data],
  )

  const showBodyMapCta = React.useMemo(() => {
    const sec11 = sections.find((s) => s.sectionNumber === 11)
    if (!sec11) return false
    return sec11.questions.some((q) => {
      const a = draftAnswers[q.id]
      const flagged = a?.checked === true || a?.booleanValue === true
      return (
        flagged &&
        (q.metadata?.bodyMapModule === true ||
          q.questionText.toLowerCase().includes('body map') ||
          q.questionText.toLowerCase().includes('wound'))
      )
    })
  }, [sections, draftAnswers])

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

  const correctionRequired = React.useMemo(() => {
    const meta = submission?.metadata
    if (!meta || typeof meta !== 'object') return false
    return (meta as Record<string, unknown>).correctionRequired === true
  }, [submission?.metadata])

  const [correctionReason, setCorrectionReason] = React.useState('')

  const excludeQuestionIds = React.useMemo(() => {
    const ids = new Set<string>(waterlowExcludedIds)
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
  }, [waterlowExcludedIds, section12FinanceRequired, financeConsentQuestion, sections])

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
        const afterNoConcern = currentSection
          ? applyNoConcernLogic(currentSection, questionId, merged, prev)
          : { ...prev, [questionId]: merged }
        const { answers, syncedQuestionIds } = applyCrossFieldSync(
          sections,
          questionId,
          merged,
          afterNoConcern,
        )
        for (const id of syncedQuestionIds) syncSaveQuestionIdsRef.current.add(id)
        const gateSync = syncDerivedConcernGates(sections, answers)
        for (const id of gateSync.syncedQuestionIds) syncSaveQuestionIdsRef.current.add(id)
        return gateSync.answers
      })
    },
    [currentSection, sections],
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
      const merged = mergeMetadataPatch(submission?.metadata, patch)
      try {
        await updateSubmissionMutation.mutateAsync({ metadata: merged })
      } catch (e) {
        toastApiError(e, 'Could not save assessment notes')
      }
    },
    [submissionId, editable, canUpdate, submission?.metadata, updateSubmissionMutation],
  )

  const onWaterlowChange = React.useCallback(
    (next: typeof waterlow) => {
      setWaterlow(next)
      void persistMetadata({ waterlow: next })
      syncWaterlowCompletedAnswer(sections, next, onAnswerChange)
    },
    [sections, persistMetadata, onAnswerChange],
  )

  const persistSectionComment = React.useCallback(
    async (sectionNumber: number, entry: SectionCommentEntry | undefined) => {
      const key = String(sectionNumber)
      setSectionComments((prev) => {
        const next = { ...prev }
        if (entry?.text?.trim()) next[key] = entry
        else delete next[key]
        return next
      })
      await persistMetadata({ sectionComments: { [key]: entry?.text?.trim() ? entry : '' } })
    },
    [persistMetadata],
  )

  const persistSectionAnswers = React.useCallback(
    async (section: InitialAssessmentSection, silent = false) => {
      if (!submissionId || !editable || !canUpdate) return
      const extraIds = [...syncSaveQuestionIdsRef.current]
      const syncedQuestions = sections
        .flatMap((s) => s.questions)
        .filter((q) => syncSaveQuestionIdsRef.current.has(q.id))
      const questionsForSave = section.questions.concat(syncedQuestions)
      const answers = prepareAnswersForSave(
        questionsForSave,
        collectAnswersForSave(section, draftAnswers, extraIds),
      )
      syncSaveQuestionIdsRef.current.clear()
      if (answers.length === 0) return
      const needsCorrectionReason =
        correctionRequired &&
        batchRequiresCorrectionReason(
          questionsForSave,
          serverBaselineAnswersRef.current,
          draftAnswers,
          answers.map((a) => a.questionId),
        )
      if (needsCorrectionReason && correctionReason.trim().length < 10) {
        if (!silent) {
          correctionReasonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          correctionReasonRef.current?.focus()
          toastApiError(
            new Error(
              'Correction reason required (min 10 characters) when changing answers that were already saved',
            ),
            'Save failed',
          )
        }
        setSaveIndicator('error')
        return
      }
      setSaveIndicator('saving')
      const savedQuestionIds = answers.map((a) => a.questionId)
      try {
        await saveMutation.mutateAsync(
          needsCorrectionReason
            ? { answers, correctionReason: correctionReason.trim() }
            : answers,
        )
        for (const id of savedQuestionIds) {
          dirtyAnswerQuestionIdsRef.current.delete(id)
          const saved = draftAnswers[id]
          if (saved) serverBaselineAnswersRef.current[id] = saved
        }
        setSaveIndicator('saved')
        if (!silent) toastSuccess('Saved', `Section ${section.sectionNumber} saved.`)
      } catch (e) {
        setSaveIndicator('error')
        if (!silent) toastApiError(e, 'Save failed')
      }
    },
    [submissionId, editable, canUpdate, draftAnswers, saveMutation, sections, correctionRequired, correctionReason],
  )

  React.useEffect(() => {
    if (!currentSection || !editable || !canUpdate || !answersHydratedRef.current) return
    if (submitModalOpen) return
    if (skipAutosaveRef.current) return
    if (!sectionHasDirtyAnswers(currentSection, dirtyAnswerQuestionIdsRef.current)) return
    const timer = window.setTimeout(() => {
      if (!sectionHasDirtyAnswers(currentSection, dirtyAnswerQuestionIdsRef.current)) return
      void persistSectionAnswers(currentSection, true)
    }, AUTOSAVE_MS)
    return () => window.clearTimeout(timer)
  }, [draftAnswers, currentSection, editable, canUpdate, persistSectionAnswers, submitModalOpen])

  const onCustomerChange = (id: string) => {
    void navigate({
      to: ENTERPRISE_PATH,
      search: id ? { serviceUserId: id } : {},
      replace: true,
    })
    setSubmissionId(null)
    setDraftAnswers({})
    dirtyAnswerQuestionIdsRef.current.clear()
  }

  const startAssessment = async () => {
    if (!canCreate) return
    try {
      const created = await createMutation.mutateAsync()
      setSubmissionId(created.id)
      patchUrlSearch({ section: 1, tab: 'form' })
      toastSuccess('Assessment started', 'Enterprise initial assessment draft created.')
    } catch (e) {
      toastApiError(e, 'Could not start assessment')
    }
  }

  const saveSection = async () => {
    if (!currentSection) return
    await persistSectionComment(activeSection, sectionComments[String(activeSection)])
    await persistSectionAnswers(currentSection, false)
  }

  const selectSubmission = (id: string) => {
    setSubmissionId(id)
    setDraftAnswers({})
    dirtyAnswerQuestionIdsRef.current.clear()
    answersHydratedRef.current = false
    skipAutosaveRef.current = true
    patchUrlSearch({ section: 1, tab: 'form' })
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
      toastSuccess(
        'Submitted',
        skipIncompleteValidation
          ? 'Assessment submitted incomplete — manager review required.'
          : 'Assessment submitted and locked.',
      )
    } catch (e) {
      toastApiError(e, 'Submit failed')
    }
  }

  if (!hasApi) {
    return <p className="p-6 text-sm text-muted-foreground">Configure VITE_API_BASE_URL to load assessments.</p>
  }

  if (!canRead) {
    return <p className="p-6 text-sm text-destructive">You do not have permission to view initial assessments.</p>
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6" data-testid="initial-assessment-enterprise-page">
      <div className="flex flex-wrap items-center gap-3">
        <ClipboardCheck className="h-7 w-7 text-teal-700 dark:text-teal-400" aria-hidden />
        <h1 className="text-xl font-bold md:text-2xl">Initial Assessment</h1>
        <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-900 dark:bg-teal-950 dark:text-teal-200">
          Enterprise
        </span>
      </div>

      <div className="max-w-xl space-y-2 rounded-xl border border-border bg-card p-4 shadow-sm">
        <Label htmlFor="ia-enterprise-su">
          Service user <span className="text-destructive">*</span>
        </Label>
        {listLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : (
          <Select value={selectedId || '_none'} onValueChange={(v) => onCustomerChange(v === '_none' ? '' : v)}>
            <SelectTrigger id="ia-enterprise-su">
              <SelectValue placeholder="Select a service user…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">Select a service user…</SelectItem>
              {serviceUsers.map((su) => (
                <SelectItem key={su.id} value={su.id}>
                  {customerLabel(su)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {!selectedId ? (
        <div className="rounded-lg border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
          Select a service user to open the enterprise assessment.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
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
              {!submission && canCreate ? (
                <Button type="button" size="sm" onClick={() => void startAssessment()} disabled={createMutation.isPending}>
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
              <Button type="button" size="sm" variant="outline" asChild>
                <Link to={LEGACY_PATH} search={{ serviceUserId: selectedId }}>
                  Legacy checklist
                </Link>
              </Button>
            </div>
            {selectedId && canUpdate ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="shrink-0"
                  data-testid="ia-playwright-tests-open"
                  onClick={() => setPlaywrightTestsOpen(true)}
                >
                  <TestTube2 className="mr-2 h-4 w-4" />
                  Playwright Tests
                </Button>
                <InitialAssessmentPlaywrightTestsDialog
                  open={playwrightTestsOpen}
                  onOpenChange={setPlaywrightTestsOpen}
                  runningLevel={iaAutofillRunning}
                  onRun={runIaPlaywrightAutofill}
                />
              </>
            ) : null}
          </div>

          <InitialAssessmentHubTabs
            active={hubTab}
            submissionCount={submissionsQuery.data?.length}
            openActionsCount={openActionsCount}
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
              <InitialAssessmentCareActivationPanel careActivation={summaryQuery.data?.careActivation} />
              <InitialAssessmentSchedulePanel
                submission={submission}
                sections={sections}
                draftAnswers={draftAnswers}
              />
              <InitialAssessmentCarePlanRecommendationsPanel
                serviceUserId={selectedId}
                submissionId={submissionId}
                recommendations={summaryQuery.data?.carePlanRecommendations ?? []}
                canDecide={canReview && (submission?.status === 'SUBMITTED' || submission?.status === 'REVIEWED')}
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
                serviceUserDetail={detailQuery.data}
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

              {editable && correctionRequired ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/30">
                  <p className="text-sm font-medium text-amber-950 dark:text-amber-100">
                    Post-reopen correction
                  </p>
                  <p className="mt-1 text-xs text-amber-900/80 dark:text-amber-200/80">
                    This assessment was reopened for corrections. You can save new answers in empty fields
                    without a reason. A correction reason (min 10 characters) is only required when you
                    change answers that were already saved.
                  </p>
                  <div className="mt-3">
                    <Label htmlFor="ia-correction-reason">Correction reason (when changing saved answers)</Label>
                    <Textarea
                      ref={correctionReasonRef}
                      id="ia-correction-reason"
                      rows={2}
                      className="mt-1 bg-background"
                      value={correctionReason}
                      onChange={(e) => setCorrectionReason(e.target.value)}
                      placeholder="e.g. Updated section 11 after district nurse review…"
                    />
                  </div>
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
                activeSection={activeSection}
                canUpdate={canUpdate}
                editable={editable}
              />

              <div className="grid grid-cols-1 items-start gap-6 min-[900px]:grid-cols-[minmax(220px,260px)_minmax(0,1fr)] min-[1200px]:grid-cols-[minmax(260px,300px)_minmax(0,1fr)_minmax(260px,320px)]">
                <nav
                  data-testid="ia-section-nav"
                  className="flex max-h-[calc(100vh-7rem)] flex-col gap-1 overflow-y-auto rounded-xl border border-border bg-card p-2 shadow-sm min-[900px]:sticky min-[900px]:top-4 min-[900px]:self-start"
                >
                  {sections.map((sec) => {
                    const prog = sectionProgress(sec, draftAnswers, sections, progressContext)
                    const hasComment = Boolean(sectionComments[String(sec.sectionNumber)]?.text?.trim())
                    const navStatus = validationMaps.sectionNavStatus.get(sec.sectionNumber) ?? 'ok'
                    return (
                      <button
                        key={sec.id}
                        type="button"
                        className={cn(
                          IA_FORM_NAV_BUTTON_CLASS,
                          activeSection === sec.sectionNumber
                            ? 'bg-teal-900 text-white dark:bg-teal-800'
                            : 'hover:bg-muted',
                        )}
                        onClick={() => goToSection(sec.sectionNumber)}
                      >
                        <span className="flex items-center gap-1.5">
                          <span className="font-semibold">{sec.sectionNumber}.</span>
                          <span className="min-w-0 flex-1">{sec.title}</span>
                          {navStatus === 'blocking' ? (
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
                        </span>
                        <span className={IA_FORM_NAV_META_CLASS}>{formatSectionNavMeta(prog)}</span>
                      </button>
                    )
                  })}
                </nav>

                <div
                  ref={sectionContentRef}
                  key={currentSection?.id ?? `section-${activeSection}`}
                  className={cn('min-w-0 space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm', IA_FORM_ROOT_CLASS)}
                >
                  {currentSection ? (
                    <>
                      {currentSection.sectionNumber !== 11 ? (
                        <h2 className={IA_SECTION_TITLE_CLASS}>
                          {currentSection.sectionNumber}. {currentSection.title}
                        </h2>
                      ) : null}
                      {currentSection.sectionNumber === 11 ? (
                        <InitialAssessmentSkinPressureSection
                          key={currentSection.id}
                          section={currentSection}
                          allSections={sections}
                          draftAnswers={draftAnswers}
                          prefillMap={prefillMap}
                          questionErrors={validationMaps.questionErrors}
                          disabled={!editable || !canUpdate}
                          serviceUserId={selectedId}
                          submissionId={submissionId}
                          serviceUserDetail={detailQuery.data}
                          excludeQuestionIds={excludeQuestionIds}
                          showBodyMapCta={showBodyMapCta}
                          onOpenBodyMap={() => setBodyMapOpen(true)}
                          onOpenWaterlowTab={goToWaterlowTab}
                          onChange={onAnswerChange}
                        />
                      ) : null}
                      {currentSection.sectionNumber === 12 ? (
                        <InitialAssessmentSection12Content
                          key={currentSection.id}
                          section={currentSection}
                          allSections={sections}
                          draftAnswers={draftAnswers}
                          prefillMap={prefillMap}
                          questionErrors={validationMaps.questionErrors}
                          disabled={!editable || !canUpdate}
                          serviceUserId={selectedId}
                          submissionId={submissionId}
                          excludeQuestionIds={excludeQuestionIds}
                          adl={adl}
                          transfers={transfers}
                          equipmentChecklist={equipmentChecklist}
                          equipmentChecklistVisible={section12EquipmentVisible}
                          dailyLivingAids={dailyLivingAids}
                          practicalCare={practicalCare}
                          financeSupport={financeSupport}
                          financeSupportVisible={section12FinanceRequired}
                          financeConsentQuestion={financeConsentQuestion}
                          renderFinanceConsentField={
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
                              : undefined
                          }
                          onAdlChange={(next) => {
                            setAdl(next)
                            void persistMetadata({ adl: next })
                          }}
                          onTransfersChange={(next) => {
                            setTransfers(next)
                            void persistMetadata({ transfers: next })
                          }}
                          onEquipmentChecklistChange={(next) => {
                            setEquipmentChecklist(next)
                            void persistMetadata({ equipmentChecklist: next })
                          }}
                          onDailyLivingAidsChange={(next) => {
                            setDailyLivingAids(next)
                            void persistMetadata({ dailyLivingAids: next })
                          }}
                          onPracticalCareChange={(next) => {
                            setPracticalCare(next)
                            void persistMetadata({ practicalCare: next })
                            const sec12 = sections.find((s) => s.sectionNumber === 12)
                            const domesticQ = sec12?.questions.find((q) =>
                              q.questionText.toLowerCase().includes('domestic support required'),
                            )
                            if (domesticQ && practicalCareHasAssistanceNeeds(next)) {
                              onAnswerChange(domesticQ.id, {
                                questionId: domesticQ.id,
                                checked: true,
                                booleanValue: true,
                              })
                            }
                          }}
                          onFinanceSupportChange={(next) => {
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
                          }}
                          onChange={onAnswerChange}
                        />
                      ) : currentSection.sectionNumber !== 11 ? (
                        <InitialAssessmentSectionQuestions
                          key={currentSection.id}
                          section={currentSection}
                          allSections={sections}
                          draftAnswers={draftAnswers}
                          prefillMap={prefillMap}
                          questionErrors={validationMaps.questionErrors}
                          disabled={!editable || !canUpdate}
                          serviceUserId={selectedId}
                          submissionId={submissionId}
                          serviceUserDetail={detailQuery.data}
                          onSyncEmergencyContact={syncEmergencyContactFromProfile}
                          onMarkMedicationVerified={markMedicationListVerified}
                          excludeQuestionIds={excludeQuestionIds}
                          onChange={onAnswerChange}
                        />
                      ) : null}
                      {currentSection.sectionNumber === 14 ? (
                        <InitialAssessmentSignOffPanel
                          section={currentSection}
                          allSections={sections}
                          draftAnswers={draftAnswers}
                          questionErrors={validationMaps.questionErrors}
                          disabled={!editable || !canUpdate}
                          serviceUserId={selectedId}
                          submissionId={submissionId}
                          onChange={onAnswerChange}
                        />
                      ) : null}
                      {currentSection.sectionNumber === 13 ? (
                        <InitialAssessmentRiskRecordsPanel
                          serviceUserId={selectedId}
                          submissionId={submissionId}
                          canUpdate={canUpdate}
                          editable={editable}
                          compact
                        />
                      ) : null}
                      {showEmarCta && currentSection.sectionNumber === 9 && selectedId ? (
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
                        sectionNumber={currentSection.sectionNumber}
                        value={sectionComments[String(currentSection.sectionNumber)]?.text ?? ''}
                        disabled={!editable || !canUpdate}
                        onChange={(text) => {
                          const key = String(currentSection.sectionNumber)
                          setSectionComments((prev) => {
                            const next = { ...prev }
                            if (text.trim()) next[key] = { text }
                            else delete next[key]
                            return next
                          })
                        }}
                        onBlur={() =>
                          void persistSectionComment(
                            currentSection.sectionNumber,
                            sectionComments[String(currentSection.sectionNumber)],
                          )
                        }
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

                <aside className="hidden min-[1200px]:block min-[1200px]:sticky min-[1200px]:top-4 min-[1200px]:self-start">
                  <InitialAssessmentSidePanels
                    riskItems={riskQuery.data?.items ?? []}
                    riskCount={riskQuery.data?.count ?? 0}
                    triggerItems={triggersQuery.data?.items ?? []}
                    triggerCount={triggersQuery.data?.count ?? 0}
                    overallPercent={overallPercent}
                    sectionCommentCount={sectionCommentCount}
                    sectionTotal={sections.length}
                    onGoToSection={goToSection}
                  />
                </aside>
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

      <InitialAssessmentBodyMapDialog
        open={bodyMapOpen}
        onOpenChange={setBodyMapOpen}
        serviceUserId={selectedId}
        submissionId={submissionId}
        openRecordCount={bodyMapSummaryQuery.data?.activeCount}
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
    </div>
  )
}
