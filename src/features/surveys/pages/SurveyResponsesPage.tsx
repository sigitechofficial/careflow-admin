import * as React from 'react'
import { useDocumentTitle } from '@/shared/lib/use-document-title'
import { Link, useParams } from '@tanstack/react-router'
import { ArrowLeft, BarChart3, Download, Loader2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { downloadCsv } from '@/shared/lib/csv'
import { toastApiError } from '@/shared/lib/toast'
import { recordResultsExport } from '@/features/surveys/sharing/survey-sharing.api'
import { useSurvey, useSurveyResults } from '@/features/surveys/hooks/useSurveys'
import { useAuthStore } from '@/features/auth/store'
import { SurveyResponsesPanel } from '@/features/surveys/components/SurveyResponsesPanel'
import { SurveySummaryPanel } from '@/features/surveys/components/SurveySummaryPanel'
import { describeAnsweredWithoutName } from '@/features/surveys/survey-respondent'
import { SurveyRecipientsPanel } from '@/features/surveys/components/SurveyRecipientsPanel'
import { SurveyBreakdownPanel } from '@/features/surveys/components/SurveyBreakdownPanel'
import { SurveyHeadline, SurveyParticipationPanel } from '@/features/surveys/components/SurveyParticipationPanel'
import { formatSurveyDate } from '@/features/surveys/survey-datetime'
import { buildSurveyResultsCsv, surveyResultsFileName } from '@/features/surveys/survey-results-export'
import { SURVEY_STATUS_LABELS, type SurveyPeriod } from '@/features/surveys/types'
import {
  SurveyHeatmapPanel,
  SurveyQualityPanel,
  SurveyScoresPanel,
  SurveyThemesPanel,
  SurveyTrendsPanel,
} from '@/features/surveys/insight/SurveyInsightPanels'

const ALL_PERIODS = 'all'
type ResultsTab = 'summary' | 'trends' | 'branches' | 'individual'

/** "Nov 2026 · from 1 Nov 2026" for the period picker. */
const periodOption = (surveyTitle: string, p: SurveyPeriod) =>
  `${p.title.replace(`${surveyTitle} — `, '')}${p.opensAt ? ` · from ${formatSurveyDate(p.opensAt)}` : ''}`

/**
 * Results (kept at /surveys/$surveyId/responses). Two tabs: Summary — participation, how people
 * answered, the headline, each question and the breakdowns, with a CSV download — and Individual
 * responses (who it was sent to, and each response, with Record response). For a repeating survey
 * the period picker applies to both tabs.
 */
export default function SurveyResponsesPage() {
  const { surveyId = '' } = useParams({ strict: false }) as { surveyId?: string }
  const { data: survey, isLoading, isError } = useSurvey(surveyId)
  useDocumentTitle(survey ? `Results: ${survey.title} – CareAdmin` : null)
  // Repeating surveys: "All periods" uses the repeating survey; a period uses its own survey id,
  // so the figures, recipients and responses always describe the same thing.
  const { data: seriesResults } = useSurveyResults(surveyId, Boolean(survey))
  const periods = seriesResults?.periods ?? []
  const [periodId, setPeriodId] = React.useState<string>(ALL_PERIODS)
  const [tab, setTab] = React.useState<ResultsTab>('summary')
  const viewId = periodId === ALL_PERIODS ? surveyId : periodId
  const { data: periodResults } = useSurveyResults(viewId, Boolean(survey) && viewId !== surveyId)
  // Several groups: results for one "Who are you?" answer.
  const [group, setGroup] = React.useState('')
  const { data: groupResults } = useSurveyResults(viewId, Boolean(survey) && Boolean(group), group || undefined)
  const results = group ? groupResults : viewId === surveyId ? seriesResults : periodResults
  const groupChoices = (viewId === surveyId ? seriesResults : periodResults)?.respondentGroups ?? []

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading results…
      </div>
    )
  }

  if (isError || !survey) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-6 text-center">
        <p className="text-sm text-muted-foreground">Survey not found.</p>
        <Button variant="outline" asChild>
          <Link to="/surveys">Back to surveys</Link>
        </Button>
      </div>
    )
  }

  // Per-survey access: results limited to particular people.
  if (survey.viewerAccess && !survey.viewerAccess.results) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-6 text-center" data-testid="results-restricted">
        <h1 className="text-lg font-semibold text-foreground">{survey.title}</h1>
        <p className="text-sm text-muted-foreground">
          The results of this survey are limited to particular people. Ask the person who made it, or an admin,
          if you need them.
        </p>
        <Button variant="outline" asChild>
          <Link to="/surveys">Back to surveys</Link>
        </Button>
      </div>
    )
  }
  const canSeeResponses = survey.viewerAccess?.responses ?? true
  const canManage = useAuthStore.getState().can('surveys.manage')
  const belowThreshold = Boolean(results?.reporting?.belowThreshold)

  const forPublic = survey.targetKind === 'PUBLIC'
  const totalResponses = results?.responses ?? survey.responseCount
  /** Named surveys: the share of responses given without a name. */
  const withoutNameShare = describeAnsweredWithoutName(results)
  const selectedPeriod = periods.find(p => p.id === periodId)
  const periodText = selectedPeriod
    ? periodOption(survey.title, selectedPeriod)
    : periods.length > 0
      ? `All ${periods.length} periods`
      : 'Whole survey'
  const howPeopleAnswered = results?.howPeopleAnswered ?? []

  const downloadSummary = async () => {
    if (!results) return
    // Recorded first (survey_results_exported): no record, no download.
    try {
      await recordResultsExport(viewId, { kind: 'RESULTS_CSV', period: periodText, ...(group ? { respondentGroup: group } : {}) })
    } catch (e) {
      toastApiError(e, 'Could not download the results')
      return
    }
    const now = new Date()
    downloadCsv(
      surveyResultsFileName(survey.title, now.toISOString().slice(0, 10)),
      buildSurveyResultsCsv(results, { title: survey.title, period: periodText, generatedAt: now.toLocaleString('en-GB') }),
    )
  }

  return (
    <div className="w-full flex-1 px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-start gap-2">
          <Button type="button" variant="ghost" size="icon" className="mt-0.5 shrink-0" asChild>
            <Link to="/surveys/$surveyId" params={{ surveyId }}>
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back to survey</span>
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <BarChart3 className="h-3.5 w-3.5" aria-hidden />
              Results
            </div>
            <h1 className="mt-0.5 text-xl font-semibold text-foreground">{survey.title}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {SURVEY_STATUS_LABELS[survey.status]}
              {survey.audienceGroupLabel ? ` · For: ${survey.audienceGroupLabel}` : ''}
              {survey.isAnonymous ? ' · Anonymous' : ''}
              {survey.createdByName ? ` · Created by ${survey.createdByName}` : ''}
              {` · ${totalResponses} response${totalResponses === 1 ? '' : 's'}`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {groupChoices.length > 0 ? (
            <>
              <label className="sr-only" htmlFor="results-group">
                Show results for
              </label>
              <select
                id="results-group"
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={group}
                onChange={e => setGroup(e.target.value)}
                data-testid="results-group"
              >
                <option value="">Everyone</option>
                {groupChoices.map(g => (
                  <option key={g.label} value={g.label}>
                    {g.label}
                    {g.responses === null ? ' (too few to show)' : ` (${g.responses})`}
                  </option>
                ))}
              </select>
            </>
          ) : null}
          {periods.length > 0 ? (
            <Select value={periodId} onValueChange={setPeriodId}>
              <SelectTrigger className="h-9 w-56" aria-label="Period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_PERIODS}>All periods ({periods.length})</SelectItem>
                {periods.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {periodOption(survey.title, p)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <Button type="button" size="sm" variant="outline" asChild>
            <Link to="/surveys/$surveyId/actions" params={{ surveyId }} data-testid="acting-on-results-link">
              Acting on results
            </Link>
          </Button>
          <Button type="button" size="sm" variant="outline" asChild>
            <Link to="/surveys/$surveyId" params={{ surveyId: viewId }}>
              {viewId === surveyId ? 'View survey' : 'View this period'}
            </Link>
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={v => setTab(v as ResultsTab)}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            {periods.length > 0 && viewId === surveyId ? <TabsTrigger value="trends">Trends</TabsTrigger> : null}
            {!forPublic ? <TabsTrigger value="branches">By branch</TabsTrigger> : null}
            <TabsTrigger value="individual">Individual responses</TabsTrigger>
          </TabsList>
          {tab === 'summary' && results && !belowThreshold ? (
            <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => void downloadSummary()}>
              <Download className="h-3.5 w-3.5" aria-hidden />
              Download summary (CSV)
            </Button>
          ) : null}
        </div>

        <TabsContent value="summary" className="space-y-5">
          {!results ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading the summary…
            </div>
          ) : (
            <>
              {viewId === surveyId && periods.length > 0 ? (
                <p className="text-xs text-muted-foreground">All {periods.length} periods together. Choose a period to see one on its own.</p>
              ) : null}
              <SurveyParticipationPanel results={results} isPublic={forPublic} />

              {results.periodsLeftOutNote ? (
                <p className="text-xs text-muted-foreground" data-testid="survey-periods-left-out">
                  {results.periodsLeftOutNote}
                </p>
              ) : null}
              {belowThreshold && results.reporting?.note ? (
                <p
                  className="rounded-md border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-950 dark:text-sky-100"
                  role="status"
                  data-testid="survey-reporting-threshold"
                >
                  {results.reporting.note}
                </p>
              ) : null}
              {results.writtenAnswersRestrictedNote ? (
                <p className="text-xs text-muted-foreground" data-testid="survey-written-restricted">
                  {results.writtenAnswersRestrictedNote}
                </p>
              ) : null}

              {withoutNameShare || results.responsesBeingAddedNote ? (
                <div className="space-y-1">
                  {withoutNameShare ? (
                    <p className="text-xs text-muted-foreground" data-testid="survey-without-name-share">
                      {withoutNameShare}
                      {results.withoutNameAnswersNote ? ` ${results.withoutNameAnswersNote}` : ''}
                    </p>
                  ) : null}
                  {results.responsesBeingAddedNote ? (
                    <p className="text-xs text-muted-foreground" data-testid="survey-responses-being-added">
                      {results.responsesBeingAddedNote}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {howPeopleAnswered.length > 0 && (results.responses ?? 0) > 0 ? (
                <SurveyBreakdownPanel
                  title="How people answered"
                  description={
                    results.isAnonymous
                      ? 'This survey is anonymous: groups of fewer than 5 are combined or not shown, so nobody can be identified.'
                      : undefined
                  }
                  breakdowns={howPeopleAnswered}
                />
              ) : null}

              <SurveyHeadline results={results} />

              {results.questionSummaries && results.questionSummaries.length > 0 ? (
                <SurveySummaryPanel
                  summaries={results.questionSummaries}
                  writtenAnswersNote={results.writtenAnswersNote}
                  responsesInFigures={results.participation?.responsesInFigures}
                />
              ) : null}

              <SurveyBreakdownPanel title="By branch and job title" breakdowns={results.breakdowns} />

              {!group ? (
                <>
                  <SurveyScoresPanel surveyId={viewId} />
                  <SurveyThemesPanel surveyId={viewId} />
                  <SurveyQualityPanel surveyId={viewId} />
                </>
              ) : null}
            </>
          )}
        </TabsContent>

        <TabsContent value="trends" className="space-y-5">
          {tab === 'trends' ? <SurveyTrendsPanel surveyId={surveyId} /> : null}
        </TabsContent>

        <TabsContent value="branches" className="space-y-5">
          {tab === 'branches' ? <SurveyHeatmapPanel surveyId={viewId} /> : null}
        </TabsContent>

        <TabsContent value="individual">
          {!canSeeResponses ? (
            <p className="rounded-xl border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground" data-testid="responses-restricted">
              Individual responses to this survey are limited to particular people. You can see the overall figures
              on the Summary tab.
            </p>
          ) : (
            <>
              {forPublic && survey.isAnonymous ? null : (
                <SurveyRecipientsPanel
                  className="mb-5"
                  surveyId={viewId}
                  targetKind={survey.targetKind}
                  personalLinks={
                    canManage && !survey.isAnonymous && (selectedPeriod?.status ?? survey.status) === 'ACTIVE'
                      ? { surveyId: viewId, title: selectedPeriod ? periodOption(survey.title, selectedPeriod) : survey.title, targetKind: survey.targetKind, closesAt: selectedPeriod ? (selectedPeriod.closesAt ?? null) : survey.closesAt }
                      : null
                  }
                />
              )}
              <SurveyResponsesPanel surveyId={viewId} />
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
