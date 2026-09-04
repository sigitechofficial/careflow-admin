import { describe, expect, it } from 'vitest'
import {
  emptyPolicyLink,
  isDuplicatePolicyLink,
  POLICY_LINK_ALLOWED_SCOPES,
  policyLinkIdentity,
  scopesForModule,
} from '@/features/policies/policy-link-rules'
import { linkTargetSummary, summariseLink } from '@/features/policies/policy-format'
import type { PolicyLink } from '@/features/policies/types/policy.types'

describe('policy-link-rules', () => {
  it('identifies duplicate links by module, scope, record, and section', () => {
    const first = emptyPolicyLink('CARE_PLAN')
    const second = emptyPolicyLink('INCIDENT')
    expect(isDuplicatePolicyLink([first], emptyPolicyLink('CARE_PLAN'))).toBe(true)
    expect(isDuplicatePolicyLink([first], second)).toBe(false)
    expect(isDuplicatePolicyLink([first], first, 0)).toBe(false)
    expect(policyLinkIdentity({ moduleType: 'CARE_PLAN', scope: 'RECORD', recordId: 'cp-1' })).toBe(
      'CARE_PLAN|RECORD|cp-1|',
    )
  })

  it('exposes allowed scopes per module and hides invalid combinations', () => {
    expect(POLICY_LINK_ALLOWED_SCOPES.CARE_PLAN).toEqual(['MODULE', 'FORM_TEMPLATE', 'RECORD'])
    expect(POLICY_LINK_ALLOWED_SCOPES.INCIDENT).toEqual(['MODULE', 'RECORD'])
    expect(scopesForModule('SAFEGUARDING')).toEqual([{ value: 'MODULE', label: 'Whole module' }])
    expect(scopesForModule('TRAINING').some(row => row.value === 'FORM_TEMPLATE')).toBe(true)
  })
})

describe('policy link summaries', () => {
  it('shows module and target separately for multi-link display', () => {
    const links: PolicyLink[] = [
      { moduleType: 'CARE_PLAN', scope: 'MODULE', recordId: null, sectionKey: null, label: null },
      {
        moduleType: 'INCIDENT',
        scope: 'RECORD',
        recordId: 'inc-1',
        sectionKey: null,
        label: 'INC-100',
      },
    ]
    expect(summariseLink(links[0]!)).toContain('Care Plans')
    expect(linkTargetSummary(links[0]!)).toBe('Whole module')
    expect(linkTargetSummary(links[1]!)).toBe('INC-100')
  })
})
