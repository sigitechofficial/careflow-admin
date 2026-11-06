import * as React from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { useDocumentTitle } from '@/shared/lib/use-document-title'
import { ArrowLeft, Loader2, Printer } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { useCompanyStore } from '@/store/company.store'
import { CompanyBrandingBootstrap } from '@/components/company/CompanyBrandingBootstrap'
import { useSurvey } from '@/features/surveys/hooks/useSurveys'
import { withSectionHeadings } from '@/features/surveys/survey-sections'
import { questionsAsked } from '@/features/surveys/survey-logic'
import type { PublicSurveyQuestion, SurveyDetail } from '@/features/surveys/types'
import { SURVEY_RESPONDENT_RELATION_LABELS } from '@/features/surveys/types'
import { SurveyPaperQuestion } from '@/features/surveys/sharing/SurveyPaperQuestion'
import { notePaperCopyPrinted } from '@/features/surveys/sharing/survey-sharing.api'
import { PrintPageStyles } from '@/features/surveys/sharing/PrintPageStyles'

/** "Only answer this if you answered Rarely or Never to question 3." */
export function paperOnlyIf(q: PublicSurveyQuestion, questions: readonly PublicSurveyQuestion[]): string | null {
  if (!q.showIf) return null
  const i = questions.findIndex(x => (x.key && x.key === q.showIf!.questionKey) || x.id === q.showIf!.questionId)
  const answers = q.showIf.answers
  const said = answers.length > 1 ? `${answers.slice(0, -1).join(', ')} or ${answers[answers.length - 1]}` : (answers[0] ?? '')
  return i >= 0 ? `Only answer this if you answered ${said} to question ${i + 1}.` : `Only answer this if you answered ${said} earlier.`
}

/** The questions on paper: an anonymous survey never asks to be contacted (as online). */
export function paperQuestions(survey: Pick<SurveyDetail, 'questions' | 'isAnonymous'>): PublicSurveyQuestion[] {
  const sorted = [...survey.questions].sort((a, b) => a.sortOrder - b.sortOrder) as unknown as PublicSurveyQuestion[]
  return questionsAsked(sorted, survey.isAnonymous)
}

/**
 * A printable paper copy of any survey (A4), for people who prefer paper. Staff type returned copies
 * in with Record response. Printing it is audited (survey_paper_copy_printed): when Print is pressed,
 * or when the browser's own print is used.
 */
export default function SurveyPaperCopyPage() {
  const { surveyId = '' } = useParams({ strict: false }) as { surveyId?: string }
  const { data: survey, isLoading, isError } = useSurvey(surveyId || undefined)
  const organisation = useCompanyStore(s => s.branding?.displayName ?? null)
  const noted = React.useRef(false)
  useDocumentTitle(survey ? `Paper copy – ${survey.title}` : 'Paper copy')

  React.useEffect(() => {
    const note = () => {
      if (noted.current || !surveyId) return
      noted.current = true
      // Never stops the printing; the API keeps the audit row.
      void notePaperCopyPrinted(surveyId).catch(() => undefined)
    }
    window.addEventListener('beforeprint', note)
    return () => window.removeEventListener('beforeprint', note)
  }, [surveyId])

  if (isLoading) {
    return (
      <div role="status" className="flex h-full items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Loading the survey…
      </div>
    )
  }
  if (isError || !survey) {
    return <p className="p-6 text-sm text-muted-foreground">This survey could not be found.</p>
  }

  const questions = paperQuestions(survey)
  const forPeople = survey.targetKind === 'SERVICE_USER'
  return (
    <div className="h-full overflow-y-auto bg-muted/40 print:h-auto print:overflow-visible print:bg-white" data-print-root>
      <PrintPageStyles orientation="portrait" />
      {/* Outside the app shell: load the organisation's name here. */}
      <CompanyBrandingBootstrap />
      <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-border bg-background px-4 py-2 print:hidden">
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link to="/surveys/$surveyId" params={{ surveyId }}>
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back to the survey
          </Link>
        </Button>
        <p className="text-xs text-muted-foreground">Paper copy: A4. Type returned copies in with Record response.</p>
        <Button type="button" size="sm" className="gap-1" onClick={() => window.print()}>
          <Printer className="h-4 w-4" aria-hidden /> Print
        </Button>
      </header>

      <main className="mx-auto my-6 max-w-[210mm] bg-white px-[14mm] py-[12mm] text-black shadow-sm print:my-0 print:max-w-none print:p-0 print:shadow-none">
        <header className="border-b-2 border-black pb-3">
          {organisation ? <p className="text-[12px] uppercase tracking-wide">{organisation}</p> : null}
          <h1 className="text-[22px] font-bold leading-tight">{survey.title}</h1>
          {survey.description ? <p className="mt-1 whitespace-pre-wrap text-[13px]">{survey.description}</p> : null}
        </header>

        <div className="mt-3 space-y-1 text-[12px]">
          <p>Tick a box like this ☑ or write in the space. Questions marked * need an answer.</p>
          {survey.isAnonymous ? (
            <p className="font-semibold">Please do not write your name anywhere on this form. Your answers are anonymous.</p>
          ) : null}
        </div>

        {!survey.isAnonymous && survey.targetKind !== 'PUBLIC' ? (
          <div className="mt-3 break-inside-avoid text-[13px]">
            <p className="font-semibold">{forPeople ? 'Name of the person we support' : 'Your name'}</p>
            <div className="mt-4 border-b border-black/70" />
            {forPeople ? (
              <>
                <p className="mt-3 font-semibold">Who is filling this in? Tick one box.</p>
                <ul className="mt-1.5 space-y-1.5">
                  {(['SELF', 'FAMILY_MEMBER', 'REPRESENTATIVE'] as const).map(r => (
                    <li key={r} className="flex items-start">
                      <span aria-hidden className="mr-2 inline-block h-4 w-4 translate-y-0.5 border-[1.5px] border-black" />
                      {SURVEY_RESPONDENT_RELATION_LABELS[r]}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        ) : null}

        <div className="mt-2 divide-y divide-black/15">
          {withSectionHeadings(questions).map(({ item: q, index, heading }) => (
            <React.Fragment key={q.id}>
              {heading ? (
                <div className="break-after-avoid pt-4">
                  <h2 className="text-[16px] font-bold">{heading}</h2>
                  {survey.sectionIntros?.[heading] ? <p className="text-[12px]">{survey.sectionIntros[heading]}</p> : null}
                </div>
              ) : null}
              <SurveyPaperQuestion q={q} number={index + 1} onlyIf={paperOnlyIf(q, questions)} anonymous={survey.isAnonymous} />
            </React.Fragment>
          ))}
        </div>

        <footer className="mt-6 break-inside-avoid border-t-2 border-black pt-3 text-[13px]">
          <p className="font-semibold">Thank you.</p>
          <p>
            Please give this form back to the person who gave it to you, or send it to {organisation ?? 'the office'}.
          </p>
        </footer>
      </main>
    </div>
  )
}
