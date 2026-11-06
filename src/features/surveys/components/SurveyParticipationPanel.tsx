import { cn } from '@/shared/lib/utils'
import type { SurveyResults } from '@/features/surveys/types'
import { describeTopTwo } from '@/features/surveys/components/SurveySummaryPanel'

type Tile = { key: string; label: string; value: string | number; note?: string }

/** Answers beyond the people it was sent to: recorded without a named person, and through the shared link. */
function extraNote(extra: number, shared: number): string | undefined {
  if (extra <= 0) return undefined
  const recorded = Math.max(0, extra - shared)
  const parts = [
    recorded ? `${recorded} recorded without a named person` : null,
    shared ? `${Math.min(shared, extra)} through the shared link` : null,
  ].filter(Boolean)
  return `Includes ${parts.join(' and ')}.`
}

function Tiles({ tiles }: { tiles: Tile[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {tiles.map(t => (
        <div key={t.key} className="rounded-lg border border-border bg-card px-4 py-3" data-testid={`participation-${t.key}`}>
          <p className="text-xs font-medium text-muted-foreground">{t.label}</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">{t.value}</p>
          {t.note ? <p className="mt-1 text-xs text-muted-foreground">{t.note}</p> : null}
        </div>
      ))}
    </div>
  )
}

/**
 * Who took part: sent to, answered, response rate, opened but not finished, not opened yet, and
 * whether people answered every question that applied to them. Totals only. Public surveys have
 * no list of people, so they show answers through the link and recorded by staff instead.
 */
export function SurveyParticipationPanel({
  results,
  isPublic,
  className,
}: {
  results: SurveyResults
  isPublic: boolean
  className?: string
}) {
  const p = results.participation
  const answered = p?.answered ?? results.responses ?? results.completed
  const tiles: Tile[] = []
  if (isPublic) {
    tiles.push({ key: 'answered', label: 'Answered', value: answered })
    tiles.push({ key: 'link', label: 'Answered through the link', value: p?.answeredThroughLink ?? 0 })
    tiles.push({ key: 'staff', label: 'Recorded by staff', value: p?.recordedByStaff ?? 0, note: 'By phone, on a visit or from paper.' })
  } else {
    const sentTo = p?.sentTo ?? results.recipients
    const fromSent = p?.answeredFromSent ?? results.completed
    tiles.push({ key: 'sent', label: 'Sent to', value: sentTo })
    tiles.push({
      key: 'answered',
      label: 'Answered (all channels)',
      value: answered,
      note: extraNote(answered - fromSent, p?.answeredThroughSharedLink ?? 0),
    })
    const shared = p?.answeredThroughSharedLink ?? 0
    if (shared) {
      // Named answers and shared-link answers are separate figures: someone on the list could
      // also have answered through the link.
      tiles.push({
        key: 'from-list',
        label: 'Answered by people it was sent to',
        value: fromSent,
        note: 'Their own link, the app, the portal, or recorded by staff.',
      })
      tiles.push({
        key: 'shared-link',
        label: 'Answered through the shared link',
        value: shared,
        note: 'Not linked to anyone. Someone on the list could also have answered here.',
      })
    }
    tiles.push({
      key: 'rate',
      label: 'Response rate',
      value: `${p?.responseRate ?? results.responseRate}%`,
      note: `${fromSent} of the ${sentTo} it was sent to answered${shared ? ' (shared-link answers are not counted)' : ''}.`,
    })
    tiles.push({
      key: 'opened',
      label: 'Opened but not finished',
      value: p?.openedNotFinished ?? 0,
      note: 'Opened the survey but have not sent their answers yet.',
    })
    tiles.push({ key: 'not-opened', label: 'Not opened yet', value: p?.notOpened ?? 0 })
  }
  if (p) {
    tiles.push({
      key: 'every',
      label: 'Answered every question',
      value: p.answeredEveryQuestion,
      note: 'Only the questions that applied to each person count.',
    })
    tiles.push({ key: 'skipped', label: 'Skipped some optional questions', value: p.skippedSomeQuestions })
  }
  const judged = p ? p.answeredEveryQuestion + p.skippedSomeQuestions : 0
  return (
    <section className={cn(className)} data-testid="survey-participation">
      <h2 className="mb-3 text-sm font-semibold text-foreground">Participation</h2>
      <Tiles tiles={tiles} />
      {results.sharedLinkCaution?.note ? (
        <p
          role="note"
          className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100"
          data-testid="shared-link-caution"
        >
          {results.sharedLinkCaution.note}
        </p>
      ) : null}
      {p && judged < answered ? (
        <p className="mt-2 text-xs text-muted-foreground" data-testid="participation-judged-note">
          “Answered every question” and “Skipped some” cover the {judged} response{judged === 1 ? '' : 's'} whose answers are
          in the results; the others are still being added or are held back (see below).
        </p>
      ) : null}
    </section>
  )
}

/** "67% said Very good or Good" for the overall-experience question. */
export function SurveyHeadline({ results, className }: { results: SurveyResults; className?: string }) {
  const h = results.headline
  const text = h ? describeTopTwo(h) : null
  if (!h || !text) return null
  return (
    <section className={cn('rounded-lg border border-primary/30 bg-primary/5 px-4 py-3', className)} data-testid="survey-headline">
      <p className="text-xs font-medium text-muted-foreground">{h.questionText}</p>
      <p className="mt-0.5 text-2xl font-semibold tabular-nums text-foreground">{text}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {h.positive} of the {h.base} {h.base === 1 ? 'person' : 'people'} who chose an answer on the scale (answers such as
        “Don’t know” are not counted).
      </p>
    </section>
  )
}
