import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/store'
import { ApiError } from '@/shared/api/api-client'

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-router')>(
    '@tanstack/react-router',
  )
  return {
    ...actual,
    useParams: () => ({ serviceUserId: 'su-1' }),
    useNavigate: () => vi.fn(),
    useSearch: () => ({}),
    useRouterState: () => ({ location: { pathname: '/service-users/su-1/alerts' } }),
    Link: ({
      children,
      to,
      ...rest
    }: {
      children: React.ReactNode
      to: string
      [key: string]: unknown
    }) => (
      <a href={String(to)} {...rest}>
        {children}
      </a>
    ),
  }
})

vi.mock('@/shared/lib/toast', () => ({
  toastSuccess: vi.fn(),
  toastApiError: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('@/features/service-users/hooks/useServiceUser', () => ({
  useServiceUser: () => ({
    data: {
      id: 'su-1',
      firstName: 'Jane',
      lastName: 'Doe',
      preferredName: null,
      riskLevel: null,
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}))

vi.mock('@/features/service-users/components/ServiceUserModuleHeader', () => ({
  SERVICE_USER_MODULE_PAGE_CLASS: '',
  ServiceUserModuleHeader: () => <div data-testid="su-header" />,
}))

vi.mock('@/features/service-users/components/ServiceUserModuleTabs', () => ({
  ServiceUserModuleTabs: () => <div data-testid="su-tabs" />,
}))

const observationTypesFixture = vi.hoisted(() => [
  { id: 'ot-weight', code: 'WEIGHT', name: 'Weight', sortOrder: 1, valueKind: 'NUMERIC', usesNews2: false, unitLabel: 'kg' },
  { id: 'ot-height', code: 'HEIGHT', name: 'Height', sortOrder: 2, valueKind: 'NUMERIC', usesNews2: false, unitLabel: 'cm' },
  { id: 'ot-bp', code: 'BLOOD_PRESSURE', name: 'Blood Pressure', sortOrder: 3, valueKind: 'TEXT', usesNews2: false, unitLabel: null },
  { id: 'ot-bs', code: 'BLOOD_SUGAR', name: 'Blood Sugar', sortOrder: 4, valueKind: 'NUMERIC', usesNews2: false, unitLabel: 'mmol/L' },
  { id: 'ot-rr', code: 'RESPIRATION', name: 'Respiration Rate', sortOrder: 5, valueKind: 'NUMERIC', usesNews2: false, unitLabel: null },
  { id: 'ot-pulse', code: 'PULSE', name: 'Pulse Rate', sortOrder: 6, valueKind: 'NUMERIC', usesNews2: false, unitLabel: null },
  { id: 'ot-temp', code: 'TEMPERATURE', name: 'Temperature', sortOrder: 7, valueKind: 'NUMERIC', usesNews2: false, unitLabel: '°C' },
  { id: 'ot-spo2', code: 'OXYGEN_SATURATION', name: 'Oxygen Saturation', sortOrder: 8, valueKind: 'NUMERIC', usesNews2: false, unitLabel: '%' },
  { id: 'ot-resp-cond', code: 'RESPIRATORY_CONDITION', name: 'Respiratory Condition', sortOrder: 9, valueKind: 'TEXT', usesNews2: false, unitLabel: null },
])

vi.mock('@/features/service-users/hooks/useServiceUserObservations', () => ({
  useObservationTypes: () => ({
    data: observationTypesFixture,
    isLoading: false,
  }),
}))

vi.mock('@/features/service-users/hooks/useServiceUserCarePlanExtras', () => ({
  useServiceUserCarePlanExtras: () => ({
    documents: { data: { legal: null, dols: [] } },
    allergies: { data: [] },
  }),
}))

const medicalApi = vi.hoisted(() => ({
  listConditions: vi.fn(),
  createCondition: vi.fn(),
  updateCondition: vi.fn(),
  discontinueCondition: vi.fn(),
  catalog: vi.fn(),
  listAdjustments: vi.fn(),
  createAdjustment: vi.fn(),
  updateAdjustment: vi.fn(),
  deactivateAdjustment: vi.fn(),
  listHistory: vi.fn(),
  createHistory: vi.fn(),
  updateHistory: vi.fn(),
  deactivateHistory: vi.fn(),
  listMonitoring: vi.fn(),
  upsertMonitoring: vi.fn(),
  listUsual: vi.fn(),
  upsertUsual: vi.fn(),
  updateUsual: vi.fn(),
  deactivateUsual: vi.fn(),
}))

vi.mock('@/features/alerts/api/medical-clinical.api', () => ({
  listServiceUserMedicalConditions: (...a: unknown[]) => medicalApi.listConditions(...a),
  createServiceUserMedicalCondition: (...a: unknown[]) => medicalApi.createCondition(...a),
  updateServiceUserMedicalCondition: (...a: unknown[]) => medicalApi.updateCondition(...a),
  discontinueServiceUserMedicalCondition: (...a: unknown[]) =>
    medicalApi.discontinueCondition(...a),
  fetchMedicalConditionCatalog: (...a: unknown[]) => medicalApi.catalog(...a),
  listReasonableAdjustments: (...a: unknown[]) => medicalApi.listAdjustments(...a),
  createReasonableAdjustment: (...a: unknown[]) => medicalApi.createAdjustment(...a),
  updateReasonableAdjustment: (...a: unknown[]) => medicalApi.updateAdjustment(...a),
  deactivateReasonableAdjustment: (...a: unknown[]) => medicalApi.deactivateAdjustment(...a),
  listMedicalHistory: (...a: unknown[]) => medicalApi.listHistory(...a),
  createMedicalHistoryEvent: (...a: unknown[]) => medicalApi.createHistory(...a),
  updateMedicalHistoryEvent: (...a: unknown[]) => medicalApi.updateHistory(...a),
  deactivateMedicalHistoryEvent: (...a: unknown[]) => medicalApi.deactivateHistory(...a),
  listMonitoringConfig: (...a: unknown[]) => medicalApi.listMonitoring(...a),
  upsertMonitoringConfig: (...a: unknown[]) => medicalApi.upsertMonitoring(...a),
  deactivateMonitoringConfig: vi.fn(),
  listUsualParameters: (...a: unknown[]) => medicalApi.listUsual(...a),
  upsertUsualParameter: (...a: unknown[]) => medicalApi.upsertUsual(...a),
  updateUsualParameter: (...a: unknown[]) => medicalApi.updateUsual(...a),
  deactivateUsualParameter: (...a: unknown[]) => medicalApi.deactivateUsual(...a),
  fetchMedicalSafetySummary: vi.fn(async () => ({ serviceUserId: 'su-1' })),
}))

vi.mock('@/features/alerts/hooks/useServiceUserMedicalSafety', () => ({
  useServiceUserMedicalSafety: () => ({
    snapshot: {
      immediate: [],
      conditions: [],
      allergies: [
        {
          id: 'allergy-1',
          severity: 'HIGH',
          title: 'Nuts',
          description: 'Severe',
          sourceLabel: 'Service user allergies',
          updatedAt: null,
          link: null,
          group: 'allergies',
          kind: 'clinical',
        },
      ],
      safetyRisk: [],
      communication: [],
      conditionsUnavailable: false,
      communicationLimited: true,
    },
    medicalLoading: false,
    medicalError: false,
    sourceErrors: 0,
    iaRiskRecords: [],
    sourceReady: {
      iaRisks: true,
      conditions: true,
      documents: true,
      flash: true,
      allergies: true,
    },
    refetchMedical: vi.fn(),
    permissions: { canConditions: true },
  }),
}))

import ServiceUserAlertsPage from '@/features/alerts/pages/ServiceUserAlertsPage'
import { MedicalConditionsChecklist } from '@/features/alerts/medical-safety/MedicalConditionsChecklist'
import {
  MedicalHistoryClinical,
  ReasonableAdjustmentsClinical,
} from '@/features/alerts/medical-safety/AdjustmentsAndHistoryClinical'
import { ServiceUserParametersClinical } from '@/features/alerts/medical-safety/ServiceUserParametersClinical'
import { buildClinicalGates, MedicalAlertsClinicalBody } from '@/features/alerts/medical-safety/MedicalAlertsClinicalBody'

const ALL_PERMS = [
  'service_users.read',
  'service_users.medical_conditions.read',
  'service_users.medical_conditions.create',
  'service_users.medical_conditions.update',
  'service_users.medical_conditions.delete',
  'service_users.medical_adjustments.read',
  'service_users.medical_adjustments.create',
  'service_users.medical_adjustments.update',
  'service_users.medical_adjustments.delete',
  'service_users.medical_history.read',
  'service_users.medical_history.create',
  'service_users.medical_history.update',
  'service_users.medical_history.delete',
  'service_users.medical_monitoring.read',
  'service_users.medical_monitoring.update',
  'service_users.medical_usual_parameters.read',
  'service_users.medical_usual_parameters.update',
]

function renderWithClient(ui: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe('Phase 5 Medical Conditions & Alerts clinical UI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      permissions: ALL_PERMS,
      can: (p: string) => ALL_PERMS.includes(p),
    } as never)

    medicalApi.listConditions.mockResolvedValue([])
    medicalApi.catalog.mockResolvedValue([
      {
        id: 'cat-1',
        code: 'DIABETES',
        name: 'Diabetes',
        category: 'ENDOCRINE_METABOLIC',
        description: null,
        sortOrder: 1,
        isActive: true,
      },
    ])
    medicalApi.listAdjustments.mockResolvedValue([])
    medicalApi.listHistory.mockResolvedValue([])
    medicalApi.listMonitoring.mockResolvedValue([])
    medicalApi.listUsual.mockResolvedValue([])
  })

  it('page loads clinical record hierarchy without operational alerts', async () => {
    renderWithClient(<ServiceUserAlertsPage />)
    expect(await screen.findByTestId('su-alerts-page')).toBeInTheDocument()
    expect(screen.getByTestId('medical-conditions-checklist')).toBeInTheDocument()
    expect(screen.getByTestId('reasonable-adjustments-clinical')).toBeInTheDocument()
    expect(screen.getByTestId('medical-history-clinical')).toBeInTheDocument()
    expect(screen.getByTestId('su-alerts-medical')).toBeInTheDocument()
    expect(screen.getByTestId('service-user-parameters')).toBeInTheDocument()
    expect(screen.queryByTestId('su-alerts-operational')).not.toBeInTheDocument()
    expect(screen.queryByTestId('su-alerts-history')).not.toBeInTheDocument()
    expect(screen.getByText(/Medical Conditions & Alerts/i)).toBeInTheDocument()
    expect(screen.queryByTestId('su-alerts-immediate')).not.toBeInTheDocument()
  })

  it('hides clinical write actions without permissions', async () => {
    const readOnly = ['service_users.read']
    useAuthStore.setState({
      permissions: readOnly,
      can: (p: string) => readOnly.includes(p),
    } as never)
    renderWithClient(<ServiceUserAlertsPage />)
    await screen.findByTestId('su-alerts-page')
    expect(screen.queryByTestId('add-edit-impairment')).not.toBeInTheDocument()
    expect(screen.queryByTestId('su-alerts-operational')).not.toBeInTheDocument()
  })

  it('conditions checklist renders catalogue and marks assigned', async () => {
    medicalApi.listConditions.mockResolvedValue([
      {
        id: 'cond-1',
        serviceUserId: 'su-1',
        conditionId: 'cat-1',
        status: 'ACTIVE',
        notes: '',
        onsetDate: null,
        reviewDate: null,
        source: 'MANUAL',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        condition: { id: 'cat-1', code: 'DIABETES', name: 'Diabetes', category: 'ENDOCRINE_METABOLIC' },
      },
    ])
    renderWithClient(<MedicalConditionsChecklist serviceUserId="su-1" />)
    expect(await screen.findByTestId('condition-check-DIABETES')).toBeInTheDocument()
    expect(screen.getByTestId('medical-conditions-grid')).toBeInTheDocument()
  })

  it('conditions empty and error states', async () => {
    medicalApi.catalog.mockResolvedValueOnce([])
    medicalApi.listConditions.mockResolvedValueOnce([])
    const { unmount } = renderWithClient(<MedicalConditionsChecklist serviceUserId="su-1" />)
    expect(await screen.findByText(/No conditions in the catalogue/i)).toBeInTheDocument()
    unmount()

    medicalApi.catalog.mockRejectedValueOnce(new ApiError('fail', 500))
    medicalApi.listConditions.mockResolvedValueOnce([])
    renderWithClient(<MedicalConditionsChecklist serviceUserId="su-1" />)
    expect(await screen.findByText(/Unable to load medical conditions/i)).toBeInTheDocument()
  })

  it('adjustments clinical surfaces list and Add/Edit Impairment', async () => {
    medicalApi.listAdjustments.mockResolvedValueOnce([])
    renderWithClient(<ReasonableAdjustmentsClinical serviceUserId="su-1" />)
    expect(await screen.findByText(/No reasonable adjustments recorded/i)).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('add-edit-impairment'))
    expect(await screen.findByText(/Add impairment/i)).toBeInTheDocument()
  })

  it('medical history clinical lists events', async () => {
    medicalApi.listHistory.mockResolvedValueOnce([
      {
        id: 'h1',
        serviceUserId: 'su-1',
        title: 'Hip replacement',
        eventDate: '2022-01-01',
        approximateDate: null,
        description: 'Elective',
        notes: '',
        source: 'MANUAL',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ])
    renderWithClient(<MedicalHistoryClinical serviceUserId="su-1" />)
    expect(await screen.findByText('Hip replacement')).toBeInTheDocument()
    expect(screen.getByText(/Past clinical events/i)).toBeInTheDocument()
    expect(screen.getByTestId('history-edit-h1')).toBeInTheDocument()
    expect(screen.getByTestId('history-deactivate-h1')).toBeInTheDocument()
  })

  it('medical history clinical updates and deactivates existing events', async () => {
    medicalApi.listHistory.mockResolvedValue([
      {
        id: 'h1',
        serviceUserId: 'su-1',
        title: 'Hip replacement',
        eventDate: '2022-01-01',
        approximateDate: null,
        description: 'Elective',
        notes: '',
        source: 'MANUAL',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ])
    medicalApi.updateHistory.mockResolvedValue({})
    medicalApi.deactivateHistory.mockResolvedValue({})
    renderWithClient(<MedicalHistoryClinical serviceUserId="su-1" />)
    fireEvent.click(await screen.findByTestId('history-edit-h1'))
    fireEvent.change(screen.getByLabelText(/^Title$/i), { target: { value: 'Hip revision' } })
    fireEvent.click(screen.getByRole('button', { name: /Save history event/i }))
    await waitFor(() =>
      expect(medicalApi.updateHistory).toHaveBeenCalledWith(
        'su-1',
        'h1',
        expect.objectContaining({ title: 'Hip revision', description: 'Elective', eventDate: '2022-01-01' }),
      ),
    )
    fireEvent.click(screen.getByTestId('history-deactivate-h1'))
    await waitFor(() => expect(medicalApi.deactivateHistory).toHaveBeenCalledWith('su-1', 'h1'))
  })

  it('adjustments clinical deactivates an existing record', async () => {
    medicalApi.listAdjustments.mockResolvedValue([
      {
        id: 'adj-1',
        serviceUserId: 'su-1',
        type: 'OTHER',
        description: 'Quiet environment',
        notes: '',
        isActive: true,
        source: 'MANUAL',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ])
    medicalApi.deactivateAdjustment.mockResolvedValue({})
    renderWithClient(<ReasonableAdjustmentsClinical serviceUserId="su-1" />)
    fireEvent.click(await screen.findByTestId('adjustment-deactivate-adj-1'))
    await waitFor(() => expect(medicalApi.deactivateAdjustment).toHaveBeenCalledWith('su-1', 'adj-1'))
  })

  it('Source suggestion card shows evidence and Use suggested applies YES without Accept sheet', async () => {
    medicalApi.listMonitoring.mockResolvedValue([])
    medicalApi.upsertMonitoring.mockResolvedValue({
      id: 'm-alert',
      configKey: 'MEDICAL_ALERT_CHOKING',
      enabled: true,
      booleanValue: null,
      numericValue: null,
      textValue: 'YES',
      notes: '',
      observationTypeId: null,
      serviceUserId: 'su-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    const gates = buildClinicalGates({
      serviceUserId: 'su-1',
      iaRisksReady: true,
      iaRiskRecords: [
        {
          id: 'r-choke',
          submissionId: 'sub-1',
          serviceUserId: 'su-1',
          riskType: 'CHOKING',
          description: 'Soft diet only — thick fluids',
          likelihood: 'HIGH',
          severity: 'HIGH',
          riskLevel: 'HIGH',
          controlMeasures: null,
          residualRisk: null,
          reviewDate: null,
          status: 'OPEN',
          sourceSectionNumber: null,
          sourceQuestionId: null,
          sourceQuestionText: 'Is Service User at risk of choking?',
          responsiblePersonId: null,
          autoGenerated: false,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    })
    renderWithClient(<MedicalAlertsClinicalBody serviceUserId="su-1" gates={gates} />)
    expect(await screen.findByTestId('clinical-gate-view-suggestion-choking')).toBeInTheDocument()
    expect(screen.queryByTestId('clinical-gate-view-suggestion-communication')).not.toBeInTheDocument()
    expect(screen.queryByText(/Suggestion: Not recorded/i)).not.toBeInTheDocument()

    const card = await screen.findByTestId('clinical-gate-suggestion-card-choking')
    expect(within(card).getByText(/Soft diet only/)).toBeInTheDocument()
    expect(within(card).getByText('Initial assessment risk')).toBeInTheDocument()
    expect(within(card).queryByRole('button', { name: /decline|dismiss/i })).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('clinical-gate-use-suggestion-choking'))
    expect(await screen.findByTestId('clinical-gate-suggestion-applied-choking')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByTestId('medical-alerts-save')).not.toBeDisabled()
    })
    fireEvent.click(screen.getByTestId('medical-alerts-save'))
    await waitFor(() =>
      expect(medicalApi.upsertMonitoring).toHaveBeenCalledWith(
        'su-1',
        expect.objectContaining({
          configKey: 'MEDICAL_ALERT_CHOKING',
          textValue: 'YES',
        }),
      ),
    )
  })

  it('monitoring config validates weight threshold', async () => {
    renderWithClient(<ServiceUserParametersClinical serviceUserId="su-1" />)
    const input = await screen.findByLabelText(/Weight change threshold/i)
    fireEvent.change(input, { target: { value: '-2' } })
    fireEvent.click(screen.getByRole('button', { name: /Save alert parameters/i }))
    await waitFor(() => expect(medicalApi.upsertMonitoring).not.toHaveBeenCalled())
  })

  it('monitoring saves fluid target', async () => {
    medicalApi.upsertMonitoring.mockResolvedValue({
      id: 'm1',
      configKey: 'FLUID_TARGET_REQUIRED',
      enabled: true,
      booleanValue: true,
      numericValue: null,
      textValue: null,
      notes: '',
      observationTypeId: null,
      serviceUserId: 'su-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    renderWithClient(<ServiceUserParametersClinical serviceUserId="su-1" />)
    expect(await screen.findByRole('button', { name: /Save alert parameters/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Save alert parameters/i }))
    await waitFor(() => expect(medicalApi.upsertMonitoring).toHaveBeenCalled())
  })

  it('usual parameters table renders', async () => {
    renderWithClient(<ServiceUserParametersClinical serviceUserId="su-1" />)
    expect(await screen.findByTestId('usual-parameters-section')).toBeInTheDocument()
    expect(await screen.findByText(/Baseline \/ reference values/i)).toBeInTheDocument()
    expect(await screen.findByText('Height')).toBeInTheDocument()
  })

  it('partial medical source failure still renders the clinical record', async () => {
    medicalApi.listConditions.mockRejectedValue(new ApiError('fail', 500))
    medicalApi.catalog.mockRejectedValue(new ApiError('fail', 500))
    renderWithClient(<ServiceUserAlertsPage />)
    await screen.findByTestId('su-alerts-page')
    expect(screen.getByTestId('su-alerts-medical')).toBeInTheDocument()
    expect(screen.queryByTestId('su-alerts-operational')).not.toBeInTheDocument()
  })
})
