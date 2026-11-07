import * as React from 'react'
import { create } from 'zustand'
import { ClipboardPen } from 'lucide-react'
import { useAuthStore } from '@/features/auth/store'
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
import { useSurveysToCollect, type SurveyToCollect } from './survey-reminders'
import { RecordForPerson } from './SurveysToCollectList'

type DuePromptState = {
  /** The person a review or assessment was just saved for; null when no prompt is waiting. */
  serviceUserId: string | null
  /** What was just done, in the prompt's words (e.g. "the care plan review"). */
  occasion: string
  ask: (serviceUserId: string, occasion: string) => void
  clear: () => void
}

export const useSurveyDuePromptStore = create<DuePromptState>(set => ({
  serviceUserId: null,
  occasion: '',
  ask: (serviceUserId, occasion) => set({ serviceUserId, occasion }),
  clear: () => set({ serviceUserId: null, occasion: '' }),
}))

/**
 * After a care plan review or an assessment is saved: when a survey is due for that person (e.g. "Your life and
 * how our support helps", asked at assessment and reviews), offer to record it now, in person. Nothing is shown
 * when nothing is due or the user cannot record answers.
 */
export function askForDueSurveys(serviceUserId: string, occasion: string) {
  if (!useAuthStore.getState().can('surveys.responses.record')) return
  useSurveyDuePromptStore.getState().ask(serviceUserId, occasion)
}

/** Rendered once in the app shell; shows the prompt when one is waiting. */
export function SurveyDuePromptHost() {
  const { serviceUserId, occasion, clear } = useSurveyDuePromptStore()
  const due = useSurveysToCollect({ serviceUserId: serviceUserId ?? undefined }, Boolean(serviceUserId))
  const [recording, setRecording] = React.useState<{ item: SurveyToCollect } | null>(null)

  React.useEffect(() => {
    // Nothing due (or no access): the prompt quietly goes away.
    if (serviceUserId && (due.isError || (due.data && due.data.length === 0))) clear()
  }, [serviceUserId, due.isError, due.data, clear])

  const p = recording?.item.people[0]
  if (recording && p) {
    return (
      <RecordForPerson
        surveyId={recording.item.survey.id}
        person={{ id: (p.serviceUserId ?? p.employeeId)!, name: p.name, phone: p.phones[0]?.number ?? null }}
        initialChannel="IN_PERSON"
        onClose={() => {
          setRecording(null)
          clear()
        }}
      />
    )
  }
  if (!serviceUserId || !due.data?.length) return null
  const name = due.data[0]?.people[0]?.name ?? 'this person'
  return (
    <Dialog open onOpenChange={o => (!o ? clear() : undefined)}>
      <DialogContent className="max-w-lg" data-testid="survey-due-prompt">
        <DialogHeader>
          <DialogTitle>
            {due.data.length === 1 ? 'A survey is due' : `${due.data.length} surveys are due`} for {name}
          </DialogTitle>
          <DialogDescription>
            You have just finished {occasion}. If you are still with them, you can ask {due.data.length === 1 ? 'it' : 'them'} now and
            record the answers.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <ul className="space-y-2">
            {due.data.map(item => (
              <li key={item.survey.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                <span className="text-sm font-medium text-foreground">{item.survey.title}</span>
                <Button type="button" size="sm" className="gap-1.5" onClick={() => setRecording({ item })} data-testid="survey-due-record">
                  <ClipboardPen className="h-3.5 w-3.5" aria-hidden /> Record now
                </Button>
              </li>
            ))}
          </ul>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={clear}>
            Not now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
