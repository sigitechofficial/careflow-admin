import * as React from 'react'
import { BookOpenText, ChevronDown } from 'lucide-react'
import { ContentCard } from '@/shared/ui/content-section'
import { cn } from '@/shared/lib/utils'

type GuideEntry = { term: string; definition: string }
type GuideSection = { id: string; title: string; entries: GuideEntry[] }

const MONTHLY_SECTIONS: GuideSection[] = [
  {
    id: 'monthly-identity',
    title: 'Record & worker identity columns',
    entries: [
      {
        term: 'Record ID',
        definition:
          'Reference for this employee-month row, built as EH-<year><month>-<worker ID> (e.g. EH-202607-EMP001). It is derived on screen, not stored.',
      },
      {
        term: 'Month / Year',
        definition: 'The calendar month the report covers. Use the arrows or month picker to change it.',
      },
      {
        term: 'Worker ID',
        definition:
          'The employee number from the employment record; falls back to the payroll number, then to a short system ID if neither is set.',
      },
      {
        term: 'First Name / Surname / Full Name',
        definition:
          'Names from the employee personal details. A "Sponsored" badge next to the full name marks Skilled Worker / Health and Care visa holders.',
      },
      {
        term: 'Location / branch',
        definition:
          'The branch the employee belongs to — their base location from the employment record (working location if no base is set).',
      },
    ],
  },
  {
    id: 'monthly-hours',
    title: 'Hours columns',
    entries: [
      {
        term: 'CoS Weekly Hours',
        definition:
          'The weekly hours stated on the Certificate of Sponsorship — taken from contracted weekly hours (or guaranteed hours if no contracted value is set). This is the baseline every week is checked against.',
      },
      {
        term: 'Week 1–5 Hours',
        definition:
          'Payable hours actually worked in each week-of-month block: days 1–7, 8–14, 15–21, 22–28 and 29+. Hours come from reconciled visits (payable minutes, or approved/actual times when no payable figure exists). A red value means that week exceeded the weekly cap.',
      },
      {
        term: 'Total Monthly Hours',
        definition: 'Sum of the five weekly blocks for the month.',
      },
    ],
  },
  {
    id: 'monthly-compliance',
    title: 'Compliance statuses & flags',
    entries: [
      {
        term: 'SMS Reporting Required? = Yes',
        definition:
          'The employee is sponsored AND either a week exceeded their weekly cap, or a fully elapsed week fell below 80% of their CoS weekly hours. Report such changes via the UKVI Sponsor Management System. A "*" means someone manually overrode the automatic value.',
      },
      {
        term: 'Monthly Review Completed?',
        definition:
          'Whether a manager has completed the monthly compliance review for this employee. Set it via the row action; it defaults to No each month.',
      },
      {
        term: 'Compliance Status: Compliant',
        definition: 'No week exceeded the cap and no SMS reporting is required.',
      },
      {
        term: 'Compliance Status: Action required',
        definition:
          'SMS reporting is required (under- or over-hours for a sponsored worker) but no cap breach occurred. Review and report, then record the outcome in comments.',
      },
      {
        term: 'Compliance Status: Breach',
        definition:
          'At least one week exceeded the employee\'s effective weekly cap (visa cap or contractual maximum). This is the most severe status. A "*" indicates a manual override of the derived status.',
      },
      {
        term: 'Comments',
        definition: 'Free-text compliance notes saved with the monthly review record.',
      },
    ],
  },
]

const WEEKLY_SECTIONS: GuideSection[] = [
  {
    id: 'weekly-columns',
    title: 'Table columns',
    entries: [
      {
        term: 'Employee',
        definition:
          'Name, employee number, role and job title. Badges mark Inactive, Agency and Bank staff.',
      },
      {
        term: 'Branch',
        definition:
          'The location/branch the employee belongs to (base location from the employment record), with the contract type underneath.',
      },
      {
        term: 'Contracted',
        definition: 'Contracted weekly hours from the employment record.',
      },
      {
        term: 'Weekly cap',
        definition:
          'The effective maximum weekly hours: the lower of the contractual maximum and any immigration cap (e.g. 20h for Student visas). "Override" means a temporary manual cap override is active.',
      },
      {
        term: 'Assigned',
        definition:
          'Hours of visits scheduled/allocated to the employee this week (pending, allocated or confirmed) — what the rota expects.',
      },
      {
        term: 'Worked',
        definition:
          'Payable hours from reconciled visits this week (excluding visits rejected for pay) — what actually happened.',
      },
      {
        term: 'Utilisation',
        definition:
          'Hours worked as a percentage of contracted weekly hours. Above 100% the bar turns amber — the employee worked more than contracted.',
      },
      {
        term: 'Over 40',
        definition:
          'Hours worked beyond the 40-hour weekly threshold (working-time / overtime watchlist). Shown in amber when above zero.',
      },
      {
        term: 'Over cap',
        definition:
          'Hours worked beyond the employee\'s effective weekly cap. Shown in red — for sponsored or visa-capped workers this is a compliance risk.',
      },
      {
        term: 'Visits',
        definition: 'Worked (payable) visits out of the visits assigned for the week.',
      },
      {
        term: 'Band',
        definition:
          'Which hour band the employee falls into (under 10h, 10–20h, 20–30h, 30–40h, 40h+) based on the selected band metric.',
      },
    ],
  },
  {
    id: 'weekly-expanded',
    title: 'Expanded row details',
    entries: [
      {
        term: 'Worked hours by day',
        definition: 'Payable hours split across Monday–Sunday of the selected week.',
      },
      {
        term: 'Minimum / Maximum / Guaranteed hours',
        definition: 'Contractual hour boundaries from the employment record.',
      },
      {
        term: 'Immigration cap',
        definition: 'The visa type and the weekly hours cap it imposes, where applicable.',
      },
      {
        term: 'Remaining vs contract',
        definition:
          'Contracted hours minus assigned hours — how much contracted time is still unfilled this week (negative = over-allocated).',
      },
      {
        term: 'Remaining to cap',
        definition:
          'Effective cap minus assigned hours — how many more hours can be scheduled before hitting the cap.',
      },
      {
        term: '48h opt-out',
        definition:
          'Whether the employee has opted out of the 48-hour average working week limit (UK Working Time Regulations).',
      },
    ],
  },
  {
    id: 'weekly-filters',
    title: 'Bands, metrics & exception filters',
    entries: [
      {
        term: 'Band by hours worked / assigned / contracted',
        definition:
          'Chooses which measure places employees into the hour bands: actual payable hours, scheduled hours, or contractual weekly hours.',
      },
      {
        term: 'Hour bands (under 10h … 40h+)',
        definition:
          'Quick filters showing how many employees fall in each range for the selected metric. "All hours" removes the band filter.',
      },
      {
        term: 'Over contract',
        definition: 'Only employees who worked more than their contracted weekly hours.',
      },
      {
        term: 'Over cap',
        definition: 'Only employees who worked beyond their effective weekly cap — review these first.',
      },
      {
        term: '40h+ only',
        definition: 'Only employees with worked hours above the 40-hour overtime threshold.',
      },
      {
        term: 'Include inactive',
        definition: 'Also show employees whose profile is marked inactive.',
      },
    ],
  },
]

export function EmployeeHoursGuideAccordion({ view }: { view: 'monthly' | 'weekly' }) {
  const sections = view === 'monthly' ? MONTHLY_SECTIONS : WEEKLY_SECTIONS
  const [openIds, setOpenIds] = React.useState<Set<string>>(new Set())

  const toggle = (id: string) =>
    setOpenIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <ContentCard className="p-0" data-testid="employee-hours-guide">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <BookOpenText className="h-4 w-4 text-muted-foreground" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-foreground">Column & status guide</p>
          <p className="text-xs text-muted-foreground">
            {view === 'monthly'
              ? 'What each column, status and flag on the monthly CoS compliance report means.'
              : 'What each column, band and exception filter on the weekly overview means.'}
          </p>
        </div>
      </div>
      <div className="divide-y divide-border">
        {sections.map(section => {
          const open = openIds.has(section.id)
          return (
            <div key={section.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm font-medium text-foreground hover:bg-muted/30"
                aria-expanded={open}
                onClick={() => toggle(section.id)}
                data-testid={`employee-hours-guide-${section.id}`}
              >
                {section.title}
                <ChevronDown
                  className={cn(
                    'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                    open && 'rotate-180',
                  )}
                  aria-hidden
                />
              </button>
              {open ? (
                <dl className="grid gap-x-6 gap-y-3 px-4 pb-4 pt-1 sm:grid-cols-2">
                  {section.entries.map(entry => (
                    <div key={entry.term} className="flex flex-col gap-0.5">
                      <dt className="text-xs font-semibold text-foreground">{entry.term}</dt>
                      <dd className="text-xs leading-relaxed text-muted-foreground">
                        {entry.definition}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </div>
          )
        })}
      </div>
    </ContentCard>
  )
}
