import type { HubTabId } from '@/features/service-users/initial-assessment/components/InitialAssessmentHubTabs'
import {
  firstHolisticTabForEnterpriseSection,
  resolveHolisticTabId,
} from '@/features/service-users/initial-assessment/utils/holistic-assessment-tabs'

const HUB_TAB_IDS = new Set<HubTabId>([
  'form',
  'waterlow',
  'submissions',
  'versions',
  'review',
  'schedule',
  'audit',
  'compare',
])

export type InitialAssessmentEnterpriseSearch = {
  serviceUserId?: string
  /** Registered internal holistic tab id (URL `section=`). Not the display number. */
  section?: number
  tab?: HubTabId
  /** Open a specific submission (e.g. after API autofill / E2E). */
  submissionId?: string
}

function parseSection(raw: unknown): number | undefined {
  if (typeof raw === 'number' && Number.isInteger(raw)) return resolveHolisticTabId(raw)
  if (typeof raw === 'string' && /^\d{1,2}$/.test(raw.trim())) {
    return resolveHolisticTabId(Number.parseInt(raw.trim(), 10))
  }
  return undefined
}

/**
 * `iaSection=<§ number>` comes from links built outside the admin (care-plan "complete the IA"
 * fixes); it names the enterprise section, so open whichever tab shows that section.
 */
function parseEnterpriseSection(raw: unknown): number | undefined {
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw.trim()) : NaN
  if (!Number.isInteger(n) || n < 1 || n > 99) return undefined
  return firstHolisticTabForEnterpriseSection(n)
}

function parseTab(raw: unknown): HubTabId | undefined {
  return typeof raw === 'string' && HUB_TAB_IDS.has(raw as HubTabId) ? (raw as HubTabId) : undefined
}

export function parseInitialAssessmentEnterpriseSearch(
  search: unknown,
): InitialAssessmentEnterpriseSearch {
  if (!search || typeof search !== 'object') return {}
  const raw = search as Record<string, unknown>
  const serviceUserId =
    typeof raw.serviceUserId === 'string' && raw.serviceUserId.trim()
      ? raw.serviceUserId.trim()
      : undefined
  const section = parseSection(raw.section) ?? parseEnterpriseSection(raw.iaSection)
  const tab = parseTab(raw.tab)
  const submissionId =
    typeof raw.submissionId === 'string' && raw.submissionId.trim()
      ? raw.submissionId.trim()
      : undefined
  return { serviceUserId, section, tab, submissionId }
}

export function validateInitialAssessmentEnterpriseSearch(
  raw: Record<string, unknown>,
): InitialAssessmentEnterpriseSearch {
  return parseInitialAssessmentEnterpriseSearch(raw)
}

export function buildInitialAssessmentEnterpriseSearch(
  params: InitialAssessmentEnterpriseSearch,
): InitialAssessmentEnterpriseSearch {
  const out: InitialAssessmentEnterpriseSearch = {}
  if (params.serviceUserId?.trim()) out.serviceUserId = params.serviceUserId.trim()
  if (params.section != null && params.section >= 1) out.section = params.section
  if (params.tab) out.tab = params.tab
  if (params.submissionId?.trim()) out.submissionId = params.submissionId.trim()
  return out
}
