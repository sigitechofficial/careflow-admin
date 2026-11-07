import { ClipboardList } from 'lucide-react'
import { useAuthStore } from '@/features/auth/store'
import { useSurveysToCollect } from './survey-reminders'
import { SurveysToCollectList } from './SurveysToCollectList'

/**
 * On a person's record: open named surveys they have not answered yet, with Record answers (by phone or in
 * person). Shown only to staff who can record answers, and only when something is due.
 */
export function SurveysDueForPersonSection({ serviceUserId, employeeId }: { serviceUserId?: string; employeeId?: string }) {
  const canRecord = useAuthStore(s => s.can('surveys.responses.record'))
  const filter = serviceUserId ? { serviceUserId } : { employeeId }
  const { data } = useSurveysToCollect(filter, canRecord && Boolean(serviceUserId || employeeId))
  if (!canRecord || !data?.length) return null
  return (
    <section className="rounded-xl border border-border bg-card p-4" aria-labelledby="surveys-due-person" data-testid="surveys-due-person">
      <h3 id="surveys-due-person" className="flex items-center gap-2 text-sm font-semibold">
        <ClipboardList className="h-4 w-4 text-muted-foreground" aria-hidden />
        Surveys due
      </h3>
      <p className="mb-3 mt-1 text-xs text-muted-foreground">
        Not answered yet. Ask on your next call or visit and record their answers here.
      </p>
      <SurveysToCollectList items={data} forPerson />
    </section>
  )
}
