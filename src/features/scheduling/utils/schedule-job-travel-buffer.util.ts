import {
  DEFAULT_DOM_CARE_ALLOCATION_RULES,
  mergeAllocationRules,
} from '@/features/settings/dom-care/dom-care-allocation-rules-defaults'
import type { DomCareAllocationRule } from '@/features/settings/types'

/** Minimum gap between jobs from org dom-care allocation rules (default 15 min). */
export function resolveTimeBetweenJobsBufferMinutes(
  rules: DomCareAllocationRule[] | undefined | null,
): number {
  const merged = mergeAllocationRules(
    rules?.length ? rules : DEFAULT_DOM_CARE_ALLOCATION_RULES,
  )
  const rule = merged.find((row) => row.key === 'time_between_jobs')
  if (!rule || rule.behavior === 'ALWAYS_ALLOW') return 0
  return Math.max(0, rule.minutes ?? 15)
}
