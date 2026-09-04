import type { Permission } from '@/features/auth/types'
import type { PolicyStatus } from '@/features/policies/types/policy.types'
import { POLICY_IN_PROGRESS_STATUSES } from '@/features/policies/types/policy.types'

export type PolicyUiAction =
  | 'edit'
  | 'delete'
  | 'submit'
  | 'request_changes'
  | 'approve'
  | 'publish'
  | 'create_version'
  | 'archive'

export function canPermanentlyDeletePolicy(args: {
  documentStatus: PolicyStatus
  versions?: Array<{ status: PolicyStatus }> | null
  currentVersionStatus?: PolicyStatus | null
}): boolean {
  if (args.documentStatus !== 'DRAFT') return false
  if (args.currentVersionStatus && args.currentVersionStatus !== 'DRAFT') return false
  const versions = args.versions ?? []
  if (versions.length === 0) return args.currentVersionStatus == null || args.currentVersionStatus === 'DRAFT'
  return versions.every(row => row.status === 'DRAFT')
}

export function policyDeleteConfirmCopy(title: string): {
  title: string
  description: string
  confirmLabel: string
} {
  return {
    title: 'Delete policy?',
    description: `Are you sure you want to delete "${title}"?\n\nThis draft and its associated content will be permanently removed. This action cannot be undone.`,
    confirmLabel: 'Delete policy',
  }
}

export function workingVersionStatus(
  versions: Array<{ status: PolicyStatus }> | undefined,
): PolicyStatus | null {
  const working = (versions ?? []).find(row => POLICY_IN_PROGRESS_STATUSES.includes(row.status))
  return working?.status ?? null
}

export function hasInProgressVersion(versions: Array<{ status: PolicyStatus }> | undefined): boolean {
  return workingVersionStatus(versions) != null
}

/** True when the working or document status is APPROVED and waiting to go live. */
export function isReadyToPublish(args: {
  documentStatus: PolicyStatus
  workingStatus: PolicyStatus | null
}): boolean {
  return (args.workingStatus ?? args.documentStatus) === 'APPROVED'
}

export const POLICY_PUBLISH_CONFIRM = {
  title: 'Publish policy?',
  description:
    'Publishing makes this policy available to staff in its linked CareFlow areas. This becomes the live version and supersedes any currently published version.',
  confirmLabel: 'Publish policy',
} as const

export function visiblePolicyActions(args: {
  documentStatus: PolicyStatus
  workingStatus: PolicyStatus | null
  hasInProgress: boolean
  versions?: Array<{ status: PolicyStatus }>
  can: (permission: Permission) => boolean
}): PolicyUiAction[] {
  const actions: PolicyUiAction[] = []
  const working = args.workingStatus ?? (POLICY_IN_PROGRESS_STATUSES.includes(args.documentStatus) ? args.documentStatus : null)

  if (working === 'DRAFT') {
    if (args.can('policies.update')) actions.push('edit')
    if (
      canPermanentlyDeletePolicy({
        documentStatus: args.documentStatus,
        versions: args.versions,
      }) &&
      args.can('policies.archive')
    ) {
      actions.push('delete')
    }
    if (args.can('policies.submit')) actions.push('submit')
  }

  if (working === 'IN_REVIEW') {
    if (args.can('policies.review')) actions.push('request_changes')
    if (args.can('policies.approve')) actions.push('approve')
  }

  if (working === 'APPROVED' && args.can('policies.publish')) {
    actions.push('publish')
  }

  if (args.documentStatus === 'PUBLISHED' && !args.hasInProgress) {
    if (args.can('policies.update')) actions.push('create_version')
    if (args.can('policies.archive')) actions.push('archive')
  }

  return actions
}

export function previewVersionBump(
  major: number,
  minor: number,
  bump: 'minor' | 'major',
): { major: number; minor: number; label: string } {
  if (bump === 'major') return { major: major + 1, minor: 0, label: `v${major + 1}.0` }
  return { major, minor: minor + 1, label: `v${major}.${minor + 1}` }
}

export function formatVersionLabel(major: number, minor: number): string {
  return `v${major}.${minor}`
}
