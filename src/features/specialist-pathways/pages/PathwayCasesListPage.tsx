import * as React from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { EmptyState, LoadingSpinner } from '@/shared/ui/page-elements'
import { useAuthStore } from '@/features/auth/store'
import { useServiceUsers } from '@/features/service-users/hooks/useServiceUsers'
import { toastApiError } from '@/shared/lib/toast'
import { PathwaySectionLayout } from '@/features/specialist-pathways/components/PathwaySectionLayout'
import {
  usePathwayCases,
  useCreatePathwayCase,
} from '@/features/specialist-pathways/hooks/useSpecialistPathways'
import { metaForSlug, type PathwayMeta } from '@/features/specialist-pathways/pathway-specs'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import {
  CASE_STATUS_CLASS,
  CASE_STATUS_LABELS,
  PLAN_STATUS_LABELS,
  RISK_LEVEL_CLASS,
  RISK_LEVEL_LABELS,
  fmtDate,
  riskLevelOf,
} from '@/features/specialist-pathways/pathway-labels'
import type { PathwayCase } from '@/features/specialist-pathways/types/specialist-pathway.types'

function latestPlanLabel(c: PathwayCase): string {
  const latest = c.plans?.[0]
  return latest ? `v${latest.version} · ${PLAN_STATUS_LABELS[latest.status]}` : 'No plan'
}

function NewCaseForm({ meta, onClose }: { meta: PathwayMeta; onClose: () => void }) {
  const [search, setSearch] = React.useState('')
  const navigate = useNavigate()
  const create = useCreatePathwayCase()
  const { data, isFetching } = useServiceUsers({ search, limit: 8 }, search.trim().length >= 2)
  const rows = data?.rows ?? []

  const onPick = (serviceUserId: string) => {
    create.mutate(
      { serviceUserId, pathwayType: meta.type },
      {
        onSuccess: created =>
          navigate({
            to: '/specialist-pathways/$pathway/$caseId',
            params: { pathway: meta.slug, caseId: created.id },
          }),
        onError: e => toastApiError(e, 'Could not create case'),
      },
    )
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
          <Input
            autoFocus
            placeholder="Search service users by name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
        {search.trim().length < 2 ? (
          <p className="text-sm text-muted-foreground">Type at least 2 characters to search.</p>
        ) : isFetching ? (
          <LoadingSpinner />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No matching service users.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {rows.map(su => (
              <li key={su.id} className="flex items-center justify-between py-2">
                <span className="text-sm">
                  {su.preferredName || su.firstName} {su.lastName}
                  {su.serviceUserNumber ? (
                    <span className="ml-2 text-xs text-muted-foreground">{su.serviceUserNumber}</span>
                  ) : null}
                </span>
                <Button size="sm" onClick={() => onPick(su.id)} disabled={create.isPending}>
                  Start pathway
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

export default function PathwayCasesListPage() {
  const params = useParams({ strict: false }) as { pathway?: string }
  const meta = metaForSlug(params.pathway ?? '')
  const canManage = useAuthStore(s => s.can)('specialist_pathways.manage')
  const [adding, setAdding] = React.useState(false)
  const { locationId } = useGlobalLocationScope()
  const { data: cases, isLoading } = usePathwayCases(
    meta ? { type: meta.type, locationId: locationId ?? undefined } : undefined,
    !!meta,
  )

  if (!meta) {
    return (
      <PathwaySectionLayout title="Unknown pathway" description="" testId="pathway-cases-unknown">
        <EmptyState title="Unknown pathway" description="This specialist pathway does not exist." />
      </PathwaySectionLayout>
    )
  }

  return (
    <PathwaySectionLayout
      title={meta.label}
      description="Record specialist pathway assessments and manage approved care plans."
      testId="pathway-cases-list-page"
      actions={
        canManage
          ? [
              {
                label: 'New case',
                icon: <Plus className="h-4 w-4" aria-hidden />,
                onClick: () => setAdding(v => !v),
              },
            ]
          : undefined
      }
    >
      <div className="flex flex-col gap-4">
        {adding && <NewCaseForm meta={meta} onClose={() => setAdding(false)} />}

        {isLoading ? (
          <LoadingSpinner />
        ) : !cases || cases.length === 0 ? (
          <EmptyState
            title="No cases yet"
            description={`Create a case to start a ${meta.label} pathway for a service user.`}
          />
        ) : (
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Ref</th>
                    <th className="px-4 py-3 font-medium">Person</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Care plan</th>
                    <th className="px-4 py-3 font-medium">Highest risk</th>
                    <th className="px-4 py-3 font-medium">Review due</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map(c => (
                    <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <Link
                          to="/specialist-pathways/$pathway/$caseId"
                          params={{ pathway: meta.slug, caseId: c.id }}
                          className="font-medium text-primary hover:underline"
                        >
                          {c.ref}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{c.serviceUserName ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CASE_STATUS_CLASS[c.status]}`}>
                          {CASE_STATUS_LABELS[c.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{latestPlanLabel(c)}</td>
                      <td className="px-4 py-3">
                        {c.highestRiskScore ? (
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${RISK_LEVEL_CLASS[riskLevelOf(c.highestRiskScore)]}`}
                          >
                            {c.highestRiskScore} · {RISK_LEVEL_LABELS[riskLevelOf(c.highestRiskScore)]}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className={`px-4 py-3 ${c.reviewOverdue ? 'font-semibold text-red-600' : 'text-muted-foreground'}`}>
                        {fmtDate(c.reviewDueDate)}
                        {c.reviewOverdue && ' · Overdue'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </PathwaySectionLayout>
  )
}
