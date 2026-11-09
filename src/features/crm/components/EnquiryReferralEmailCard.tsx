import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Badge } from '@/shared/ui/badge'
import { fetchReferralEmailsForEnquiry } from '@/features/crm/api/referral-inbox.api'
import { ReferralAttachments } from '@/features/crm/components/ReferralAttachments'
import { DECISION } from '@/features/crm/components/ReferralAutomationPanels'
import { ReferralFullDetails } from '@/features/crm/components/ReferralFullDetails'

/** The referral email(s) this enquiry came from, with their attachments, the decision and the reply. */
export function EnquiryReferralEmailCard({ enquiryId }: { enquiryId: string }) {
  const q = useQuery({
    queryKey: ['referral-inbox', 'for-enquiry', enquiryId],
    queryFn: () => fetchReferralEmailsForEnquiry(enquiryId),
  })
  const rows = q.data ?? []
  const ref = React.useRef<HTMLDivElement>(null)
  // Opened from a board card's paperclip (#referral-email): bring the attachments into view once loaded.
  React.useEffect(() => {
    if (rows.length && window.location.hash === '#referral-email') {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [rows.length])
  if (!rows.length) return null
  return (
    <Card ref={ref} id="referral-email" className="scroll-mt-20" data-testid="enquiry-referral-email">
      <CardHeader>
        <CardTitle className="text-base">Referral email</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.map(m => (
          <div key={m.id} className="space-y-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{m.subject || '(no subject)'}</span>
              {m.decision ? <Badge variant={DECISION[m.decision]?.variant ?? 'info'}>{DECISION[m.decision]?.label}</Badge> : null}
            </div>
            <p className="text-muted-foreground">
              From {m.fromName || m.fromEmail} · {new Date(m.receivedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
              {m.replySentAt ? ` · replied ${new Date(m.replySentAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}` : m.replyText ? ' · reply waiting to be sent' : ''}
            </p>
            <ReferralAttachments email={m} />
            {m.extraction ? (
              <details className="group rounded-md border border-border">
                <summary className="cursor-pointer select-none px-3 py-2 font-medium">Full referral details</summary>
                <div className="border-t border-border p-3">
                  <ReferralFullDetails e={m.extraction} />
                </div>
              </details>
            ) : null}
            <Link to="/crm/referral-inbox" className="text-primary hover:underline">
              Open in the referral inbox
            </Link>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
