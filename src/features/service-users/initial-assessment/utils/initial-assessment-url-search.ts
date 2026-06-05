import type { HubTabId } from '@/features/service-users/initial-assessment/components/InitialAssessmentHubTabs'

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
  section?: number
  tab?: HubTabId
}

function parseSection(raw: unknown): number | undefined {
  if (typeof raw === 'number' && Number.isInteger(raw) && raw >= 1 && raw <= 99) return raw
  if (typeof raw === 'string' && /^\d{1,2}$/.test(raw.trim())) {
    const n = Number.parseInt(raw.trim(), 10)
    return n >= 1 && n <= 18 ? n : undefined
  }
  return undefined
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
  const section = parseSection(raw.section)
  const tab = parseTab(raw.tab)
  return { serviceUserId, section, tab }
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
  return out
}
