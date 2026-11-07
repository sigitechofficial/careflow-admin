import { toCsv } from '@/shared/lib/csv'
import type { SurveyBreakdown, SurveyResults } from '@/features/surveys/types'

/**
 * "Download summary (CSV)" for the CQC evidence folder: the participation figures, how people
 * answered, and each question's answers as counts and percentages. Aggregate only — never names,
 * written answers (Other text, comments, text answers) or anything held back: everything here is
 * already a total on the results page, and groups the results withhold are left out.
 */
export function buildSurveyResultsCsv(
  results: SurveyResults,
  ctx: { title: string; period: string; generatedAt: string },
): string {
  const p = results.participation
  const rows: Array<Array<string | number | null>> = [
    ['Survey results summary'],
    ['Survey', ctx.title],
    ['Period', ctx.period],
    ['Downloaded', ctx.generatedAt],
    ['Anonymous', results.isAnonymous ? 'Yes' : 'No'],
    ...(results.audienceGroupLabel ? [["Who it's for", results.audienceGroupLabel]] : []),
    ...(results.respondentGroup ? [['Answers from', results.respondentGroup]] : []),
    [],
    ['Section', 'Question', 'Answer', 'Count', 'Percent'],
  ]
  const figure = (label: string, value: number | null | undefined, percent?: number | null) => {
    if (value === null || value === undefined) return
    rows.push(['Participation', '', label, value, percent ?? null])
  }
  if (results.sharedLinkCaution?.note) rows.splice(rows.length - 2, 0, ['Caution', results.sharedLinkCaution.note])
  if (p) {
    figure('Sent to', p.sentTo)
    figure('Answered (all channels)', p.answered)
    figure('Answered, of those it was sent to', p.answeredFromSent, p.responseRate)
    figure('Opened but not finished', p.openedNotFinished)
    figure('Not opened yet', p.notOpened)
    figure('Answered through the link', p.answeredThroughLink)
    figure('Answered through the shared link (not linked to anyone)', p.answeredThroughSharedLink || null)
    figure('Recorded by staff', p.recordedByStaff)
    figure('Answered every question', p.answeredEveryQuestion)
    figure('Skipped some optional questions', p.skippedSomeQuestions)
  } else {
    figure('Answered (all channels)', results.responses ?? results.completed)
  }

  const breakdownRows = (b: SurveyBreakdown, section: string) => {
    if (b.suppressed) {
      rows.push([section, '', b.note ?? 'Not shown, to protect anonymity', null, null])
      return
    }
    const total = b.groups.reduce((sum, g) => sum + g.responses, 0)
    for (const g of b.groups) {
      rows.push([section, '', g.label, g.responses, total > 0 ? Math.round((g.responses / total) * 100) : 0])
    }
  }
  const sectionOf: Record<SurveyBreakdown['dimension'], string> = {
    channel: 'How they answered',
    respondent: 'Who answered',
    branch: 'By branch',
    jobTitle: 'By job title',
  }
  for (const b of [...(results.howPeopleAnswered ?? []), ...(results.breakdowns ?? [])]) {
    breakdownRows(b, sectionOf[b.dimension])
  }

  if (results.headline && results.headline.percent !== null) {
    rows.push([
      'Headline',
      results.headline.questionText,
      results.headline.labels.join(' or '),
      results.headline.positive,
      results.headline.percent,
    ])
  }

  for (const q of results.questionSummaries ?? []) {
    const label = q.status === 'reworded' ? `${q.questionText} (earlier wording)` : q.status === 'removed' ? `${q.questionText} (removed)` : q.questionText
    rows.push(['Question', label, 'Answered', q.answerCount, null])
    for (const o of q.options ?? []) {
      rows.push(['Question', label, o.notCounted ? `${o.label} (not counted in percentages)` : o.label, o.count, o.notCounted ? null : o.percent])
    }
    if (q.topTwo && q.topTwo.percent !== null) {
      rows.push(['Question', label, `Top two: ${q.topTwo.labels.join(' or ')}`, q.topTwo.positive, q.topTwo.percent])
    }
    if (q.numeric) {
      rows.push(['Question', label, 'Average', q.numeric.average, null])
      rows.push(['Question', label, 'Lowest', q.numeric.min, null])
      rows.push(['Question', label, 'Highest', q.numeric.max, null])
    }
  }
  return toCsv(rows)
}

/** "staff-survey-results-2026-11-06.csv". */
export function surveyResultsFileName(title: string, day: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return `${slug || 'survey'}-results-${day}.csv`
}
