import type {
  PolicyApplicability,
  PolicyAudience,
  PolicyLink,
  PolicyLinkInput,
  PolicyLinkModuleType,
} from '@/features/policies/types/policy.types'
import { POLICY_LINK_MODULE_OPTIONS } from '@/features/policies/types/policy.types'

export function formatPolicyDate(value: string | null | undefined): string {
  if (!value) return '—'
  const iso = value.includes('T') ? value : `${value}T00:00:00`
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatPolicyDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return formatPolicyDate(value)
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function summariseApplicability(
  rows: PolicyApplicability[] | undefined,
  labels: { locations: Record<string, string>; services: Record<string, string> },
): string {
  if (!rows?.length) return 'Organisation-wide'
  if (rows.some(row => row.organisationWide)) return 'Organisation-wide'
  const parts = rows.map(row => {
    const bits: string[] = []
    if (row.locationId) bits.push(labels.locations[row.locationId] ?? 'Branch')
    if (row.serviceTypeCode) bits.push(labels.services[row.serviceTypeCode] ?? row.serviceTypeCode)
    return bits.join(' + ') || 'Targeted'
  })
  return parts.join(' or ')
}

export function summariseAudience(
  rows: PolicyAudience[] | undefined,
  labels: {
    roles: Record<string, string>
    jobTitles: Record<string, string>
    workAreas: Record<string, string>
    locations: Record<string, string>
  },
): string {
  if (!rows?.length || rows.some(row => row.targetType === 'ALL_EMPLOYEES')) {
    return 'All employees'
  }
  const groups: string[] = []
  const roles = rows.filter(r => r.targetType === 'ROLE' && r.roleId).map(r => labels.roles[r.roleId!] ?? 'Role')
  const titles = rows
    .filter(r => r.targetType === 'JOB_TITLE' && r.jobTitleId)
    .map(r => labels.jobTitles[r.jobTitleId!] ?? 'Job title')
  const areas = rows
    .filter(r => r.targetType === 'WORK_AREA' && r.workAreaId)
    .map(r => labels.workAreas[r.workAreaId!] ?? 'Work area')
  const locations = rows
    .filter(r => r.targetType === 'LOCATION' && r.locationId)
    .map(r => labels.locations[r.locationId!] ?? 'Location')
  if (roles.length) groups.push(roles.join(' OR '))
  if (titles.length) groups.push(titles.join(' OR '))
  if (areas.length) groups.push(areas.join(' OR '))
  if (locations.length) groups.push(locations.join(' OR '))
  return groups.length ? groups.join(' AND ') : 'All employees'
}

export function moduleLabel(moduleType: PolicyLinkModuleType): string {
  return POLICY_LINK_MODULE_OPTIONS.find(option => option.value === moduleType)?.label ?? moduleType
}

export function summariseLink(link: PolicyLink | PolicyLinkInput): string {
  const module = moduleLabel(link.moduleType)
  if (link.label?.trim()) return `${module} — ${link.label.trim()}`
  if (link.scope === 'MODULE') return `${module} (whole module)`
  if (link.scope === 'FORM_TEMPLATE') return `${module} (whole form)`
  if (link.scope === 'RECORD') return `${module} (specific record)`
  if (link.scope === 'SECTION') {
    return link.sectionKey ? `${module} (section ${link.sectionKey})` : `${module} (section)`
  }
  return module
}

export function linkTargetSummary(link: PolicyLink | PolicyLinkInput): string {
  if (link.label?.trim()) return link.label.trim()
  if (link.scope === 'MODULE') return 'Whole module'
  if (link.scope === 'FORM_TEMPLATE') return 'Specific form'
  if (link.scope === 'RECORD') return 'Specific record'
  if (link.scope === 'SECTION') return link.sectionKey ? `Section ${link.sectionKey}` : 'Specific section'
  return 'CareFlow area'
}
