import * as React from 'react'
import { ChevronDown, Heart } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { HolisticCollapsibleSection } from '@/features/service-users/initial-assessment/components/holistic/HolisticCollapsibleSection'
import { InitialAssessmentAboutMeTabFields } from '@/features/service-users/initial-assessment/components/InitialAssessmentAboutMeTabFields'
import {
  ABOUT_ME_IA_TABS,
  isAboutMeIaSpecRef,
  type AboutMeIaTabId,
} from '@/features/service-users/initial-assessment/utils/about-me-ia-questions'
import type {
  InitialAssessmentAnswerInput,
  InitialAssessmentQuestion,
  InitialAssessmentSection,
} from '@/features/service-users/initial-assessment/types'
import { compareSpecRefs } from '@/features/service-users/initial-assessment/utils/compare-spec-ref'
import {
  IA_HINT_CLASS,
  IA_SUBSECTION_PANEL_CLASS,
  IA_SUBSECTION_PANEL_HEADER_CLASS,
  IA_SUBSECTION_PANEL_TITLE_CLASS,
} from '@/features/service-users/initial-assessment/utils/form-typography'

type Props = {
  sections: InitialAssessmentSection[]
  draftAnswers: Record<string, InitialAssessmentAnswerInput>
  prefillMap: Map<string, string>
  questionErrors?: Map<string, string>
  disabled: boolean
  serviceUserId: string
  submissionId: string | null
  onChange: (questionId: string, patch: InitialAssessmentAnswerInput) => void
}

function aboutMeQuestionsFromSections(sections: InitialAssessmentSection[]): InitialAssessmentQuestion[] {
  const section = sections.find((s) => s.sectionNumber === 1)
  if (!section) return []
  return section.questions
    .filter((q) => {
      const ref = q.metadata?.specRef
      return typeof ref === 'string' && isAboutMeIaSpecRef(ref)
    })
    .slice()
    .sort((a, b) => {
      const refA = String(a.metadata?.specRef ?? '')
      const refB = String(b.metadata?.specRef ?? '')
      const byRef = compareSpecRefs(refA, refB)
      if (byRef !== 0) return byRef
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
    })
}

function AboutMeSubsection({
  id,
  label,
  children,
  defaultOpen = true,
}: {
  id: AboutMeIaTabId
  label: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = React.useState(defaultOpen)
  const panelId = React.useId()

  return (
    <div className={IA_SUBSECTION_PANEL_CLASS} data-testid={`ia-about-me-${id}`}>
      <button
        type="button"
        className={cn(
          IA_SUBSECTION_PANEL_HEADER_CLASS,
          'flex w-full items-center gap-3 text-left cursor-pointer select-none',
          'hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/30',
        )}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <h4 className={cn(IA_SUBSECTION_PANEL_TITLE_CLASS, 'min-w-0 flex-1')}>{label}</h4>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
            open ? 'rotate-0' : '-rotate-90',
          )}
          aria-hidden
        />
      </button>
      <div id={panelId} role="region" hidden={!open} className={cn('space-y-4 p-4', !open && 'hidden')}>
        {children}
      </div>
    </div>
  )
}

/** About Me — one parent section; former horizontal tabs are vertical subsections inside. */
export function InitialAssessmentAboutMeSection({
  sections,
  draftAnswers,
  prefillMap,
  questionErrors,
  disabled,
  serviceUserId,
  submissionId,
  onChange,
}: Props) {
  const questions = aboutMeQuestionsFromSections(sections)

  if (questions.length === 0) {
    return (
      <HolisticCollapsibleSection
        title="About Me"
        subtitle="About Me questions are not loaded — run the API seed to add §1.3a–1.3g template questions."
        testId="ia-about-me-section"
      >
        <p className="text-sm text-muted-foreground">
          No About Me assessment questions found in the template. Run{' '}
          <code className="rounded bg-muted px-1">npm run seed</code> in careflow-api, then refresh.
        </p>
      </HolisticCollapsibleSection>
    )
  }

  return (
    <HolisticCollapsibleSection
      title="About Me"
      subtitle="Person-centred profile — saved as initial assessment answers. Pre-filled from the service user About Me profile where available."
      testId="ia-about-me-section"
      bodyClassName="space-y-4"
    >
      {ABOUT_ME_IA_TABS.map((t) => (
        <AboutMeSubsection key={t.id} id={t.id} label={t.label}>
          <InitialAssessmentAboutMeTabFields
            tabId={t.id}
            questions={questions}
            draftAnswers={draftAnswers}
            prefillMap={prefillMap}
            questionErrors={questionErrors}
            disabled={disabled}
            serviceUserId={serviceUserId}
            submissionId={submissionId}
            onChange={onChange}
          />
        </AboutMeSubsection>
      ))}

      <p className={cn('flex items-start gap-2', IA_HINT_CLASS, 'text-xs')}>
        <Heart className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" aria-hidden />
        Answers save with this assessment submission. Updating the service user About Me profile still
        pre-fills empty fields on load.
      </p>
    </HolisticCollapsibleSection>
  )
}
