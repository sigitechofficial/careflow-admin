import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { BookCopy, FileArchive, PlusCircle, Scale, Settings2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { PageHeader } from '@/shared/ui/page-elements'
import { Badge } from '@/shared/ui/badge'
import { formatOrganisationDate } from '@/shared/lib/organisation-display-format.store'
import { useAuthStore } from '@/features/auth/store'
import { feedbackSelectClass } from '@/features/complaints/components/FeedbackFormDialog'
import type { MockInspectionStatus } from '../types'
import { useMockInspections } from '../hooks'
import { RATING_LABEL, STATUS_LABEL, ratingVariant, statusVariant } from '../labels'
import { StartInspectionDialog } from '../components/StartInspectionDialog'
import { EvidencePackDialog, useCanDownloadEvidencePack } from '../components/EvidencePackDialog'
import { HELP } from '../help'

/** Governance → Mock CQC inspection: the list of inspections. */
export default function MockInspectionsPage() {
  const navigate = useNavigate()
  const canManage = useAuthStore(s => s.can('cqc_mock_inspection.manage'))
  const [status, setStatus] = React.useState<MockInspectionStatus | ''>('')
  const [startOpen, setStartOpen] = React.useState(false)
  const canPack = useCanDownloadEvidencePack()
  const [packOpen, setPackOpen] = React.useState(false)
  const query = useMockInspections({ status: status || undefined, limit: 100 })
  const rows = query.data?.rows ?? []
  const error = query.error instanceof ApiError ? query.error.message : query.error ? 'Could not load inspections.' : null
  const open = (id: string) => void navigate({ to: '/governance/mock-inspections/$inspectionId', params: { inspectionId: id } })

  return (
    <div className="flex flex-col gap-4" data-testid="mock-inspections-page">
      <PageHeader
        title="Mock CQC inspection"
        description="Score each quality statement against your CQC evidence and see the rating each key question would get."
        icon={<Scale className="h-4 w-4 text-muted-foreground" aria-hidden />}
        info={HELP.listPage}
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Governance' }, { label: 'Mock CQC inspection' }]}
        actions={[
          {
            label: 'Settings',
            onClick: () => void navigate({ to: '/governance/mock-inspections/settings' }),
            icon: <Settings2 className="h-4 w-4" />,
            variant: 'outline' as const,
          },
          {
            label: 'Ready-made inspections',
            onClick: () => void navigate({ to: '/governance/mock-inspections/ready-made' }),
            icon: <BookCopy className="h-4 w-4" />,
            variant: 'outline' as const,
          },
          ...(canPack
            ? [
                {
                  label: 'Evidence pack',
                  onClick: () => setPackOpen(true),
                  icon: <FileArchive className="h-4 w-4" />,
                  variant: 'outline' as const,
                },
              ]
            : []),
          ...(canManage
            ? [{ label: 'Start mock inspection', onClick: () => setStartOpen(true), icon: <PlusCircle className="h-4 w-4" /> }]
            : []),
        ]}
      />

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <select
            className={`${feedbackSelectClass} max-w-[14rem]`}
            value={status}
            onChange={e => setStatus(e.target.value as MockInspectionStatus | '')}
            aria-label="Status"
            data-testid="mock-inspections-status-filter"
          >
            <option value="">All statuses</option>
            {(['IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const).map(s => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        {error ? <p className="mb-2 text-sm text-destructive">{error}</p> : null}
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm" data-testid="mock-inspections-table">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                {['Inspection', 'Service', 'Started', 'Progress', 'Overall rating', 'Open actions', 'Status'].map(h => (
                  <th key={h} className="whitespace-nowrap px-3 py-2.5 font-medium text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {query.isLoading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                    No mock inspections yet.{canManage ? ' Start one to see how the service would be rated.' : ''}
                  </td>
                </tr>
              ) : (
                rows.map(r => (
                  <tr
                    key={r.id}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/20"
                    onClick={() => open(r.id)}
                    data-testid="mock-inspection-row"
                  >
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-primary">{r.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.template ? `Ready-made: ${r.template.title}` : 'All quality statements'} ·{' '}
                        {r.framework.title} v{r.framework.version}
                        {r.leadReviewer?.name ? ` · led by ${r.leadReviewer.name}` : ''}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{r.location?.name ?? 'Whole organisation'}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                      {formatOrganisationDate(r.startedAt)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">
                      {r.scoredCount} / {r.statementCount} scored
                    </td>
                    <td className="px-3 py-2.5">
                      {r.overall ? (
                        <Badge size="sm" variant={ratingVariant(r.overall)}>
                          {RATING_LABEL[r.overall]}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">{r.openActions || '—'}</td>
                    <td className="px-3 py-2.5">
                      <Badge size="sm" variant={statusVariant(r.status)}>
                        {STATUS_LABEL[r.status]}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          This is the service's own practice inspection. The scoring follows CQC's published method as summarised by
          secondary sources and should be checked against the CQC website.
        </p>
      </div>

      <StartInspectionDialog open={startOpen} onOpenChange={setStartOpen} onStarted={open} />
      {canPack ? <EvidencePackDialog open={packOpen} onOpenChange={setPackOpen} /> : null}
    </div>
  )
}
