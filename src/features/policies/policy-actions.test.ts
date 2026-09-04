import { describe, expect, it } from 'vitest'
import {
  canPermanentlyDeletePolicy,
  previewVersionBump,
  visiblePolicyActions,
} from '@/features/policies/policy-actions'
import type { Permission } from '@/features/auth/types'

const allow =
  (...keys: Permission[]) =>
  (permission: Permission) =>
    keys.includes(permission)

describe('visiblePolicyActions', () => {
  it('shows edit and submit for a draft when the user can update and submit', () => {
    expect(
      visiblePolicyActions({
        documentStatus: 'DRAFT',
        workingStatus: 'DRAFT',
        hasInProgress: true,
        can: allow('policies.update', 'policies.submit'),
      }),
    ).toEqual(['edit', 'submit'])
  })

  it('shows delete for a never-published draft when the user can archive', () => {
    expect(
      visiblePolicyActions({
        documentStatus: 'DRAFT',
        workingStatus: 'DRAFT',
        hasInProgress: true,
        versions: [{ status: 'DRAFT' }],
        can: allow('policies.update', 'policies.submit', 'policies.archive'),
      }),
    ).toEqual(['edit', 'delete', 'submit'])
  })

  it('does not show whole-policy delete when a published version exists alongside a draft', () => {
    const actions = visiblePolicyActions({
      documentStatus: 'PUBLISHED',
      workingStatus: 'DRAFT',
      hasInProgress: true,
      versions: [{ status: 'PUBLISHED' }, { status: 'DRAFT' }],
      can: allow('policies.update', 'policies.submit', 'policies.archive'),
    })
    expect(actions).toContain('edit')
    expect(actions).not.toContain('delete')
  })

  it('does not show delete on a published policy', () => {
    const actions = visiblePolicyActions({
      documentStatus: 'PUBLISHED',
      workingStatus: null,
      hasInProgress: false,
      can: allow('policies.update', 'policies.archive', 'policies.publish'),
    })
    expect(actions).toContain('create_version')
    expect(actions).toContain('archive')
    expect(actions).not.toContain('edit')
    expect(actions).not.toContain('delete')
  })

  it('does not show edit on a published policy', () => {
    const actions = visiblePolicyActions({
      documentStatus: 'PUBLISHED',
      workingStatus: null,
      hasInProgress: false,
      can: allow('policies.update', 'policies.archive', 'policies.publish'),
    })
    expect(actions).toContain('create_version')
    expect(actions).toContain('archive')
    expect(actions).not.toContain('edit')
  })

  it('hides restricted actions when the user only has read', () => {
    expect(
      visiblePolicyActions({
        documentStatus: 'DRAFT',
        workingStatus: 'DRAFT',
        hasInProgress: true,
        can: allow('policies.read'),
      }),
    ).toEqual([])
  })

  it('shows review actions for in-review policies', () => {
    expect(
      visiblePolicyActions({
        documentStatus: 'IN_REVIEW',
        workingStatus: 'IN_REVIEW',
        hasInProgress: true,
        can: allow('policies.review', 'policies.approve', 'policies.archive'),
      }),
    ).toEqual(['request_changes', 'approve'])
  })

  it('shows publish for approved policies and not for published policies', () => {
    expect(
      visiblePolicyActions({
        documentStatus: 'APPROVED',
        workingStatus: 'APPROVED',
        hasInProgress: true,
        can: allow('policies.publish'),
      }),
    ).toEqual(['publish'])
    expect(
      visiblePolicyActions({
        documentStatus: 'PUBLISHED',
        workingStatus: null,
        hasInProgress: false,
        can: allow('policies.publish', 'policies.update', 'policies.archive'),
      }),
    ).not.toContain('publish')
  })

  it('previews minor and major version bumps', () => {
    expect(previewVersionBump(1, 2, 'minor')).toEqual({ major: 1, minor: 3, label: 'v1.3' })
    expect(previewVersionBump(1, 2, 'major')).toEqual({ major: 2, minor: 0, label: 'v2.0' })
  })
})

describe('canPermanentlyDeletePolicy', () => {
  it('allows never-published drafts only', () => {
    expect(canPermanentlyDeletePolicy({ documentStatus: 'DRAFT', versions: [{ status: 'DRAFT' }] })).toBe(true)
    expect(canPermanentlyDeletePolicy({ documentStatus: 'IN_REVIEW' })).toBe(false)
    expect(canPermanentlyDeletePolicy({ documentStatus: 'APPROVED' })).toBe(false)
    expect(canPermanentlyDeletePolicy({ documentStatus: 'PUBLISHED' })).toBe(false)
    expect(canPermanentlyDeletePolicy({ documentStatus: 'SUPERSEDED' })).toBe(false)
    expect(canPermanentlyDeletePolicy({ documentStatus: 'ARCHIVED' })).toBe(false)
    expect(
      canPermanentlyDeletePolicy({
        documentStatus: 'PUBLISHED',
        versions: [{ status: 'PUBLISHED' }, { status: 'DRAFT' }],
      }),
    ).toBe(false)
  })
})
