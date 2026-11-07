import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useDocumentTitle } from '@/shared/lib/use-document-title'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { ApiError } from '@/shared/api/api-client'
import { useSurveysToCollect, type SurveyToCollect } from './survey-reminders'
import { SurveysToCollectList, countToCollect } from './SurveysToCollectList'

type Who = 'ALL' | 'SERVICE_USER' | 'EMPLOYEE'

/** Narrows the list to people whose name contains `text`, and to one kind of survey. */
export function filterToCollect(items: SurveyToCollect[], who: Who, text: string): SurveyToCollect[] {
  const q = text.trim().toLowerCase()
  return items
    .filter(i => who === 'ALL' || i.survey.targetKind === who)
    .map(i => ({ ...i, people: q ? i.people.filter(p => p.name.toLowerCase().includes(q)) : i.people }))
    .filter(i => i.people.length > 0)
}

/**
 * /surveys/to-collect: one place for coordinators and managers to work from. Every open named survey with the
 * people who have not answered, their numbers, and Record answers (by phone or in person).
 */
export default function SurveysToCollectPage() {
  useDocumentTitle('Surveys to collect – CareAdmin')
  const list = useSurveysToCollect()
  const [who, setWho] = React.useState<Who>('ALL')
  const [text, setText] = React.useState('')
  const items = React.useMemo(() => filterToCollect(list.data ?? [], who, text), [list.data, who, text])

  return (
    <div className="w-full flex-1 px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-start gap-2">
          <Button type="button" variant="ghost" size="icon" className="mt-0.5 shrink-0" asChild>
            <Link to="/surveys">
              <ArrowLeft className="h-5 w-5" aria-hidden />
              <span className="sr-only">Back to surveys</span>
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Surveys to collect</h1>
            <p className="text-sm text-muted-foreground">
              People who have not answered an open survey yet. Phone or visit them and record their answers here.
            </p>
          </div>
        </div>
        {list.data ? (
          <p className="text-sm text-muted-foreground" data-testid="to-collect-summary">
            <strong className="text-foreground">{countToCollect(list.data)}</strong> to collect across {list.data.length}{' '}
            {list.data.length === 1 ? 'survey' : 'surveys'}
          </p>
        ) : null}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Search by name…"
          aria-label="Search by name"
          className="w-64"
        />
        <div className="flex gap-1" role="group" aria-label="Whose surveys">
          {(
            [
              ['ALL', 'Everyone'],
              ['SERVICE_USER', 'People we support'],
              ['EMPLOYEE', 'Staff'],
            ] as const
          ).map(([value, label]) => (
            <Button key={value} type="button" size="sm" variant={who === value ? 'default' : 'outline'} aria-pressed={who === value} onClick={() => setWho(value)}>
              {label}
            </Button>
          ))}
        </div>
      </div>

      {list.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading…
        </p>
      ) : list.isError ? (
        <p className="text-sm text-muted-foreground">
          {list.error instanceof ApiError ? list.error.message : 'The list could not be loaded.'}
        </p>
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground" data-testid="to-collect-empty">
          {list.data?.length ? 'Nobody matches.' : 'Nothing to collect: everyone has answered the open surveys.'}
        </p>
      ) : (
        <SurveysToCollectList items={items} />
      )}
    </div>
  )
}
