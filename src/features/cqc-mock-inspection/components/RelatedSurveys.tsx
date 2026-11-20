import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { ClipboardList } from 'lucide-react'
import { useAuthStore } from '@/features/auth/store'
import { Badge } from '@/shared/ui/badge'
import type { StatementSurvey } from '../types'
import { useStatementSurveys } from '../hooks'
import { AdoptOneButton, UndoAdoptButton, useCanAdopt } from './AdoptButtons'

/** Ready-made surveys by statement, for users who may see surveys (empty otherwise). */
export function useSurveysByStatement() {
  const canSee = useAuthStore(s => s.can('surveys.read') || s.can('surveys.manage'))
  const query = useStatementSurveys(canSee)
  return { canSee, byStatement: query.data ?? {} }
}

/** One survey: a link to the organisation's adopted template (or the ready-made survey to read), and Adopt when not adopted. */
export function SurveyLink({ s }: { s: StatementSurvey }) {
  const canAdopt = useCanAdopt('survey')
  const body = (
    <>
      <ClipboardList className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
      <span className="min-w-0">
        <span className="font-medium text-foreground group-hover:underline">{s.title}</span>
        <span className="mt-0.5 block text-[11px] text-muted-foreground">{s.groupName}</span>
      </span>
    </>
  )
  const linkCls = 'group flex min-w-0 flex-1 items-start gap-1.5'
  return (
    <div
      className="flex flex-col gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs hover:border-primary"
      data-testid="mock-related-survey-card"
    >
      {s.adoptedTemplateId ? (
        <Link
          to="/surveys/$surveyId"
          params={{ surveyId: s.adoptedTemplateId }}
          className={linkCls}
          title={`Open your template to start this survey. Who answers: ${s.respondents}`}
          data-testid="mock-related-survey"
        >
          {body}
        </Link>
      ) : (
        <Link
          to="/surveys/ready-made"
          search={{ open: s.id }}
          className={linkCls}
          title={`Read this ready-made survey. Who answers: ${s.respondents}`}
          data-testid="mock-related-survey"
        >
          {body}
        </Link>
      )}
      <div className="flex items-center justify-between gap-2 pl-5">
        {s.adoptedTemplateId ? (
          <Badge size="sm" variant="success">
            Adopted
          </Badge>
        ) : (
          <Badge size="sm" variant="outline">
            Not adopted
          </Badge>
        )}
        {!s.adoptedTemplateId && canAdopt ? <AdoptOneButton kind="survey" id={s.id} title={s.title} /> : null}
        {s.adoptedTemplateId && canAdopt ? <UndoAdoptButton kind="survey" id={s.adoptedTemplateId} title={s.title} /> : null}
      </div>
    </div>
  )
}

/** Surveys as links, the first `limit` shown and the rest behind "Show all". */
export function SurveyList({
  surveys,
  limit,
  columns = 1,
}: {
  surveys: StatementSurvey[]
  limit: number
  columns?: 1 | 2
}) {
  const [all, setAll] = React.useState(false)
  const shown = all ? surveys : surveys.slice(0, limit)
  const hidden = surveys.length - shown.length
  return (
    <div className="space-y-1.5">
      <div className={columns === 2 ? 'grid gap-1.5 sm:grid-cols-2' : 'space-y-1.5'}>
        {shown.map(s => (
          <SurveyLink key={s.id} s={s} />
        ))}
      </div>
      {surveys.length > limit ? (
        <button
          type="button"
          className="text-xs font-medium text-primary hover:underline"
          onClick={() => setAll(v => !v)}
          data-testid="mock-related-surveys-toggle"
        >
          {all ? 'Show fewer' : `Show all ${surveys.length} (${hidden} more)`}
        </button>
      ) : null}
    </div>
  )
}

/** "Surveys that help" for one statement, most specific first; nothing when there are none. */
export function RelatedSurveys({ surveys }: { surveys: StatementSurvey[] | undefined }) {
  if (!surveys?.length) return null
  return (
    <div data-testid="mock-related-surveys">
      <p className="text-xs font-semibold text-foreground">Surveys that help</p>
      <p className="mb-1.5 text-[11px] text-muted-foreground">
        Ready-made surveys that ask people about this, the most focused first. Their results come into CQC evidence
        when the survey closes.
      </p>
      <SurveyList surveys={surveys} limit={4} columns={2} />
    </div>
  )
}

/**
 * Every survey for a set of statements, once each: those covering more of these statements first,
 * then the more focused ones.
 */
export function surveysForStatements(codes: string[], byStatement: Record<string, StatementSurvey[]>): StatementSurvey[] {
  const hits = new Map<string, { s: StatementSurvey; covers: number }>()
  for (const code of codes) {
    for (const s of byStatement[code] ?? []) {
      const h = hits.get(s.id)
      if (h) h.covers += 1
      else hits.set(s.id, { s, covers: 1 })
    }
  }
  return [...hits.values()]
    .sort((a, b) => b.covers - a.covers || a.s.statementCount - b.s.statementCount || a.s.title.localeCompare(b.s.title))
    .map(h => h.s)
}
