import * as React from 'react'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { PolicyStatusBadge } from '@/features/policies/components/PolicyStatusBadge'
import { extractPolicyText } from '@/features/policies/policy-content'
import { formatPolicyDateTime } from '@/features/policies/policy-format'
import type { PolicyVersion } from '@/features/policies/types/policy.types'

type Props = {
  versions: PolicyVersion[]
  onOpenVersion: (version: PolicyVersion) => void
  selected?: PolicyVersion | null
  selectedLoading?: boolean
  onCloseSelected: () => void
}

export function PolicyVersionHistory({
  versions,
  onOpenVersion,
  selected,
  selectedLoading,
  onCloseSelected,
}: Props) {
  if (versions.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
        Version history will appear here.
      </p>
    )
  }

  return (
    <>
      <ol className="space-y-2" data-testid="policy-version-history">
        {versions.map(version => (
          <li key={version.id}>
            <button
              type="button"
              className="flex w-full items-start justify-between gap-3 rounded-lg border border-border px-3 py-2 text-left hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => onOpenVersion(version)}
            >
              <span>
                <span className="font-medium">{version.versionLabel}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {formatPolicyDateTime(version.publishedAt ?? version.createdAt)}
                </span>
              </span>
              <PolicyStatusBadge status={version.status} size="sm" />
            </button>
          </li>
        ))}
      </ol>

      <Dialog open={Boolean(selected) || selectedLoading} onOpenChange={open => !open && onCloseSelected()}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>
              {selected ? `${selected.versionLabel} — read only` : 'Version'}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            {selectedLoading || !selected ? (
              <p className="text-sm text-muted-foreground">Loading version…</p>
            ) : (
              <div className="space-y-3">
                <PolicyStatusBadge status={selected.status} />
                <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/20 p-3 text-sm">
                  {extractPolicyText(selected.contentJson, selected.contentHtml) || 'No content.'}
                </pre>
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCloseSelected}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
