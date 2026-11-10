import { create } from 'zustand'
import { useNavigate } from '@tanstack/react-router'
import { ShieldCheck } from 'lucide-react'
import { useAuthStore } from '@/features/auth/store'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { useSurveyDuePromptStore } from '@/features/surveys/reminders/SurveyDuePrompt'
import { useServiceUserPrivacy } from './service-user-privacy.api'

type State = {
  serviceUserId: string | null
  ask: (serviceUserId: string) => void
  clear: () => void
}

export const usePrivacyReviewPromptStore = create<State>(set => ({
  serviceUserId: null,
  ask: serviceUserId => set({ serviceUserId }),
  clear: () => set({ serviceUserId: null }),
}))

/**
 * After a care plan review is published: ask whether how the person needs information, or who we may share it
 * with, has changed (Accessible Information Standard; consent can change at any time). Only for users who can
 * change the record.
 */
export function askAboutPrivacyAtReview(serviceUserId: string) {
  if (!useAuthStore.getState().can('service_users.update')) return
  usePrivacyReviewPromptStore.getState().ask(serviceUserId)
}

/** Rendered once in the app shell. Waits until any survey prompt from the same review has closed. */
export function PrivacyReviewPromptHost() {
  const { serviceUserId, clear } = usePrivacyReviewPromptStore()
  const surveyPromptOpen = useSurveyDuePromptStore(s => Boolean(s.serviceUserId))
  const navigate = useNavigate()
  const { data } = useServiceUserPrivacy(serviceUserId ?? '')
  if (!serviceUserId || surveyPromptOpen || !data) return null

  const active = data.sharing.filter(s => s.status === 'ACTIVE' || s.status === 'REVIEW_DUE')
  const reviewDue = data.sharing.filter(s => s.status === 'REVIEW_DUE').length
  const open = () => {
    clear()
    void navigate({ to: '/service-users/$serviceUserId/profile', params: { serviceUserId }, search: { tab: 'privacy' } })
  }

  return (
    <Dialog open onOpenChange={o => !o && clear()}>
      <DialogContent className="max-w-md" data-testid="privacy-review-prompt">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" aria-hidden />
            Has anything changed?
          </DialogTitle>
          <DialogDescription>At this review, check how they need information and who we may share it with.</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Communication needs: </span>
            {data.needs ? data.needs.summary || 'Standard print, no interpreter' : 'Not recorded yet'}
          </p>
          <p>
            <span className="text-muted-foreground">Sharing: </span>
            {active.length ? `${active.length} ${active.length === 1 ? 'person or organisation' : 'people or organisations'}` : 'None recorded'}
            {reviewDue ? `, ${reviewDue} due a review` : ''}
          </p>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={clear}>No change</Button>
          <Button type="button" onClick={open}>Open Privacy</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
