import { AlertTriangle, CheckCircle2, FolderOpen, Upload, XCircle } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import type {
  DocumentComplianceGroup,
  DocumentComplianceItem,
} from '@/features/service-users/documents/service-user-document-store.api'

const GROUP_META: Record<
  DocumentComplianceGroup,
  { title: string; description: string }
> = {
  required: {
    title: 'Required before care',
    description: 'Must be complete before first visit and care-plan approval.',
  },
  legal: {
    title: 'Legal & capacity',
    description: 'DNAR, LPA, DoLS and related paperwork when applicable.',
  },
  clinical: {
    title: 'Clinical',
    description: 'Required when medication or clinical support is in place.',
  },
  recommended: {
    title: 'Recommended',
    description: 'Good practice — does not block care-plan approval.',
  },
}

const GROUP_ORDER: DocumentComplianceGroup[] = [
  'required',
  'legal',
  'clinical',
  'recommended',
]

function toneIcon(tone: DocumentComplianceItem['tone']) {
  if (tone === 'green') return CheckCircle2
  if (tone === 'amber') return AlertTriangle
  return XCircle
}

function statusBadge(item: DocumentComplianceItem) {
  if (item.tone === 'green') {
    return (
      <Badge variant="success" size="sm">
        {item.statusLabel}
      </Badge>
    )
  }
  if (item.tone === 'amber') {
    return (
      <Badge variant="warning" size="sm">
        {item.statusLabel}
      </Badge>
    )
  }
  return (
    <Badge variant="destructive" size="sm">
      {item.statusLabel}
    </Badge>
  )
}

function groupOf(item: DocumentComplianceItem): DocumentComplianceGroup {
  return item.group ?? (item.blocksCarePlanApproval ? 'required' : 'recommended')
}

export function DocumentStoreComplianceStrip({
  compliance,
  carePlanApprovalBlocked,
  canUpload,
  onUploadType,
  onOpenType,
}: {
  compliance: DocumentComplianceItem[]
  carePlanApprovalBlocked: boolean
  canUpload?: boolean
  onUploadType?: (documentTypeCode: string) => void
  onOpenType?: (documentTypeCode: string) => void
}) {
  const grouped = GROUP_ORDER.map((group) => ({
    group,
    items: compliance.filter((item) => groupOf(item) === group),
  })).filter((row) => row.items.length > 0)

  return (
    <div className="space-y-5" data-testid="document-store-compliance-strip">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Service user compliance</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Client documents required for safe care — not workforce checks (DBS, right to work).
          </p>
        </div>
        {carePlanApprovalBlocked ? (
          <span className="rounded-full border border-red-300 bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
            Blocks care plan approval
          </span>
        ) : (
          <span className="rounded-full border border-emerald-300 bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
            Care plan approval clear
          </span>
        )}
      </div>

      <div className="space-y-4">
        {grouped.map(({ group, items }) => {
          const meta = GROUP_META[group]
          return (
            <div key={group} className="space-y-2">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {meta.title}
                </h3>
                <p className="text-[11px] text-muted-foreground">{meta.description}</p>
              </div>
              <div className="overflow-hidden rounded-lg border border-border">
                <ul className="divide-y divide-border">
                  {items.map((item) => {
                    const Icon = toneIcon(item.tone)
                    const typeCode = item.documentTypeCode ?? null
                    return (
                      <li
                        key={item.key}
                        className="flex flex-wrap items-center gap-3 px-3 py-2.5"
                        data-testid={`su-compliance-item-${item.key}`}
                      >
                        <Icon
                          className={cn(
                            'h-4 w-4 shrink-0',
                            item.tone === 'green' && 'text-emerald-600',
                            item.tone === 'amber' && 'text-amber-600',
                            item.tone === 'red' && 'text-destructive',
                          )}
                          aria-hidden
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">{item.label}</p>
                          {item.detail ? (
                            <p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p>
                          ) : null}
                        </div>
                        {statusBadge(item)}
                        {typeCode ? (
                          <div className="flex shrink-0 items-center gap-1.5">
                            {onOpenType ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2"
                                onClick={() => onOpenType(typeCode)}
                                aria-label={`Open ${item.label} folder`}
                              >
                                <FolderOpen className="h-3.5 w-3.5" />
                              </Button>
                            ) : null}
                            {canUpload && onUploadType ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8"
                                onClick={() => onUploadType(typeCode)}
                              >
                                <Upload className="mr-1 h-3.5 w-3.5" />
                                Upload
                              </Button>
                            ) : null}
                          </div>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
