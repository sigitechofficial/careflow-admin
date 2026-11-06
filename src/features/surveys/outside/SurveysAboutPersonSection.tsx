import { Link } from '@tanstack/react-router'
import { ClipboardList } from 'lucide-react'
import { useAuthStore } from '@/features/auth/store'
import { formatSurveyDate } from '@/features/surveys/survey-datetime'
import { useSurveysAboutPerson } from './survey-outside'

const STATUS: Record<string, string> = { DRAFT: 'Draft', ACTIVE: 'Open', CLOSED: 'Closed' }

/**
 * On a person's record: surveys about them (family or GP views on their care, A1 #3). Titles and states only;
 * each survey's answers keep their own access rules.
 */
export function SurveysAboutPersonSection({ serviceUserId }: { serviceUserId: string }) {
  const canRead = useAuthStore(s => s.can('surveys.read') || s.can('surveys.manage'))
  const { data } = useSurveysAboutPerson(serviceUserId)
  if (!canRead || !data?.length) return null
  return (
    <section className="rounded-xl border border-border bg-card p-4" aria-labelledby="surveys-about-person" data-testid="surveys-about-person">
      <h3 id="surveys-about-person" className="flex items-center gap-2 text-sm font-semibold">
        <ClipboardList className="h-4 w-4 text-muted-foreground" aria-hidden />
        Surveys about this person
      </h3>
      <ul className="mt-2 divide-y divide-border">
        {data.map(s => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
            <Link to="/surveys/$surveyId" params={{ surveyId: s.id }} className="font-medium text-primary underline-offset-2 hover:underline">
              {s.title}
            </Link>
            <span className="text-xs text-muted-foreground">
              {STATUS[s.status] ?? s.status}
              {s.sentTo ? ` · sent to ${s.sentTo}` : ''}
              {s.closesAt ? ` · until ${formatSurveyDate(s.closesAt)}` : ''}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
