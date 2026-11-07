import { Link, useParams, useSearch } from '@tanstack/react-router'
import { useDocumentTitle } from '@/shared/lib/use-document-title'
import { ArrowLeft, Loader2, Printer } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { useCompanyStore } from '@/store/company.store'
import { CompanyBrandingBootstrap } from '@/components/company/CompanyBrandingBootstrap'
import { useSurvey } from '@/features/surveys/hooks/useSurveys'
import { buildSurveyShareUrl } from '@/features/surveys/api/surveys.api'
import { useShareLinks } from '@/features/surveys/sharing/survey-sharing.api'
import { SurveyQrCode } from '@/features/surveys/sharing/SurveyQrCode'
import { PrintPageStyles } from '@/features/surveys/sharing/PrintPageStyles'

/** What the poster says about privacy (never more than CareFlow does). */
export function posterPrivacyLine(survey: { isAnonymous: boolean; targetKind: string }): string | null {
  if (survey.isAnonymous) return 'Your answers are anonymous. Please do not write any names.'
  if (survey.targetKind !== 'PUBLIC') return 'Answers through this code are not linked to your name.'
  return null
}

/**
 * A printable A4 poster for a survey's shared link (or one branch's link): title, QR code, the web
 * address and a line on privacy. `?link=main` or a branch link's id.
 */
export default function SurveyPosterPage() {
  const { surveyId = '' } = useParams({ strict: false }) as { surveyId?: string }
  const { link = 'main' } = useSearch({ strict: false }) as { link?: string }
  const { data: survey, isLoading } = useSurvey(surveyId || undefined)
  const { data: links, isLoading: linksLoading } = useShareLinks(surveyId, Boolean(surveyId))
  const organisation = useCompanyStore(s => s.branding?.displayName ?? null)
  useDocumentTitle(survey ? `Poster – ${survey.title}` : 'Poster')

  if (isLoading || linksLoading) {
    return (
      <div role="status" className="flex h-full items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Loading…
      </div>
    )
  }
  const branch = link !== 'main' ? links?.branches.find(b => b.id === link) : null
  const token = link === 'main' ? links?.main?.token : branch?.token
  if (!survey || !token) {
    return <p className="p-6 text-sm text-muted-foreground">This survey has no shared link to print.</p>
  }
  const url = buildSurveyShareUrl(token)
  const privacy = posterPrivacyLine(survey)

  return (
    <div className="h-full overflow-y-auto bg-muted/40 print:h-auto print:overflow-visible print:bg-white">
      <PrintPageStyles orientation="portrait" />
      {/* Outside the app shell: load the organisation's name here. */}
      <CompanyBrandingBootstrap />
      <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-border bg-background px-4 py-2 print:hidden">
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link to="/surveys/$surveyId" params={{ surveyId }}>
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back to the survey
          </Link>
        </Button>
        <p className="text-xs text-muted-foreground">Poster: A4 portrait.</p>
        <Button type="button" size="sm" className="gap-1" onClick={() => window.print()}>
          <Printer className="h-4 w-4" aria-hidden /> Print
        </Button>
      </header>
      <main className="mx-auto my-6 flex min-h-[270mm] max-w-[210mm] flex-col items-center bg-white px-[16mm] py-[18mm] text-center text-black shadow-sm print:my-0 print:min-h-0 print:p-0 print:shadow-none">
        {organisation ? <p className="text-[18px] font-semibold uppercase tracking-wide">{organisation}</p> : null}
        {branch?.locationName ? <p className="text-[16px]">{branch.locationName}</p> : null}
        <h1 className="mt-6 text-[36px] font-bold leading-tight">{survey.title}</h1>
        <p className="mt-4 text-[22px]">Tell us what you think. Scan the code with your phone’s camera.</p>
        <SurveyQrCode url={url} label={`QR code that opens the survey ${survey.title}`} className="mt-8 w-[95mm]" />
        <p className="mt-6 text-[14px]">Or type this address into your web browser:</p>
        <p className="mt-1 break-all font-mono text-[15px] font-semibold">{url}</p>
        {privacy ? <p className="mt-8 text-[16px]">{privacy}</p> : null}
        <p className="mt-auto pt-8 text-[14px]">If you would rather fill in a paper copy or answer by phone, please ask a member of staff.</p>
      </main>
    </div>
  )
}
