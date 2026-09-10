import type { ServiceUserAllergyRow } from '@/features/service-users/api/service-users.api'
import type { ServiceUserFlashMessageRow } from '@/features/service-users/api/service-users.api'
import type { ServiceUserDocumentsBundle } from '@/features/service-users/api/service-users.api'
import type { ServiceUserDetail } from '@/features/service-users/api/service-users.api'
import type { MedicationAllergyRow } from '@/features/service-users/api/medication-allergies.api'
import type { BodyMapAlertRow } from '@/features/service-users/body-map/types'
import type { InitialAssessmentRiskRecord } from '@/features/service-users/initial-assessment/types'
import { CARE_PLAN_RISK_TYPE_LABELS } from '@/features/service-users/care-plan/care-plan-risk-profile.util'
import { isHighRisk } from '@/features/service-users/dashboard/service-user-dashboard-utils'
import { buildInitialAssessmentEnterpriseSearch } from '@/features/service-users/initial-assessment/utils/initial-assessment-url-search'
import type { MedicalSafetyItem, MedicalSafetySnapshot, SafetySeverity } from './types'
import { isActiveFlashMessageText } from './medical-alert-suggestions'

function allergySeverity(comment: string): SafetySeverity {
  const c = comment.toLowerCase()
  if (/anaphyla|life.?threat|severe|epipen|adrenaline/.test(c)) return 'CRITICAL'
  // Known allergy without severe keywords stays HIGH clinically, but Immediate
  // only promotes CRITICAL (see buildMedicalSafetySnapshot).
  if (comment.trim()) return 'HIGH'
  return 'MEDIUM'
}

function medicationAllergySeverity(row: MedicationAllergyRow): SafetySeverity {
  const blob = `${row.severity ?? ''} ${row.reaction ?? ''} ${row.notes ?? ''}`.toLowerCase()
  if (/anaphyla|life.?threat|critical|epipen|adrenaline/.test(blob)) return 'CRITICAL'
  if (/high|severe/.test(blob)) return 'HIGH'
  if ((row.severity ?? '').trim() || (row.reaction ?? '').trim()) return 'HIGH'
  return 'MEDIUM'
}

function mapBodyMapSeverity(s: BodyMapAlertRow['severity']): SafetySeverity {
  if (s === 'URGENT') return 'CRITICAL'
  if (s === 'HIGH') return 'HIGH'
  if (s === 'MEDIUM') return 'MEDIUM'
  return 'LOW'
}

function mapIaSeverity(level: InitialAssessmentRiskRecord['riskLevel']): SafetySeverity {
  if (level === 'HIGH') return 'HIGH'
  if (level === 'MEDIUM') return 'MEDIUM'
  return 'LOW'
}

function normalizeAllergyName(name: string): string {
  return name.trim().toLowerCase()
}

export function buildMedicalSafetySnapshot(input: {
  serviceUserId: string
  profile: ServiceUserDetail | null | undefined
  allergies: ServiceUserAllergyRow[] | undefined
  medicationAllergies?: MedicationAllergyRow[] | undefined
  flash: ServiceUserFlashMessageRow | null | undefined
  documents: ServiceUserDocumentsBundle | null | undefined
  iaRisks: InitialAssessmentRiskRecord[] | undefined
  bodyMapAlerts: BodyMapAlertRow[] | undefined
  /** When true, omit flash from Immediate (e.g. Overview already shows the banner). */
  omitFlashFromImmediate?: boolean
  /**
   * Structured medical conditions SoT.
   * `undefined` = source unavailable / no permission; array (incl. empty) = SoT available.
   */
  medicalConditions?: Array<{
    id: string
    status: string
    notes?: string | null
    onsetDate?: string | null
    updatedAt?: string | null
    condition?: { name: string; category?: string } | null
  }>
}): MedicalSafetySnapshot {
  const suId = input.serviceUserId
  const profileLink = {
    label: 'View allergies',
    to: '/service-users/$serviceUserId/profile',
    params: { serviceUserId: suId },
    search: { tab: 'allergies' },
  }
  const medsLink = {
    label: 'View medication',
    to: '/service-users/$serviceUserId/medication',
    params: { serviceUserId: suId },
  }
  const docsLink = {
    label: 'View documents',
    to: '/service-users/$serviceUserId/documents',
    params: { serviceUserId: suId },
  }
  const iaLink = {
    label: 'View initial assessment',
    to: '/service-users/initial-assessment',
    search: buildInitialAssessmentEnterpriseSearch({ serviceUserId: suId }),
  }
  const bodyMapLink = {
    label: 'View body map',
    to: '/service-users/$serviceUserId/body-map',
    params: { serviceUserId: suId },
  }
  const overviewFlash = {
    label: 'View overview',
    to: '/service-users/$serviceUserId/view',
    params: { serviceUserId: suId },
    search: { focus: 'flash' },
  }

  const generalAllergies: MedicalSafetyItem[] = (input.allergies ?? []).map((a) => ({
    id: `allergy-${a.id}`,
    severity: allergySeverity(a.comment ?? ''),
    title: a.allergyName,
    description: a.comment?.trim() || 'Allergy recorded',
    sourceLabel: 'Service user allergies',
    updatedAt: a.updatedAt,
    link: profileLink,
    group: 'allergies',
    kind: 'clinical',
  }))

  const knownNames = new Set(generalAllergies.map((a) => normalizeAllergyName(a.title)))

  const medicationAllergyItems: MedicalSafetyItem[] = []
  for (const m of input.medicationAllergies ?? []) {
    const key = normalizeAllergyName(m.allergyName)
    if (knownNames.has(key)) continue
    knownNames.add(key)
    const descParts = [m.reaction?.trim(), m.notes?.trim(), m.severity?.trim() ? `Severity: ${m.severity}` : null]
      .filter(Boolean)
      .join(' · ')
    medicationAllergyItems.push({
      id: `med-allergy-${m.id}`,
      severity: medicationAllergySeverity(m),
      title: m.allergyName,
      description: descParts || 'Medication allergy recorded',
      sourceLabel: 'Medication allergies',
      updatedAt: m.updatedAt ?? m.recordedAt ?? null,
      link: medsLink,
      group: 'allergies',
      kind: 'clinical',
    })
  }

  const allergies = [...generalAllergies, ...medicationAllergyItems]

  const safetyRisk: MedicalSafetyItem[] = []
  const communication: MedicalSafetyItem[] = []
  const immediate: MedicalSafetyItem[] = []

  if (input.flash && isActiveFlashMessageText(input.flash.message)) {
    const item: MedicalSafetyItem = {
      id: `flash-${input.flash.id}`,
      severity: 'CRITICAL',
      title: 'Urgent flash message',
      description: input.flash.message.trim(),
      sourceLabel: 'Flash message',
      updatedAt: input.flash.updatedAt,
      link: overviewFlash,
      group: 'immediate',
      kind: 'clinical',
    }
    if (!input.omitFlashFromImmediate) {
      immediate.push(item)
    }
  }

  if (input.profile && isHighRisk(input.profile)) {
    const name = input.profile.riskLevel?.name ?? input.profile.riskLevel?.code ?? 'High risk'
    const item: MedicalSafetyItem = {
      id: `risk-level-${input.profile.id}`,
      severity: input.profile.riskLevel?.code?.toUpperCase() === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
      title: `Risk level: ${name}`,
      description: 'Service user risk level requires heightened awareness.',
      sourceLabel: 'Service user profile',
      updatedAt: null,
      link: {
        label: 'View profile',
        to: '/service-users/$serviceUserId/profile',
        params: { serviceUserId: suId },
        search: { tab: 'personal' },
      },
      group: 'safety_risk',
      kind: 'clinical',
    }
    safetyRisk.push(item)
    immediate.push(item)
  }

  const legal = input.documents?.legal
  const dnacprInPlace =
    legal?.dnacprInPlace === true || legal?.dnacprStatusConfirmation === 'IN_PLACE'
  if (dnacprInPlace) {
    const item: MedicalSafetyItem = {
      id: `dnacpr-${suId}`,
      severity: 'HIGH',
      title: 'DNACPR in place',
      description: [
        legal?.dnacprPhysicalLocation
          ? `Location: ${legal.dnacprPhysicalLocation}`
          : null,
        legal?.dnacprStartDate ? `Start: ${legal.dnacprStartDate}` : null,
      ]
        .filter(Boolean)
        .join(' · ') || 'Do not attempt cardiopulmonary resuscitation — see documents.',
      sourceLabel: 'Legal documents',
      updatedAt: null,
      link: docsLink,
      group: 'safety_risk',
      kind: 'clinical',
    }
    safetyRisk.push(item)
    immediate.push(item)
  }

  for (const a of allergies) {
    // Immediate: only clearly critical allergies (anaphylaxis / life-threat keywords).
    if (a.severity === 'CRITICAL') {
      immediate.push(a)
    }
  }

  for (const r of input.iaRisks ?? []) {
    if (r.status === 'CLOSED') continue
    const typeLabel = CARE_PLAN_RISK_TYPE_LABELS[r.riskType] ?? r.riskType
    const item: MedicalSafetyItem = {
      id: `ia-risk-${r.id}`,
      severity: mapIaSeverity(r.riskLevel),
      title: `${typeLabel} risk`,
      description: r.description?.trim() || `${r.status} · ${r.riskLevel}`,
      sourceLabel: 'Initial assessment risk',
      updatedAt: r.updatedAt,
      link: iaLink,
      group: 'safety_risk',
      kind: 'clinical',
    }
    safetyRisk.push(item)
    if (r.riskLevel === 'HIGH' && r.status === 'OPEN') {
      immediate.push(item)
    }
  }

  for (const b of input.bodyMapAlerts ?? []) {
    const item: MedicalSafetyItem = {
      id: `bm-${b.id}`,
      severity: mapBodyMapSeverity(b.severity),
      title: b.record?.title || b.alertType.replace(/_/g, ' '),
      description: b.message,
      sourceLabel: 'Body map',
      updatedAt: b.createdAt,
      link: bodyMapLink,
      group: 'safety_risk',
      kind: 'clinical',
    }
    safetyRisk.push(item)
    if (item.severity === 'CRITICAL' || item.severity === 'HIGH') {
      immediate.push(item)
    }
  }

  // Deduplicate immediate by id (same item may appear in allergies + immediate)
  const seen = new Set<string>()
  const immediateUnique = immediate.filter((i) => {
    if (seen.has(i.id)) return false
    seen.add(i.id)
    return true
  })

  const severityOrder: Record<SafetySeverity, number> = {
    CRITICAL: 0,
    HIGH: 1,
    MEDIUM: 2,
    LOW: 3,
    INFO: 4,
  }
  immediateUnique.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  const conditionsUnavailable = input.medicalConditions === undefined
  const conditions: MedicalSafetyItem[] = (input.medicalConditions ?? [])
    .filter((c) => c.status === 'ACTIVE')
    .map((c) => ({
      id: `condition-${c.id}`,
      severity: 'MEDIUM' as SafetySeverity,
      title: c.condition?.name ?? 'Medical condition',
      description: [c.condition?.category, c.notes?.trim(), c.onsetDate ? `Onset ${c.onsetDate}` : null]
        .filter(Boolean)
        .join(' · ') || null,
      sourceLabel: 'Medical conditions',
      updatedAt: c.updatedAt ?? null,
      link: {
        label: 'View medical & alerts',
        to: '/service-users/$serviceUserId/alerts',
        params: { serviceUserId: suId },
      },
      group: 'conditions' as const,
      kind: 'clinical' as const,
    }))

  return {
    immediate: immediateUnique,
    conditions,
    allergies,
    safetyRisk,
    communication,
    conditionsUnavailable,
    communicationLimited: true,
  }
}
