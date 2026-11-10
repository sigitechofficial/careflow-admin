import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Loader2, RefreshCw } from 'lucide-react'
import { POLICY_PATHS } from '@/features/policies/policy-routes'
import { useApplyLibraryUpdate, useLibraryLink, useLibraryPolicy } from '@/features/policies/api/policy-library.api'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { Button } from '@/shared/ui/button'
import { RichTextHtml } from '@/shared/ui/rich-text-html'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'

/**
 * Shown on a policy adopted from Policies → Ready-made policies when the library has a newer
 * revision (law or guidance changed). Applying it puts the new text into a draft (a new major
 * version when the policy is published), which then goes through review and approval as usual.
 */
export function PolicyLibraryUpdateBanner({ policyId }: { policyId: string }) {
  const navigate = useNavigate()
  const link = useLibraryLink(policyId)
  const apply = useApplyLibraryUpdate()
  const [open, setOpen] = React.useState(false)
  const updated = useLibraryPolicy(open && link.data ? link.data.libraryId : null)

  const l = link.data
  if (!l?.updateAvailable) return null

  const onApply = () =>
    apply.mutate(policyId, {
      onSuccess: () => {
        setOpen(false)
        toastSuccess(
          `Ready-made revision ${l.currentRevision} is in your draft`,
          'Your previous wording stays in the version history. Check the draft, then send it for review.',
        )
        void navigate({ to: POLICY_PATHS.edit, params: { policyId } })
      },
      onError: e => toastApiError(e, 'Could not apply the update'),
    })

  return (
    <div
      className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
      data-testid="policy-library-update-banner"
    >
      <div className="min-w-0 space-y-0.5">
        <p className="font-medium">An updated ready-made version of this policy is available</p>
        <p>
          You adopted revision {l.adoptedRevision}; revision {l.currentRevision} is now available
          {l.revisionNote ? `: ${l.revisionNote}` : '.'}
        </p>
      </div>
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        <RefreshCw className="mr-1 h-4 w-4" />
        Review the update
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{l.title}: revision {l.currentRevision}</DialogTitle>
            <DialogDescription>
              {l.revisionNote ?? 'The ready-made policy has been updated.'} Applying it replaces the text of your
              draft with this version, with your organisation&apos;s name filled in. Any wording you changed yourself
              will need adding back; your current published version stays in the version history.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="max-h-[60vh] overflow-y-auto">
            {updated.isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : updated.data ? (
              <RichTextHtml className="policy-doc" html={updated.data.contentHtml} />
            ) : (
              <p className="text-sm text-destructive">The updated policy could not be loaded.</p>
            )}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Not now
            </Button>
            <Button type="button" onClick={onApply} disabled={apply.isPending}>
              {apply.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              Apply to a draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
