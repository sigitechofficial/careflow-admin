import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/store'
import { listMedicalAlerts } from '@/features/alerts/api/medical-clinical.api'
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
  listMedicalAlerts: vi.fn(async () => []),
  createMedicalAlert: vi.fn(),
  updateMedicalAlert: vi.fn(),
  deactivateMedicalAlert: vi.fn(),
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

import ServiceUserAlertsPage from '@/features/alerts/pages/ServiceUserAlertsPage'

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
    expect(tab?.label).toBe('Medical alerts')
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
    expect(screen.getByText('Medical alerts')).toBeInTheDocument()
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
    setPerms(['service_users.read', 'service_users.medical_alerts.read'])
    medicalSafetyMockState.immediate = []
    medicalSafetyMockState.allergies = []
  })

  it('renders the clinical Medical Alerts record', async () => {
    wrap(<ServiceUserAlertsPage />)
    expect(await screen.findByTestId('su-alerts-page')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Anna's Medical Alerts/i })).toBeInTheDocument()
    expect(screen.getByTestId('medical-conditions-checklist')).toBeInTheDocument()
    for (const id of ['conditions', 'adjustments', 'history', 'alerts', 'parameters']) {
      expect(screen.getByTestId(`alerts-tab-${id}`)).toBeInTheDocument()
    }
    fireEvent.click(screen.getByTestId('alerts-tab-alerts'))
    expect(await screen.findByTestId('medical-alerts-section')).toBeInTheDocument()
    expect(screen.queryByTestId('su-alerts-operational')).not.toBeInTheDocument()
    expect(screen.queryByTestId('su-alerts-history')).not.toBeInTheDocument()
  })

  it('shows structured medical alerts without an operational alerts section', async () => {
    vi.mocked(listMedicalAlerts).mockResolvedValueOnce([
      {
        id: 'alert-1',
        serviceUserId: 'su-1',
        title: 'Latex',
        category: 'GENERAL_ALERT',
        severity: 'CRITICAL',
        description: 'Allergy recorded',
        actionForCarer: 'Use latex-free gloves',
        notes: '',
        isActive: true,
        source: 'MANUAL',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ] as never)
    wrap(<ServiceUserAlertsPage />)
    fireEvent.click(await screen.findByTestId('alerts-tab-alerts'))
    expect(await screen.findByTestId('medical-alert-row-alert-1')).toBeInTheDocument()
    expect(screen.getByText('Latex')).toBeInTheDocument()
    expect(screen.queryByTestId('su-alerts-operational')).not.toBeInTheDocument()
    expect(screen.queryByTestId('su-alerts-history')).not.toBeInTheDocument()
  })
})
