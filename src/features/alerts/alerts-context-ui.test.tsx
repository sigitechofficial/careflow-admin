import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/store'
import {
  isServiceUserModuleTabActive,
  SERVICE_USER_MODULE_TABS,
} from '@/features/service-users/components/ServiceUserModuleTabs'

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-router')>(
    '@tanstack/react-router',
  )
  const state = { location: { pathname: '/service-users/su-1/alerts' } }
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useSearch: () => ({}),
    useParams: () => ({ serviceUserId: 'su-1' }),
    useRouterState: (opts?: { select?: (s: typeof state) => unknown }) =>
      opts?.select ? opts.select(state) : state,
    Link: ({
      children,
      to,
      params,
      ...rest
    }: {
      children: React.ReactNode
      to: string
      params?: Record<string, string>
      [key: string]: unknown
    }) => (
      <a href={`${to}${params ? JSON.stringify(params) : ''}`} {...rest}>
        {children}
      </a>
    ),
  }
})

const medicalSafetyMockState = vi.hoisted(() => ({
  canProfile: true,
  canAllergies: true,
  canMedAllergies: true,
  immediate: [] as Array<{
    id: string
    severity: string
    title: string
    description: string | null
    sourceLabel: string
    updatedAt: string | null
    link: null
    group: string
    kind: 'clinical'
  }>,
  allergies: [] as Array<{
    id: string
    severity: string
    title: string
    description: string | null
    sourceLabel: string
    updatedAt: string | null
    link: null
    group: string
    kind: 'clinical'
  }>,
}))

vi.mock('@/features/alerts/api/medical-clinical.api', () => ({
  fetchMedicalConditionCatalog: vi.fn(async () => []),
  listServiceUserMedicalConditions: vi.fn(async () => []),
  createServiceUserMedicalCondition: vi.fn(),
  updateServiceUserMedicalCondition: vi.fn(),
  discontinueServiceUserMedicalCondition: vi.fn(),
  listReasonableAdjustments: vi.fn(async () => []),
  createReasonableAdjustment: vi.fn(),
  updateReasonableAdjustment: vi.fn(),
  deactivateReasonableAdjustment: vi.fn(),
  listMedicalHistory: vi.fn(async () => []),
  createMedicalHistoryEvent: vi.fn(),
  updateMedicalHistoryEvent: vi.fn(),
  deactivateMedicalHistoryEvent: vi.fn(),
  listMonitoringConfig: vi.fn(async () => []),
  upsertMonitoringConfig: vi.fn(),
  deactivateMonitoringConfig: vi.fn(),
  listUsualParameters: vi.fn(async () => []),
  upsertUsualParameter: vi.fn(),
  updateUsualParameter: vi.fn(),
  deactivateUsualParameter: vi.fn(),
  fetchMedicalSafetySummary: vi.fn(async () => ({ serviceUserId: 'su-1' })),
}))

vi.mock('@/features/service-users/hooks/useServiceUserObservations', () => ({
  useObservationTypes: () => ({ data: [], isLoading: false }),
}))

vi.mock('@/features/alerts/hooks/useServiceUserMedicalSafety', () => ({
  useServiceUserMedicalSafety: () => ({
    snapshot: {
      immediate: medicalSafetyMockState.immediate,
      conditions: [],
      allergies: medicalSafetyMockState.allergies,
      safetyRisk: [],
      communication: [],
      conditionsUnavailable: true,
      communicationLimited: true,
    },
    medicalLoading: false,
    medicalError: false,
    sourceErrors: 0,
    iaRiskRecords: [],
    sourceReady: {
      iaRisks: false,
      conditions: false,
      documents: false,
      flash: true,
      allergies: true,
    },
    refetchMedical: vi.fn(),
    permissions: {
      canAllergies: medicalSafetyMockState.canAllergies,
      canMedAllergies: medicalSafetyMockState.canMedAllergies,
      canDocs: true,
      canFlash: true,
      canBodyMap: true,
      canProfile: medicalSafetyMockState.canProfile,
      canIa: true,
      canConditions: true,
    },
  }),
}))

vi.mock('@/features/service-users/hooks/useServiceUser', () => ({
  useServiceUser: () => ({
    data: { id: 'su-1', firstName: 'Anna', lastName: 'Smith', preferredName: null },
    isLoading: false,
  }),
}))

vi.mock('@/features/service-users/hooks/useServiceUserCarePlanExtras', () => ({
  useServiceUserCarePlanExtras: () => ({
    documents: { data: null },
    allergies: { data: [] },
  }),
}))

vi.mock('@/shared/lib/toast', () => ({
  toastSuccess: vi.fn(),
  toastApiError: vi.fn(),
}))

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

function setPerms(permissions: string[]) {
  useAuthStore.setState({
    user: {
      id: 'u1',
      email: 'a@b.c',
      displayName: 'Admin',
      role: 'admin',
      permissions,
    },
    accessToken: 't',
    refreshToken: null,
    hydrated: true,
  } as never)
}

describe('Service User Medical & Alerts tab', () => {
  it('includes Medical & Alerts route and active matcher', () => {
    const tab = SERVICE_USER_MODULE_TABS.find((t) => t.id === 'alerts')
    expect(tab?.label).toBe('Medical & Alerts')
    expect(tab?.to).toBe('/service-users/$serviceUserId/alerts')
    expect(isServiceUserModuleTabActive(tab!, '/service-users/su-1/alerts')).toBe(true)
    expect(isServiceUserModuleTabActive(tab!, '/service-users/su-1/view')).toBe(false)
  })

  it('shows Medical & Alerts tab with service_users.read', async () => {
    setPerms(['service_users.read'])
    const { ServiceUserModuleTabs } = await import(
      '@/features/service-users/components/ServiceUserModuleTabs'
    )
    wrap(<ServiceUserModuleTabs serviceUserId="su-1" />)
    expect(await screen.findByTestId('su-module-tab-alerts')).toBeInTheDocument()
    expect(screen.getByText('Medical & Alerts')).toBeInTheDocument()
    expect(screen.queryByLabelText(/active alerts/i)).not.toBeInTheDocument()
  })

  it('hides Medical & Alerts tab without service_users.read', async () => {
    setPerms(['employees.read'])
    const { ServiceUserModuleTabs } = await import(
      '@/features/service-users/components/ServiceUserModuleTabs'
    )
    wrap(<ServiceUserModuleTabs serviceUserId="su-1" />)
    expect(screen.queryByTestId('su-module-tab-alerts')).not.toBeInTheDocument()
  })
})

describe('ServiceUserAlertsPage', () => {
  beforeEach(() => {
    setPerms(['service_users.read'])
    medicalSafetyMockState.immediate = []
    medicalSafetyMockState.allergies = []
  })

  it('renders the clinical Medical Conditions & Alerts record', async () => {
    const { default: ServiceUserAlertsPage } = await import(
      '@/features/alerts/pages/ServiceUserAlertsPage'
    )
    wrap(<ServiceUserAlertsPage />)
    expect(await screen.findByTestId('su-alerts-page')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /Anna's Medical Conditions & Alerts/i }),
    ).toBeInTheDocument()
    expect(screen.getByTestId('medical-conditions-checklist')).toBeInTheDocument()
    expect(screen.getByTestId('su-alerts-medical')).toBeInTheDocument()
    expect(screen.getByTestId('clinical-gate-dnacpr')).toBeInTheDocument()
    expect(screen.getByTestId('clinical-gate-risk-level')).toBeInTheDocument()
    expect(screen.getByTestId('clinical-gate-allergies')).toBeInTheDocument()
    expect(screen.queryByTestId('su-alerts-operational')).not.toBeInTheDocument()
    expect(screen.queryByTestId('su-alerts-history')).not.toBeInTheDocument()
  })

  it('shows clinical allergies without an operational alerts section', async () => {
    medicalSafetyMockState.allergies = [
      {
        id: 'allergy-1',
        severity: 'HIGH',
        title: 'Latex',
        description: 'Allergy recorded',
        sourceLabel: 'Service user allergies',
        updatedAt: null,
        link: null,
        group: 'allergies',
        kind: 'clinical',
      },
    ]
    const { default: ServiceUserAlertsPage } = await import(
      '@/features/alerts/pages/ServiceUserAlertsPage'
    )
    wrap(<ServiceUserAlertsPage />)
    expect(await screen.findByTestId('su-alerts-medical')).toBeInTheDocument()
    expect(await screen.findByTestId('clinical-gate-view-suggestion-allergies')).toBeInTheDocument()
    screen.getByTestId('clinical-gate-view-suggestion-allergies').click()
    expect(await screen.findByText(/Latex/)).toBeInTheDocument()
    expect(screen.queryByTestId('su-alerts-operational')).not.toBeInTheDocument()
    expect(screen.queryByTestId('su-alerts-history')).not.toBeInTheDocument()
  })
})
