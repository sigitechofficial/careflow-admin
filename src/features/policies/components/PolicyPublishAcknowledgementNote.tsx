import { useAuthStore } from '@/features/auth/store'
import { usePolicyPublishPreview } from '@/features/policies/hooks/usePolicyAcknowledgements'
import { formatPolicyDate } from '@/features/policies/policy-format'
import type { PolicyPublishPreview } from '@/features/policies/types/policy.types'

/** Plain-English line for the publish dialog; null when the version does not need acknowledging. */
export function publishAcknowledgementText(preview: PolicyPublishPreview): string | null {
  if (!preview.acknowledgementRequired) return null
  const covered =
    preview.alreadyAcknowledged > 0
      ? ` ${preview.alreadyAcknowledged} ${preview.alreadyAcknowledged === 1 ? 'has' : 'have'} already acknowledged an earlier minor version and will not be asked again.`
      : ''
  if (preview.staffCount === 0) {
    return preview.inScope === 0
      ? 'No active staff match this policy’s audience yet, so nobody will be asked to acknowledge it.'
      : `No staff will need to acknowledge it.${covered}`
  }
  const staff = `${preview.staffCount} staff member${preview.staffCount === 1 ? '' : 's'}`
  const by = preview.dueAt ? ` by ${formatPolicyDate(preview.dueAt)}` : ''
  return `${staff} will need to read and acknowledge this policy${by}.${covered}`
}

/** How many staff will need to read and acknowledge the working version once published. */
export function PolicyPublishAcknowledgementNote({
  policyId,
  variant = 'block',
}: {
  policyId: string
  variant?: 'block' | 'inline'
}) {
  const canPreview = useAuthStore(s => s.can('policies.publish') || s.can('policies.acknowledgements.manage'))
  const query = usePolicyPublishPreview(policyId, canPreview)
  if (!canPreview) return null
  if (query.isLoading) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="policy-publish-acknowledgement-note">
        Checking which staff will need to acknowledge it…
      </p>
    )
  }
  const text = query.data ? publishAcknowledgementText(query.data) : null
  if (!text) return null
  if (variant === 'inline') {
    return (
      <p className="text-sm font-medium text-foreground" data-testid="policy-publish-acknowledgement-note">
        {text}
      </p>
    )
  }
  return (
    <div data-testid="policy-publish-acknowledgement-note">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">Staff acknowledgement</p>
      <p className="mt-0.5 text-sm font-medium">{text}</p>
    </div>
  )
}
