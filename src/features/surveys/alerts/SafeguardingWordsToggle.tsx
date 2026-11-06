import * as React from 'react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useSafeguardingWords } from './survey-alerts'

/**
 * The built-in safeguarding-words alert on every survey: written answers with words that may point to harm go to the
 * safeguarding lead the same day. Read by CareFlow itself; no answer is sent anywhere. Switching it off needs a reason.
 */
export function SafeguardingWordsToggle({ surveyId, isActive }: { surveyId: string; isActive: boolean }) {
  const [open, setOpen] = React.useState(false)
  const [reason, setReason] = React.useState('')
  const save = useSafeguardingWords(surveyId)
  const run = async (input: { isActive: boolean; reason?: string }) => {
    try {
      await save.mutateAsync(input)
      toastSuccess(input.isActive ? 'Safeguarding-words alert switched on' : 'Safeguarding-words alert switched off')
      setOpen(false)
      setReason('')
    } catch (e) {
      toastApiError(e, 'Could not change the alert')
    }
  }
  return (
    <>
      {isActive ? (
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
          Switch off
        </Button>
      ) : (
        <Button type="button" size="sm" variant="outline" disabled={save.isPending} onClick={() => void run({ isActive: true })}>
          Switch on
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Switch off the safeguarding-words alert?</DialogTitle>
            <DialogDescription>
              Written answers to this survey will no longer be checked for words that may point to harm. Say why: it is kept
              in the audit trail.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <label htmlFor="sg-reason" className="text-sm font-medium">
              Reason
            </label>
            <Input id="sg-reason" value={reason} maxLength={300} onChange={e => setReason(e.target.value)} placeholder="For example: answers are read by the safeguarding lead every day" />
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={reason.trim().length < 5 || save.isPending} onClick={() => void run({ isActive: false, reason: reason.trim() })}>
              Switch off
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
