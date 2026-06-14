import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  BookOpen,
  CalendarClock,
  Fingerprint,
  Heart,
  LifeBuoy,
  Palette,
  Star,
  UserCircle,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { HolisticSectionHeader } from '@/features/service-users/initial-assessment/components/holistic/HolisticSectionHeader'
import {
  HOLISTIC_SECTION_BODY_CLASS,
  HOLISTIC_SECTION_SHELL_CLASS,
} from '@/features/service-users/initial-assessment/utils/holistic-form-typography'
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

const TAB_ICONS: Record<AboutMeIaTabId, LucideIcon> = {
  'about-main': UserCircle,
  interests: Palette,
  history: BookOpen,
  routine: CalendarClock,
  support: LifeBuoy,
  favourites: Star,
  'id-chars': Fingerprint,
}

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

/** About Me profile tabs rendered as seeded initial assessment questions (§1.3a–1.3g). */
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
  const [sub, setSub] = React.useState<AboutMeIaTabId>('about-main')
  const questions = React.useMemo(() => aboutMeQuestionsFromSections(sections), [sections])

  if (questions.length === 0) {
    return (
      <section className={HOLISTIC_SECTION_SHELL_CLASS} data-testid="ia-about-me-section">
        <HolisticSectionHeader
          title="About Me"
          subtitle="About Me questions are not loaded — run the API seed to add §1.3a–1.3g template questions."
        />
        <div className={HOLISTIC_SECTION_BODY_CLASS}>
          <p className="text-sm text-muted-foreground">
            No About Me assessment questions found in the template. Run{' '}
            <code className="rounded bg-muted px-1">npm run seed</code> in careflow-api, then refresh.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className={HOLISTIC_SECTION_SHELL_CLASS} data-testid="ia-about-me-section">
      <HolisticSectionHeader
        title="About Me"
        subtitle="Person-centred profile — saved as initial assessment answers (§1.3a–1.3g). Pre-filled from the service user About Me profile where available."
      />
      <div className={HOLISTIC_SECTION_BODY_CLASS}>
        <Tabs value={sub} onValueChange={(v) => setSub(v as AboutMeIaTabId)} className="w-full">
          <div className="-mx-1 overflow-x-auto border-b border-border">
            <TabsList variant="underline" className="min-w-max bg-transparent px-1">
              {ABOUT_ME_IA_TABS.map((t) => {
                const TabIcon = TAB_ICONS[t.id]
                return (
                  <TabsTrigger
                    key={t.id}
                    value={t.id}
                    variant="underline"
                    className="shrink-0 gap-1.5 px-2.5 text-xs sm:px-3 sm:text-sm data-[state=active]:text-sky-600 dark:data-[state=active]:text-sky-400"
                  >
                    <TabIcon className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                    {t.label}
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </div>

          {ABOUT_ME_IA_TABS.map((t) => (
            <TabsContent key={t.id} value={t.id} className="mt-6">
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
            </TabsContent>
          ))}
        </Tabs>

        <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
          <Heart className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" aria-hidden />
          Answers save with this assessment submission. Updating the service user About Me profile still
          pre-fills empty fields on load.
        </p>
      </div>
    </section>
  )
}
