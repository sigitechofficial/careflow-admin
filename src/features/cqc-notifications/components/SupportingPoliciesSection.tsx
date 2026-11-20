import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { AlertTriangle, BookOpen, Copy, Plus, Search, Sparkles, X } from 'lucide-react'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useAuthStore } from '@/features/auth/store'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { InfoTip } from '@/features/cqc-mock-inspection/components/InfoTip'
import type { CqcNotificationDetail, CqcPolicyOption } from '../types'
import {
  useAddCqcNotificationPolicy,
  useCqcNotificationPolicies,
  useRemoveCqcNotificationPolicy,
  useSearchCqcNotificationPolicies,
} from '../hooks'
import { Section } from './SectionCard'

function useDebounced(value: string, ms = 250) {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value.trim()), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}

function PolicyLine({
  policy,
  canOpen,
  action,
}: {
  policy: Pick<CqcPolicyOption, 'policyDocumentId' | 'reference' | 'title' | 'version' | 'reviewOverdue'>
  canOpen: boolean
  action?: React.ReactNode
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
      <div className="min-w-0">
        {canOpen ? (
          <Link
            to="/policies/$policyId"
            params={{ policyId: policy.policyDocumentId }}
            className="text-sm font-medium text-primary hover:underline"
          >
            {policy.title}
          </Link>
        ) : (
          <span className="text-sm font-medium text-foreground">{policy.title}</span>
        )}
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-mono">{policy.reference}</span>
          {policy.version ? <span>· {policy.version}</span> : null}
          {policy.reviewOverdue ? (
            <span className="inline-flex items-center gap-1 text-warning">
              <AlertTriangle className="h-3 w-3" aria-hidden /> review date passed
            </span>
          ) : null}
        </div>
      </div>
      {action}
    </li>
  )
}

/**
 * Policies that back up the notification ("we have this policy for it"): attached ones, suggestions
 * for the notification type, a search for any other published policy, and suggested ready-made
 * policies the organisation has not published yet. Read-only once the notification is submitted.
 */
export function SupportingPoliciesSection({ notification }: { notification: CqcNotificationDetail }) {
  const can = useAuthStore(s => s.can)
  const canManage = can('cqc_notifications.manage')
  const canOpen = can('policies.read')
  const query = useCqcNotificationPolicies(notification.id)
  const add = useAddCqcNotificationPolicy(notification.id)
  const remove = useRemoveCqcNotificationPolicy(notification.id)
  const [search, setSearch] = React.useState('')
  const [searching, setSearching] = React.useState(false)
  const debounced = useDebounced(search)
  const data = query.data
  const editable = Boolean(canManage && data?.editable)
  const results = useSearchCqcNotificationPolicies(notification.id, debounced, editable && searching)
  // Once sent, show exactly what went with it.
  const sent = notification.submittedSnapshot?.policies

  const attach = async (p: CqcPolicyOption, source: 'SUGGESTED' | 'MANUAL') => {
    try {
      await add.mutateAsync({ policyDocumentId: p.policyDocumentId, source })
    } catch (e) {
      toastApiError(e, 'Could not attach the policy')
    }
  }
  const attachAll = async () => {
    for (const p of data?.suggested ?? []) await attach(p, 'SUGGESTED')
  }
  const detach = async (policyDocumentId: string) => {
    try {
      await remove.mutateAsync(policyDocumentId)
    } catch (e) {
      toastApiError(e, 'Could not remove the policy')
    }
  }
  const copyForCqc = async () => {
    if (!data?.cqcFormText) return
    try {
      await navigator.clipboard.writeText(data.cqcFormText)
      toastSuccess('Copied', 'Paste it into the CQC form.')
    } catch {
      toastApiError(new Error('Copy failed'), 'Could not copy. Select the text and copy it instead.')
    }
  }

  return (
    <Section
      icon={<BookOpen className="h-4 w-4" />}
      title="Supporting policies"
      description="Your policies that cover what happened. They show the CQC you have the right procedures in place."
      aside={
        <InfoTip label="supporting policies">
          Only your published policies that apply to this branch can be attached. Suggestions come from the type of
          notification and the answers given. What is attached when the notification is sent is kept with it.
        </InfoTip>
      }
    >
      <div className="space-y-5" data-testid="cqcn-policies">
        {query.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}

        {sent ? (
          sent.length ? (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {sent.map(p => (
                <li key={p.reference} className="px-3 py-2.5">
                  <div className="text-sm font-medium text-foreground">{p.title}</div>
                  <div className="text-xs text-muted-foreground">
                    <span className="font-mono">{p.reference}</span>
                    {p.version ? ` · ${p.version}` : ''}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No policies were attached when this was sent.</p>
          )
        ) : data ? (
          <>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Attached ({data.attached.length})
                </h3>
                {data.cqcFormText ? (
                  <Button size="sm" variant="outline" onClick={() => void copyForCqc()} data-testid="cqcn-policies-copy">
                    <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy for CQC form
                  </Button>
                ) : null}
              </div>
              {data.attached.length ? (
                <ul className="divide-y divide-border rounded-lg border border-border" data-testid="cqcn-policies-attached">
                  {data.attached.map(p => (
                    <PolicyLine
                      key={p.policyDocumentId}
                      policy={p}
                      canOpen={canOpen}
                      action={
                        editable ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={remove.isPending}
                            onClick={() => void detach(p.policyDocumentId)}
                            aria-label={`Remove ${p.title}`}
                          >
                            <X className="mr-1 h-3.5 w-3.5" /> Remove
                          </Button>
                        ) : null
                      }
                    />
                  ))}
                </ul>
              ) : (
                <p className="rounded-lg border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
                  No policies attached yet.
                </p>
              )}
            </div>

            {editable && data.suggested.length ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden /> Suggested for this notification
                  </h3>
                  <Button size="sm" variant="outline" disabled={add.isPending} onClick={() => void attachAll()}>
                    Add all ({data.suggested.length})
                  </Button>
                </div>
                <ul className="divide-y divide-border rounded-lg border border-primary/30 bg-primary/5" data-testid="cqcn-policies-suggested">
                  {data.suggested.map(p => (
                    <PolicyLine
                      key={p.policyDocumentId}
                      policy={p}
                      canOpen={canOpen}
                      action={
                        <Button size="sm" variant="outline" disabled={add.isPending} onClick={() => void attach(p, 'SUGGESTED')}>
                          <Plus className="mr-1 h-3.5 w-3.5" /> Add
                        </Button>
                      }
                    />
                  ))}
                </ul>
              </div>
            ) : null}

            {editable ? (
              <div className="space-y-2">
                {searching ? (
                  <>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        className="pl-8"
                        placeholder="Search your published policies by title or reference…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        aria-label="Search policies"
                        data-testid="cqcn-policies-search"
                      />
                    </div>
                    {results.isFetching && !results.data ? (
                      <p className="text-sm text-muted-foreground">Searching…</p>
                    ) : results.data?.length ? (
                      <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border">
                        {results.data.map(p => (
                          <PolicyLine
                            key={p.policyDocumentId}
                            policy={p}
                            canOpen={false}
                            action={
                              <Button size="sm" variant="outline" disabled={add.isPending} onClick={() => void attach(p, 'MANUAL')}>
                                <Plus className="mr-1 h-3.5 w-3.5" /> Add
                              </Button>
                            }
                          />
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">No published policies match.</p>
                    )}
                  </>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => setSearching(true)} data-testid="cqcn-policies-add-other">
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add another policy
                  </Button>
                )}
              </div>
            ) : null}

            {editable && data.notAdopted.length ? (
              <div className="space-y-2 rounded-lg border border-border bg-muted/20 px-3 py-3">
                <p className="text-sm font-medium text-foreground">Suggested, but not in your published policies</p>
                <p className="text-xs text-muted-foreground">
                  These ready-made policies cover this kind of notification. Adopt and publish them to be able to attach
                  them.
                </p>
                <ul className="flex flex-wrap gap-1.5">
                  {data.notAdopted.map(p => (
                    <li key={p.libraryReference}>
                      <Badge variant="outline" title={p.libraryReference}>
                        {p.title}
                        {p.adoptedStatus ? ' (adopted, not published)' : ''}
                      </Badge>
                    </li>
                  ))}
                </ul>
                {canOpen ? (
                  <Link to="/policies/ready-made" className="inline-block text-xs font-medium text-primary hover:underline">
                    Open ready-made policies →
                  </Link>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </Section>
  )
}
