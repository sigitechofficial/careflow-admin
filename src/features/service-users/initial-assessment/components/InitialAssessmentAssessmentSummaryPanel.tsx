import { cn } from '@/shared/lib/utils'
import { HolisticSectionHeader } from '@/features/service-users/initial-assessment/components/holistic/HolisticSectionHeader'
import { HOLISTIC_SECTION_SHELL_CLASS } from '@/features/service-users/initial-assessment/utils/holistic-form-typography'
import { IA_HINT_CLASS } from '@/features/service-users/initial-assessment/utils/form-typography'
import type {
  AssessmentSummary,
  SummaryTone,
} from '@/features/service-users/initial-assessment/utils/assessment-summary'

const TONE_CLASS: Record<SummaryTone, string> = {
  danger: 'text-red-700 dark:text-red-400 font-semibold',
  warn: 'text-amber-800 dark:text-amber-300 font-medium',
  ok: 'text-emerald-700 dark:text-emerald-400',
  neutral: 'text-foreground',
}

const STATUS_LABEL = { required: 'Required', suggested: 'Suggested' } as const

/** Read-only overview of the whole assessment, built from the answers (nothing to fill in). */
export function InitialAssessmentAssessmentSummaryPanel({ summary }: { summary: AssessmentSummary }) {
  const shown = summary.specialists.filter((s) => s.status === 'required' || s.status === 'suggested')
  return (
    <div className={HOLISTIC_SECTION_SHELL_CLASS} data-testid="ia-assessment-summary">
      <HolisticSectionHeader title="Assessment summary" subtitle="Built from the answers in this assessment — nothing to fill in here." />
      <div className="grid gap-6 border-t border-slate-200 bg-white p-4 text-sm dark:border-slate-700 dark:bg-card lg:grid-cols-2">
        <div className="space-y-4">
          <section>
            <h3 className="mb-2 font-semibold">Key points</h3>
            <dl className="space-y-1.5">
              {summary.items.map((item) => (
                <div key={item.label} className="grid grid-cols-[11rem_1fr] gap-2">
                  <dt className="text-muted-foreground">{item.label}</dt>
                  <dd className={TONE_CLASS[item.tone]}>{item.value}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section>
            <h3 className="mb-2 font-semibold">Agreed goals</h3>
            {summary.goals.length ? (
              <ul className="list-disc space-y-1 pl-5">
                {summary.goals.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            ) : (
              <p className={IA_HINT_CLASS}>No goals agreed yet (added on the final tab).</p>
            )}
          </section>
        </div>
        <div className="space-y-4">
          <section>
            <h3 className="mb-2 font-semibold">Specialist assessments</h3>
            {shown.length ? (
              <ul className="space-y-1">
                {shown.map((s) => (
                  <li key={s.tabId} className="flex flex-wrap items-center gap-2">
                    <span>{s.title}</span>
                    <span
                      className={cn(
                        'rounded px-1.5 py-0.5 text-[11px] font-semibold',
                        s.status === 'required'
                          ? 'bg-red-600 text-white dark:bg-red-500'
                          : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
                      )}
                    >
                      {STATUS_LABEL[s.status as 'required' | 'suggested']}
                    </span>
                    {s.completed ? (
                      <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[11px] font-bold text-white dark:bg-emerald-500">
                        ✓ Completed
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">not completed</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={IA_HINT_CLASS}>None required or suggested by the screening yet.</p>
            )}
          </section>
          <section>
            <h3 className="mb-2 font-semibold">Risks flagged</h3>
            {summary.risks.length ? (
              <ul className="list-disc space-y-1 pl-5">
                {summary.risks.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            ) : (
              <p className={IA_HINT_CLASS}>No risk answers flagged.</p>
            )}
          </section>
          {summary.conditions.length ? (
            <section>
              <h3 className="mb-2 font-semibold">Current conditions added in this assessment</h3>
              <p>{summary.conditions.join(', ')}</p>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  )
}
