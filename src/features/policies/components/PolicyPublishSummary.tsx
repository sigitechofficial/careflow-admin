import { formatPolicyDate, summariseLink } from '@/features/policies/policy-format'
import type { PolicyLink, PolicyLinkInput } from '@/features/policies/types/policy.types'

export function PolicyPublishSummary({
  title,
  reference,
  effectiveDate,
  links,
}: {
  title: string
  reference: string
  effectiveDate?: string | null
  links?: Array<PolicyLink | PolicyLinkInput>
}) {
  const areas =
    links?.length ? links.map(link => summariseLink(link)).join('; ') : 'None'

  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-2" data-testid="policy-publish-summary">
      <div>
        <dt className="text-xs uppercase tracking-wide text-muted-foreground">Policy title</dt>
        <dd className="mt-0.5 font-medium">{title}</dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-muted-foreground">Reference</dt>
        <dd className="mt-0.5 font-mono text-xs">{reference}</dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-muted-foreground">Effective date</dt>
        <dd className="mt-0.5">{formatPolicyDate(effectiveDate)}</dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="text-xs uppercase tracking-wide text-muted-foreground">Linked CareFlow areas</dt>
        <dd className="mt-0.5">{areas}</dd>
      </div>
    </dl>
  )
}
