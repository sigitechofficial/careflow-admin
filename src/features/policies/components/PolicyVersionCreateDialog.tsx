import { RadioGroup, RadioGroupItem } from '@/shared/ui/toggle-controls'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { previewVersionBump } from '@/features/policies/policy-actions'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentMajor: number
  currentMinor: number
  bump: 'minor' | 'major'
  onBumpChange: (bump: 'minor' | 'major') => void
  pending?: boolean
  onConfirm: () => void
  contentKind?: 'EDITOR' | 'UPLOAD'
  reusePreviousContent: boolean
  onReusePreviousContentChange: (value: boolean) => void
}

export function PolicyVersionCreateDialog({
  open,
  onOpenChange,
  currentMajor,
  currentMinor,
  bump,
  onBumpChange,
  pending,
  onConfirm,
  contentKind = 'EDITOR',
  reusePreviousContent,
  onReusePreviousContentChange,
}: Props) {
  const minor = previewVersionBump(currentMajor, currentMinor, 'minor')
  const major = previewVersionBump(currentMajor, currentMinor, 'major')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Create new version</DialogTitle>
          <DialogDescription>
            The published version stays read-only. You will continue editing the new draft.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Choose a minor or major version bump.
          </p>
          <RadioGroup
            value={bump}
            onValueChange={v => onBumpChange(v as 'minor' | 'major')}
            className="space-y-2"
            aria-label="Version type"
          >
            <label className="flex items-start gap-2 rounded-lg border border-border p-3 text-sm">
              <RadioGroupItem value="minor" className="mt-0.5" />
              <span>
                <span className="font-medium">Minor</span>
                <span className="block text-muted-foreground">Current {`v${currentMajor}.${currentMinor}`} → {minor.label}</span>
              </span>
            </label>
            <label className="flex items-start gap-2 rounded-lg border border-border p-3 text-sm">
              <RadioGroupItem value="major" className="mt-0.5" />
              <span>
                <span className="font-medium">Major</span>
                <span className="block text-muted-foreground">Current {`v${currentMajor}.${currentMinor}`} → {major.label}</span>
              </span>
            </label>
          </RadioGroup>
          <div className="space-y-2" data-testid="policy-version-content-choice">
            <p className="text-sm font-medium">
              {contentKind === 'UPLOAD' ? 'Source document' : 'Policy content'}
            </p>
            <RadioGroup
              value={reusePreviousContent ? 'reuse' : 'replace'}
              onValueChange={v => onReusePreviousContentChange(v === 'reuse')}
              className="space-y-2"
              aria-label="Previous content"
            >
              <label className="flex items-start gap-2 rounded-lg border border-border p-3 text-sm">
                <RadioGroupItem value="reuse" className="mt-0.5" />
                <span>
                  <span className="font-medium">
                    {contentKind === 'UPLOAD' ? 'Reuse previous document' : 'Copy previous content'}
                  </span>
                  <span className="block text-muted-foreground">
                    {contentKind === 'UPLOAD'
                      ? 'The new draft starts with a copy of the published file. The published file stays unchanged.'
                      : 'The new draft starts with a copy of the published text. You can edit the copy.'}
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2 rounded-lg border border-border p-3 text-sm">
                <RadioGroupItem value="replace" className="mt-0.5" />
                <span>
                  <span className="font-medium">
                    {contentKind === 'UPLOAD' ? 'Upload replacement document' : 'Replace / edit with a blank editor'}
                  </span>
                  <span className="block text-muted-foreground">
                    {contentKind === 'UPLOAD'
                      ? 'The new draft starts empty so you can upload a different PDF or Word file.'
                      : 'The new draft starts without the previous text so you can rewrite it.'}
                  </span>
                </span>
              </label>
            </RadioGroup>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm} disabled={pending}>
            {pending ? 'Creating…' : 'Create version'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
