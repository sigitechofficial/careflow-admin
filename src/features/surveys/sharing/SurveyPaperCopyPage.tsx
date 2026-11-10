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
import { SurveyStringsProvider, fillPhrase, surveyStrings, type SurveyStrings } from '@/features/surveys/survey-ui-strings'
import { translateSurveyForm } from '@/features/surveys/survey-translate'
import { usePaperTranslation } from '@/features/surveys/translations/survey-translations.api'

/** "Only answer this if you answered Rarely or Never to question 3." (in the paper's language). */
export function paperOnlyIf(
  q: PublicSurveyQuestion,
  questions: readonly PublicSurveyQuestion[],
  t: SurveyStrings = surveyStrings(),
): string | null {
  if (!q.showIf) return null
  const i = questions.findIndex(x => (x.key && x.key === q.showIf!.questionKey) || x.id === q.showIf!.questionId)
  const earlier = i >= 0 ? questions[i] : null
  const answers = q.showIf.answers.map(a => earlier?.optionLabels?.[a] ?? a)
  const said = answers.length > 1 ? `${answers.slice(0, -1).join(', ')} ${t('paperOr')} ${answers[answers.length - 1]}` : (answers[0] ?? '')
  return i >= 0 ? t('paperOnlyIf', { answers: said, n: i + 1 }) : `Only answer this if you answered ${said} earlier.`
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
  // Large print (about 17 pt) and the paper in another language or easy read (Phase 3).
  const [largePrint, setLargePrint] = React.useState(false)
  const [language, setLanguage] = React.useState<string | null>(null)
  const paper = usePaperTranslation(surveyId, language)
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

  const english = paperQuestions(survey)
  // The same translation as online: texts translated and up to date; anything else stays in English.
  const shown = translateSurveyForm(
    {
      title: survey.title,
      description: survey.description,
      sectionIntros: survey.sectionIntros ?? {},
      questions: english,
      translations: language && paper.texts ? { [language]: paper.texts } : {},
    } as unknown as Parameters<typeof translateSurveyForm>[0],
    language,
  )
  const questions = shown.questions
  const t = surveyStrings(language ? paper.texts : null)
  const lang = paper.languages.find(l => l.code === language) ?? null
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
        <div className="flex flex-wrap items-center gap-2">
          {paper.languages.length ? (
            <label className="flex items-center gap-1.5 text-xs">
              Language
              <select
                value={language ?? 'en'}
                onChange={e => setLanguage(e.target.value === 'en' ? null : e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                data-testid="paper-language"
              >
                <option value="en">English</option>
                {paper.languages.map(l => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant={largePrint ? 'default' : 'outline'}
            aria-pressed={largePrint}
            onClick={() => setLargePrint(v => !v)}
          >
            Large print
          </Button>
        <Button type="button" size="sm" className="gap-1" onClick={() => window.print()}>
          <Printer className="h-4 w-4" aria-hidden /> Print
        </Button>
        </div>
      </header>

      <SurveyStringsProvider value={t}>
      <main
        className="mx-auto my-6 max-w-[210mm] bg-white px-[14mm] py-[12mm] text-black shadow-sm print:my-0 print:max-w-none print:p-0 print:shadow-none"
        // Large print: everything about 1.75 times bigger (questions at about 17 pt), RNIB clear print guidance.
        style={largePrint ? { zoom: 1.75 } : undefined}
        lang={lang ? lang.code.replace('en-x-easyread', 'en') : 'en'}
        dir={lang?.dir ?? 'ltr'}
        data-testid="paper-copy"
      >
        <header className="border-b-2 border-black pb-3">
          {organisation ? <p className="text-[12px] uppercase tracking-wide">{organisation}</p> : null}
          <h1 className="text-[22px] font-bold leading-tight">{shown.title}</h1>
          {shown.description ? <p className="mt-1 whitespace-pre-wrap text-[13px]">{shown.description}</p> : null}
        </header>

        <div className="mt-3 space-y-1 text-[12px]">
          <p>{t('paperHowTo')}</p>
          {survey.isAnonymous ? <p className="font-semibold">{t('paperNoNameAnonymous')}</p> : null}
        </div>

        {!survey.isAnonymous && survey.targetKind !== 'PUBLIC' ? (
          <div className="mt-3 break-inside-avoid text-[13px]">
            <p className="font-semibold">{forPeople ? t('paperPersonName') : t('paperYourName')}</p>
            <div className="mt-4 border-b border-black/70" />
            {forPeople ? (
              <>
                <p className="mt-3 font-semibold">{t('paperWhoFilling')}</p>
                <ul className="mt-1.5 space-y-1.5">
                  {(['SELF', 'FAMILY_MEMBER', 'REPRESENTATIVE'] as const).map(r => (
                    <li key={r} className="flex items-start">
                      <span aria-hidden className="mr-2 inline-block h-4 w-4 translate-y-0.5 border-[1.5px] border-black" />
                      {language
                        ? t(r === 'SELF' ? 'relationSelf' : r === 'FAMILY_MEMBER' ? 'relationFamily' : 'relationRepresentative')
                        : SURVEY_RESPONDENT_RELATION_LABELS[r]}
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
                  {shown.sectionIntros?.[heading] ? <p className="text-[12px]">{shown.sectionIntros[heading]}</p> : null}
                </div>
              ) : null}
              <SurveyPaperQuestion q={q} number={index + 1} onlyIf={paperOnlyIf(q, questions, t)} anonymous={survey.isAnonymous} />
            </React.Fragment>
          ))}
        </div>

        <footer className="mt-6 break-inside-avoid border-t-2 border-black pt-3 text-[13px]">
          <p className="font-semibold">{t('paperThankYou')}</p>
          <p>{fillPhrase(t('paperGiveBack'), { organisation: organisation ?? 'the office' })}</p>
        </footer>
      </main>
      </SurveyStringsProvider>
    </div>
  )
}
