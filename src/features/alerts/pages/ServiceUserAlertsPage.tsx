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
import { isHighRisk } from '@/features/service-users/dashboard/service-user-dashboard-utils'
import { MedicalConditionsChecklist } from '@/features/alerts/medical-safety/MedicalConditionsChecklist'
import {
  MedicalHistoryClinical,
  ReasonableAdjustmentsClinical,
} from '@/features/alerts/medical-safety/AdjustmentsAndHistoryClinical'
import {
  buildClinicalGates,
  MedicalAlertsClinicalBody,
} from '@/features/alerts/medical-safety/MedicalAlertsClinicalBody'
import { suggestConditionCodesFromSources } from '@/features/alerts/medical-safety/suggest-conditions-from-ia'
import { ServiceUserParametersClinical } from '@/features/alerts/medical-safety/ServiceUserParametersClinical'
import { useAuthStore } from '@/features/auth/store'
import { cn } from '@/shared/lib/utils'

export default function ServiceUserAlertsPage() {
  const { serviceUserId } = useParams({ strict: false }) as { serviceUserId: string }
  const { data: detail } = useServiceUser(serviceUserId)
  const can = useAuthStore((s) => s.can)
  const canReadServiceUser = can('service_users.read')
  const clinicalPerms = useMedicalClinicalPermissions()

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
  const pageTitle = `${given}'s Medical Conditions & Alerts`

  const hasCode = (code: string) =>
    (conditionsQuery.data ?? []).some(
      (c) => c.status === 'ACTIVE' && c.condition?.code === code,
    )

  const legal = extras.documents?.data?.legal
  const dols = extras.documents?.data?.dols ?? []
  const documentsReady =
    medical.sourceReady.documents || Boolean(extras.documents?.data)

  const dnacprStatus =
    legal?.dnacprStatusConfirmation === 'IN_PLACE' || legal?.dnacprInPlace === true
      ? 'IN_PLACE'
      : legal?.dnacprStatusConfirmation === 'NOT_IN_PLACE'
        ? 'NOT_IN_PLACE'
        : legal
          ? 'UNKNOWN'
          : null

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

  const gates = buildClinicalGates({
    serviceUserId,
    iaRiskRecords: medical.iaRiskRecords,
    iaRisksReady: medical.sourceReady.iaRisks,
    conditionsReady: medical.sourceReady.conditions && !medical.snapshot.conditionsUnavailable,
    hasDiabetesCondition: hasCode('DIABETES'),
    hasCopdCondition: hasCode('COPD'),
    hasPalliativeCondition: hasCode('PALLIATIVE_CARE'),
    flashReady: medical.sourceReady.flash,
    flashMessage:
      medical.snapshot.immediate.find((i) => i.id.startsWith('flash-'))?.description ?? null,
    documentsReady,
    dolsSummaries: dols.map((d) => {
      const bits = [
        d.isCurrent ? 'Current authorisation' : 'Authorisation recorded',
        d.issueDate ? `Issued ${String(d.issueDate).slice(0, 10)}` : null,
        d.applicationDate ? `Applied ${String(d.applicationDate).slice(0, 10)}` : null,
        d.renewalDate ? `Renewal ${String(d.renewalDate).slice(0, 10)}` : null,
        d.notes?.trim() || null,
      ].filter(Boolean)
      return bits.join(' · ')
    }),
    dnacprStatus,
    dnacprSummary: [
      legal?.dnacprPhysicalLocation ? `Location: ${legal.dnacprPhysicalLocation}` : null,
      legal?.dnacprStartDate ? `Start: ${String(legal.dnacprStartDate).slice(0, 10)}` : null,
    ]
      .filter(Boolean)
      .join(' · '),
    allergySourceReady: medical.sourceReady.allergies,
    allergyItems: medical.snapshot.allergies,
    riskLevelName: detail?.riskLevel?.name ?? detail?.riskLevel?.code ?? null,
    isHighRisk: detail ? isHighRisk(detail) : false,
  })

  return (
    <div className={cn(SERVICE_USER_MODULE_PAGE_CLASS, 'pb-10')}>
      <ServiceUserModuleHeader serviceUserId={serviceUserId} detail={detail ?? null} />
      <ServiceUserModuleTabs serviceUserId={serviceUserId} />

      <div
        className="mx-auto w-full max-w-7xl space-y-4 px-3 py-5 sm:px-6"
        data-testid="su-alerts-page"
      >
        <header className="pb-1">
          <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">{pageTitle}</h1>
        </header>

        <MedicalConditionsChecklist
          serviceUserId={serviceUserId}
          suggestedCodes={suggestedConditionCodes}
        />

        <ReasonableAdjustmentsClinical serviceUserId={serviceUserId} />

        <MedicalHistoryClinical serviceUserId={serviceUserId} />

        <MedicalAlertsClinicalBody serviceUserId={serviceUserId} gates={gates} />

        <ServiceUserParametersClinical serviceUserId={serviceUserId} />
      </div>
    </div>
  )
}
