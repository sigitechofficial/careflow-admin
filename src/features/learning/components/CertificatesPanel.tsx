import * as React from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { Eye, Info, Loader2, Plus, Search } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { ContentSectionHeader } from '@/shared/ui/content-section'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip'
import { useLearningCertificates } from '@/features/learning/hooks/useLearning'
import { LearningStatusBadge } from '@/features/learning/components/LearningStatusBadge'
import { CertificateViewDialog } from '@/features/learning/components/CertificateViewDialog'
import { IssueCertificateDialog } from '@/features/learning/components/IssueCertificateDialog'
import type { LearningCertificate } from '@/features/learning/types/learning.types'
import { useAuthStore } from '@/features/auth/store'

function ColumnInfo({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      {label}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex shrink-0 text-muted-foreground transition-colors hover:text-foreground"
            aria-label={`About ${label}`}
            onClick={e => {
              e.preventDefault()
              e.stopPropagation()
            }}
          >
            <Info className="h-3.5 w-3.5" aria-hidden />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-left text-xs leading-snug">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </span>
  )
}

type CertTab = 'ACTIVE' | 'EXPIRED' | 'ALL'
const CERT_TABS: Array<{ value: CertTab; label: string }> = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'ALL', label: 'All' },
]

export function CertificatesPanel() {
  const canManage = useAuthStore(s => s.can('learning.certificates.manage'))
  const [page, setPage] = React.useState(1)
  const [search, setSearch] = React.useState('')
  const [viewCertificate, setViewCertificate] = React.useState<LearningCertificate | null>(null)
  const [issueOpen, setIssueOpen] = React.useState(false)
  // Active / Expired tabs (17 Nov 2026). Revoked and replaced certificates show under All.
  const [tab, setTab] = React.useState<CertTab>('ACTIVE')

  const query = useLearningCertificates({
    page,
    limit: 20,
    search: search || undefined,
    status: tab === 'ALL' ? undefined : tab,
  })
  const activeCount = useLearningCertificates({ limit: 1, search: search || undefined, status: 'ACTIVE' })
  const expiredCount = useLearningCertificates({ limit: 1, search: search || undefined, status: 'EXPIRED' })
  const allCount = useLearningCertificates({ limit: 1, search: search || undefined })
  const countOf: Record<CertTab, number | undefined> = {
    ACTIVE: activeCount.data?.meta?.total,
    EXPIRED: expiredCount.data?.meta?.total,
    ALL: allCount.data?.meta?.total,
  }
  const rows = query.data?.rows ?? []
  const meta = query.data?.meta

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4" data-testid="learning-certificates-panel">
        <ContentSectionHeader
          title="Certificates"
          description="Issued course completion certificates across the organisation. Certificates are issued automatically on completion, or manually when needed."
          action={
            canManage ? (
              <Button size="sm" onClick={() => setIssueOpen(true)}>
                <Plus className="mr-1 h-4 w-4" />
                Issue certificate
              </Button>
            ) : undefined
          }
        />

        <Tabs
          value={tab}
          onValueChange={v => {
            setTab(v as CertTab)
            setPage(1)
          }}
        >
          <TabsList variant="underline" className="h-auto justify-start" aria-label="Certificate status">
            {CERT_TABS.map(t => (
              <TabsTrigger key={t.value} value={t.value} variant="underline" data-testid={`certificates-tab-${t.value}`}>
                {t.label}
                <span className="ml-1.5 text-xs text-muted-foreground">{countOf[t.value] ?? ''}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search employee, course, or certificate #…"
            value={search}
            onChange={e => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>

        {query.isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : query.isError ? (
          <p className="py-8 text-center text-sm text-destructive">
            Unable to load certificates. Please try again.
          </p>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {tab === 'ACTIVE' ? 'No active certificates.' : tab === 'EXPIRED' ? 'No expired certificates.' : 'No certificates found.'}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[780px] text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Certificate #</th>
                  <th className="px-3 py-2">Employee</th>
                  <th className="px-3 py-2">Course</th>
                  <th className="px-3 py-2">Issued</th>
                  <th className="px-3 py-2">
                    <ColumnInfo
                      label="Expires"
                      tooltip="When this certificate stops being valid. After this date compliance may show as Expired."
                    />
                  </th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="px-3 py-2 font-mono text-xs">
                      {row.certificateNumber ?? row.id.slice(0, 8)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-foreground">{row.employeeName || '—'}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-foreground">{row.courseTitle || '—'}</div>
                      {row.courseCode ? (
                        <div className="text-[11px] text-muted-foreground">{row.courseCode}</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {new Date(row.issuedAt).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {row.expiresAt ? new Date(row.expiresAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <LearningStatusBadge
                        status={
                          row.status === 'ACTIVE' && row.expiresAt && new Date(row.expiresAt).getTime() < Date.now()
                            ? 'EXPIRED'
                            : row.status
                        }
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button size="sm" variant="outline" onClick={() => setViewCertificate(row)}>
                        <Eye className="mr-1 h-3.5 w-3.5" />
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {meta && meta.totalPages && meta.totalPages > 1 ? (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {meta.page} of {meta.totalPages}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!meta.hasNextPage}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}

        <CertificateViewDialog
          open={!!viewCertificate}
          onOpenChange={open => {
            if (!open) setViewCertificate(null)
          }}
          certificate={viewCertificate}
        />

        <IssueCertificateDialog open={issueOpen} onOpenChange={setIssueOpen} />
      </div>
    </TooltipProvider>
  )
}
