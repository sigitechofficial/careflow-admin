import type {
  PolicyLinkInput,
  PolicyLinkModuleType,
  PolicyLinkScope,
} from '@/features/policies/types/policy.types'

export const POLICY_LINK_ALLOWED_SCOPES: Record<PolicyLinkModuleType, PolicyLinkScope[]> = {
  CARE_PLAN: ['MODULE', 'FORM_TEMPLATE', 'RECORD'],
  INITIAL_ASSESSMENT: ['MODULE', 'SECTION', 'RECORD'],
  MEDICATION: ['MODULE', 'RECORD'],
  INCIDENT: ['MODULE', 'RECORD'],
  VISIT: ['MODULE', 'RECORD'],
  EMPLOYEE: ['MODULE', 'RECORD'],
  HR: ['MODULE', 'RECORD'],
  TRAINING: ['MODULE', 'FORM_TEMPLATE', 'RECORD'],
  RISK_ASSESSMENT: ['MODULE'],
  INFECTION_CONTROL: ['MODULE'],
  SAFEGUARDING: ['MODULE'],
  RECRUITMENT: ['MODULE'],
  AUDIT: ['MODULE'],
  BRANCH: ['MODULE'],
  EQUIPMENT: ['MODULE'],
  BUSINESS_CONTINUITY: ['MODULE'],
}

export function emptyPolicyLink(moduleType: PolicyLinkModuleType = 'CARE_PLAN'): PolicyLinkInput {
  return { moduleType, scope: 'MODULE' }
}

export function policyLinkIdentity(link: PolicyLinkInput): string {
  return `${link.moduleType}|${link.scope}|${link.recordId ?? ''}|${link.sectionKey ?? ''}`
}

export function isDuplicatePolicyLink(
  links: PolicyLinkInput[],
  candidate: PolicyLinkInput,
  ignoreIndex?: number,
): boolean {
  const key = policyLinkIdentity(candidate)
  return links.some((row, index) => index !== ignoreIndex && policyLinkIdentity(row) === key)
}

export function scopeLabel(moduleType: PolicyLinkModuleType, scope: PolicyLinkScope): string {
  if (scope === 'MODULE') return 'Whole module'
  if (scope === 'FORM_TEMPLATE') return moduleType === 'TRAINING' ? 'Specific course' : 'Specific form'
  if (scope === 'RECORD') return 'Specific record'
  if (scope === 'SECTION') return 'Specific section'
  return scope
}

export function scopesForModule(
  moduleType: PolicyLinkModuleType,
): Array<{ value: PolicyLinkScope; label: string }> {
  const scopes = POLICY_LINK_ALLOWED_SCOPES[moduleType] ?? ['MODULE']
  return scopes.map(scope => ({ value: scope, label: scopeLabel(moduleType, scope) }))
}
