import type { DomAllocationRuleBehavior, DomCareAllocationRule } from '@/features/settings/types'

export const ALLOCATION_BEHAVIOR_OPTIONS: {
  value: DomAllocationRuleBehavior
  label: string
}[] = [
  { value: 'DONT_ALLOW', label: "Don't allow allocation" },
  { value: 'ALWAYS_ALLOW', label: 'Always allow' },
  { value: 'REQUEST_CONFIRMATION', label: 'Request confirmation' },
]

export const DEFAULT_DOM_CARE_ALLOCATION_RULES: DomCareAllocationRule[] = [
  { key: 'visit_time_tolerance', label: 'Visit Time Tolerance', behavior: 'DONT_ALLOW', minutes: null },
  { key: 'carer_on_holiday', label: 'Carer on holiday', behavior: 'DONT_ALLOW', minutes: null },
  { key: 'carer_on_nca', label: 'Carer on NCA', behavior: 'DONT_ALLOW', minutes: null },
  { key: 'carer_on_leave', label: 'Carer on leave or sick', behavior: 'DONT_ALLOW', minutes: null },
  {
    key: 'medication_not_trained',
    label: 'Medication visit, carer not medication trained',
    behavior: 'REQUEST_CONFIRMATION',
    minutes: null,
  },
  {
    key: 'missing_client_skills',
    label: "Carer missing client's required skills",
    behavior: 'REQUEST_CONFIRMATION',
    minutes: null,
  },
  {
    key: 'carer_blocked_su_on_run',
    label: 'Carer blocked with 1 SU on run or job allocated to',
    behavior: 'DONT_ALLOW',
    minutes: null,
  },
  {
    key: 'carer_allocated_another_run',
    label: 'Carer allocated to another run',
    behavior: 'DONT_ALLOW',
    minutes: null,
  },
  {
    key: 'job_outside_working_pattern',
    label: 'Job or jobs outside working pattern',
    behavior: 'REQUEST_CONFIRMATION',
    minutes: null,
  },
  { key: 'allow_overlap', label: 'Allow overlap', behavior: 'REQUEST_CONFIRMATION', minutes: 0 },
  { key: 'time_between_jobs', label: 'Time between jobs', behavior: 'REQUEST_CONFIRMATION', minutes: 15 },
  {
    key: 'visit_change_across_zones',
    label: 'Visit change across zones',
    behavior: 'REQUEST_CONFIRMATION',
    minutes: null,
  },
]

export function ruleSupportsMinutes(key: string): boolean {
  return key === 'allow_overlap' || key === 'time_between_jobs'
}

export function mergeAllocationRules(saved: DomCareAllocationRule[]): DomCareAllocationRule[] {
  const byKey = new Map(saved.map(r => [r.key, r]))
  return DEFAULT_DOM_CARE_ALLOCATION_RULES.map(def => {
    const row = byKey.get(def.key)
    if (!row) return { ...def }
    return {
      ...def,
      behavior: row.behavior,
      minutes: ruleSupportsMinutes(def.key) ? (row.minutes ?? def.minutes) : null,
    }
  })
}
