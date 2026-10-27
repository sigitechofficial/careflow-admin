import type {
  DomAllocationRuleBehavior,
  DomCareAllocationRule,
  DomWeeklyHoursRuleOptions,
  WeeklyHoursRejectAction,
} from '@/features/settings/types'

export const ALLOCATION_BEHAVIOR_OPTIONS: {
  value: DomAllocationRuleBehavior
  label: string
}[] = [
  { value: 'DONT_ALLOW', label: "Don't allow allocation" },
  { value: 'ALWAYS_ALLOW', label: 'Always allow' },
  { value: 'REQUEST_CONFIRMATION', label: 'Request confirmation' },
]

/** Carer over their contracted weekly hours (rota board, extra and special visits). */
export const WEEKLY_HOURS_RULE_KEY = 'carer_over_weekly_hours'

export const WEEKLY_HOURS_BEHAVIOR_OPTIONS: {
  value: DomAllocationRuleBehavior
  label: string
  description: string
}[] = [
  {
    value: 'DONT_ALLOW',
    label: "Don't allow",
    description: "The carer can't be given the visit.",
  },
  {
    value: 'MANAGER_APPROVAL',
    label: 'Manager must approve',
    description:
      'A request goes to Hours approvals. The carer gets the visit only after a manager approves it.',
  },
  {
    value: 'REQUEST_CONFIRMATION',
    label: 'Warn and confirm',
    description: 'The person giving the visit sees a warning and can confirm to go ahead.',
  },
  {
    value: 'ALWAYS_ALLOW',
    label: 'Always allow',
    description: 'Weekly hours are not checked.',
  },
]

export const WEEKLY_HOURS_REJECT_OPTIONS: { value: WeeklyHoursRejectAction; label: string }[] = [
  { value: 'REMOVE_EXTRA_VISITS', label: 'Remove the carer only from the visits that go over their hours' },
  { value: 'REMOVE_FROM_PLAN', label: 'Remove the carer from the whole visit plan' },
]

export const DEFAULT_WEEKLY_HOURS_RULE_OPTIONS: DomWeeklyHoursRuleOptions = {
  rejectAction: 'REMOVE_EXTRA_VISITS',
  maxApprovableHours: 60,
  countCalledOff: true,
}

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
  {
    key: WEEKLY_HOURS_RULE_KEY,
    label: 'Carer over weekly hours',
    behavior: 'MANAGER_APPROVAL',
    minutes: 0,
    weeklyHours: { ...DEFAULT_WEEKLY_HOURS_RULE_OPTIONS },
  },
]

/** For the weekly-hours rule, `minutes` is the grace allowed over the limit. */
export function ruleSupportsMinutes(key: string): boolean {
  return key === 'allow_overlap' || key === 'time_between_jobs' || key === WEEKLY_HOURS_RULE_KEY
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
      ...(def.weeklyHours ? { weeklyHours: { ...def.weeklyHours, ...row.weeklyHours } } : {}),
    }
  })
}
