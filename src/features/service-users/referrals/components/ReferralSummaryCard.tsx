import { Link } from '@tanstack/react-router'
import { formatOrganisationDate, formatOrganisationDateTime } from '@/shared/lib/organisation-display-format.store'
import { useReferrals } from '@/features/service-users/referrals/useReferrals'
import {
  REFERRAL_SOURCE_LABEL,
  REFERRAL_STATUS_LABEL,
  REFERRAL_VIA_LABEL,
  referralStatusVariant,
} from '@/features/service-users/referrals/referral-labels'
import { Badge } from '@/shared/ui/badge'

type LegacyReferral = {
  authority: string
  source: string
  date: string
  receivedVia: string
  receivedAt: string
  notes: string
  recordedBy: string
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{children || '—'}</dd>
    </div>
  )
}

/**
 * Personal Details → Referral: read-only summary of the latest referral. Details, follow-ups and quotations
 * are managed on the Referral & Quotes tab. Shows the earlier free-text fields if no referral record exists yet.
 */
export function ReferralSummaryCard({ serviceUserId, legacy }: { serviceUserId: string; legacy: LegacyReferral }) {
  const query = useReferrals(serviceUserId)
  const latest = query.data?.[0]
  const hasLegacy = Object.values(legacy).some(v => v.trim())

  return (
    <div className="space-y-3" data-testid="referral-summary">
      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : latest ? (
        <>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-medium">{latest.referenceNumber}</span>
            <Badge size="sm" variant={referralStatusVariant(latest.status)}>
              {REFERRAL_STATUS_LABEL[latest.status]}
            </Badge>
            {(query.data?.length ?? 0) > 1 ? (
              <span className="text-xs text-muted-foreground">+{(query.data?.length ?? 1) - 1} earlier</span>
            ) : null}
          </div>
          <dl className="grid gap-3 sm:grid-cols-2">
            <Item label="Source">
              {REFERRAL_SOURCE_LABEL[latest.sourceType]}
              {latest.referringOrganisation ? ` · ${latest.referringOrganisation}` : ''}
            </Item>
            <Item label="Contact person">{latest.referrerName}</Item>
            <Item label="Received">
              {formatOrganisationDateTime(latest.receivedAt)} · {REFERRAL_VIA_LABEL[latest.receivedVia]}
            </Item>
            <Item label="Recorded in system">
              {latest.recordedByName ?? '—'} · {formatOrganisationDateTime(latest.createdAt)}
            </Item>
            <Item label="Funding arrangement">{latest.fundingType?.name ?? 'To be confirmed'}</Item>
            <Item label="Expected start">
              {latest.expectedStartDate ? formatOrganisationDate(latest.expectedStartDate) : null}
            </Item>
          </dl>
        </>
      ) : hasLegacy ? (
        <dl className="grid gap-3 sm:grid-cols-2">
          <Item label="Referring authority">{legacy.authority}</Item>
          <Item label="Referred by">{legacy.source}</Item>
          <Item label="Referral date">{legacy.date ? formatOrganisationDate(legacy.date) : null}</Item>
          <Item label="Received">
            {[legacy.receivedAt ? formatOrganisationDateTime(legacy.receivedAt) : '', legacy.receivedVia]
              .filter(Boolean)
              .join(' · ')}
          </Item>
          <Item label="Notes">{legacy.notes}</Item>
          <Item label="Recorded by">{legacy.recordedBy}</Item>
        </dl>
      ) : (
        <p className="text-sm text-muted-foreground">No referral recorded yet.</p>
      )}
      <Link
        to="/service-users/$serviceUserId/profile"
        params={{ serviceUserId }}
        search={{ tab: 'referrals' }}
        className="inline-block text-sm font-medium text-primary hover:underline"
        data-testid="referral-summary-open"
      >
        {latest ? 'Open Referral & Quotes' : 'Record a referral on the Referral & Quotes tab'}
      </Link>
    </div>
  )
}
