import * as React from 'react'
import { BellRing } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/dialog'
import { toastApiError, toastSuccess, toastWarning } from '@/shared/lib/toast'
import { useRemindOne } from '@/features/surveys/reminders/survey-reminders'

/** The most reminders anyone is sent on one survey (API: MAX_SURVEY_REMINDERS). */
const MAX_REMINDERS = 3
/** At least this many days between two reminders to one person (API: MIN_REMINDER_GAP_DAYS). */
const GAP_DAYS = 2

/**
 * Remind one person who has not answered a named survey. Only ever rendered on named surveys for
 * managers who can see who has answered (the recipients list); the API refuses anonymous surveys.
 */
export function RemindOneButton({
  surveyId,
  recipientId,
  name,
  reminderCount,
  remindedAt,
}: {
  surveyId: string
  recipientId: string
  name: string
  reminderCount: number
  remindedAt: string | null
}) {
  const remind = useRemindOne(surveyId)
  const [open, setOpen] = React.useState(false)
  const atMost = reminderCount >= MAX_REMINDERS
  const tooSoon = Boolean(remindedAt && Date.now() - new Date(remindedAt).getTime() < GAP_DAYS * 86_400_000)
  const why = atMost
    ? `${name} has had ${MAX_REMINDERS} reminders, the most anyone is sent.`
    : tooSoon
      ? `${name} was reminded in the last ${GAP_DAYS} days.`
      : null

  const send = async () => {
    try {
      const res = await remind.mutateAsync(recipientId)
      if (res.data?.reminded) toastSuccess(res.message ?? 'Reminder sent')
      else toastWarning('Reminder not sent', res.message)
    } catch (e) {
      toastApiError(e, 'Could not send the reminder')
    } finally {
      setOpen(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 gap-1 px-2"
        disabled={Boolean(why) || remind.isPending}
        title={why ?? undefined}
        onClick={() => setOpen(true)}
        aria-label={why ? `Remind ${name}: ${why}` : `Remind ${name}`}
      >
        <BellRing className="h-3.5 w-3.5" aria-hidden /> Remind
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remind {name} now?</AlertDialogTitle>
            <AlertDialogDescription>
              They get a reminder with their own link, by the ways set in Reminders and follow-up (or the carer app,
              email and portal if none are set), unless they have asked not to be contacted that way. It counts towards
              the {MAX_REMINDERS} reminders anyone is sent, and nothing is sent in quiet hours.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={remind.isPending}
              onClick={e => {
                e.preventDefault()
                void send()
              }}
            >
              Send reminder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
