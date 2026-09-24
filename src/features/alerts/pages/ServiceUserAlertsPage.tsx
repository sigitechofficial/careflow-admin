import * as React from 'react'
import { useParams } from '@tanstack/react-router'
import {
  SERVICE_USER_MODULE_PAGE_CLASS,
  ServiceUserModuleHeader,
} from '@/features/service-users/components/ServiceUserModuleHeader'
import { ServiceUserModuleTabs } from '@/features/service-users/components/ServiceUserModuleTabs'
import { useServiceUser } from '@/features/service-users/hooks/useServiceUser'
import { serviceUserGivenName } from '@/features/service-users/lib/service-user-display'
import { useServiceUserMedicalSafety } from '@/features/alerts/hooks/useServiceUserMedicalSafety'
import {
  useMedicalClinicalPermissions,
  useServiceUserMedicalConditions,
} from '@/features/alerts/hooks/useMedicalClinical'
import { useServiceUserCarePlanExtras } from '@/features/service-users/hooks/useServiceUserCarePlanExtras'
import { useCarePlanIaSource } from '@/features/service-users/hooks/useCarePlanIaSource'
import { ClinicalBandHeaderless } from '@/features/alerts/medical-safety/ClinicalRecordPrimitives'
import { MedicalConditionsChecklist } from '@/features/alerts/medical-safety/MedicalConditionsChecklist'
import { MedicalConditionsSection } from '@/features/alerts/medical-safety/MedicalConditionsSection'
import {
  MedicalHistoryClinical,
  ReasonableAdjustmentsClinical,
} from '@/features/alerts/medical-safety/AdjustmentsAndHistoryClinical'
import { MedicalAlertsSection } from '@/features/alerts/medical-safety/MedicalAlertsSection'
import { suggestConditionCodesFromSources } from '@/features/alerts/medical-safety/suggest-conditions-from-ia'
import { ServiceUserParametersClinical } from '@/features/alerts/medical-safety/ServiceUserParametersClinical'
import { useAuthStore } from '@/features/auth/store'
import { cn } from '@/shared/lib/utils'

type AlertsTabId = 'conditions' | 'adjustments' | 'history' | 'alerts' | 'parameters'

const ALERTS_TABS: { id: AlertsTabId; label: string }[] = [
  { id: 'conditions', label: 'Medical Conditions' },
  { id: 'adjustments', label: 'Reasonable Adjustments' },
  { id: 'history', label: 'Medical History' },
  { id: 'alerts', label: 'Medical Alerts' },
  { id: 'parameters', label: 'Parameters' },
]

export default function ServiceUserAlertsPage() {
  const { serviceUserId } = useParams({ strict: false }) as { serviceUserId: string }
  const { data: detail } = useServiceUser(serviceUserId)
  const can = useAuthStore((s) => s.can)
  const canReadServiceUser = can('service_users.read')
  const clinicalPerms = useMedicalClinicalPermissions()
  const [activeTab, setActiveTab] = React.useState<AlertsTabId>('conditions')

  const medical = useServiceUserMedicalSafety(serviceUserId, {
    enabled: canReadServiceUser,
  })
  const conditionsQuery = useServiceUserMedicalConditions(
    serviceUserId,
    clinicalPerms.conditions.read,
  )
  const extras = useServiceUserCarePlanExtras(serviceUserId)
  const iaSource = useCarePlanIaSource(serviceUserId)

  const given = detail ? serviceUserGivenName(detail) : 'Service user'
  const pageTitle = `${given}'s Medical Alerts`

  const dols = extras.documents?.data?.dols ?? []

  const alreadyActiveCodes = React.useMemo(
    () =>
      (conditionsQuery.data ?? [])
        .filter((c) => c.status === 'ACTIVE')
        .map((c) => c.condition?.code)
        .filter((c): c is string => Boolean(c)),
    [conditionsQuery.data],
  )

  const suggestedConditionCodes = React.useMemo(
    () =>
      suggestConditionCodesFromSources({
        iaRiskRecords: medical.iaRiskRecords,
        iaRisksReady: medical.sourceReady.iaRisks,
        fallsLast12Months: iaSource.summaryQuery.data?.clinical?.falls?.fallsLast12Months,
        hasDolsRecord: dols.length > 0,
        alreadyActiveCodes,
      }),
    [
      alreadyActiveCodes,
      dols.length,
      iaSource.summaryQuery.data?.clinical?.falls?.fallsLast12Months,
      medical.iaRiskRecords,
      medical.sourceReady.iaRisks,
    ],
  )

  return (
    <div className={cn(SERVICE_USER_MODULE_PAGE_CLASS, 'pb-10')}>
      <ServiceUserModuleHeader serviceUserId={serviceUserId} detail={detail ?? null} />
      <ServiceUserModuleTabs serviceUserId={serviceUserId} />

      <div
        className="mx-auto w-full max-w-7xl px-3 py-5 sm:px-6"
        data-testid="su-alerts-page"
      >
        <header className="pb-3">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100 sm:text-xl">{pageTitle}</h1>
        </header>

        <div
          className="flex gap-0 overflow-x-auto border-b border-slate-300 dark:border-border"
          role="tablist"
          aria-label="Medical alerts sections"
        >
          {ALERTS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              data-testid={`alerts-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'shrink-0 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-[#0f6b6b] text-[#0f6b6b] dark:border-teal-400 dark:text-teal-300'
                  : 'border-transparent text-muted-foreground hover:border-slate-300 hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <ClinicalBandHeaderless>
          <div className="pt-4">
            {activeTab === 'conditions' && (
              <>
                <MedicalConditionsChecklist
                  serviceUserId={serviceUserId}
                  suggestedCodes={suggestedConditionCodes}
                />
                <div className="mt-6">
                  <MedicalConditionsSection serviceUserId={serviceUserId} />
                </div>
              </>
            )}
            {activeTab === 'adjustments' && (
              <ReasonableAdjustmentsClinical serviceUserId={serviceUserId} />
            )}
            {activeTab === 'history' && (
              <MedicalHistoryClinical serviceUserId={serviceUserId} />
            )}
            {activeTab === 'alerts' && (
              <MedicalAlertsSection serviceUserId={serviceUserId} />
            )}
            {activeTab === 'parameters' && (
              <ServiceUserParametersClinical serviceUserId={serviceUserId} />
            )}
          </div>
        </ClinicalBandHeaderless>
      </div>
    </div>
  )
}
