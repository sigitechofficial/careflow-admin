import * as React from 'react'
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Building2,
  ChevronRight,
  ClipboardList,
  Contact,
  FileText,
  GraduationCap,
  HelpCircle,
  History,
  Inbox,
  KeyRound,
  Landmark,
  LayoutPanelTop,
  MessageSquareWarning,
  PanelsTopLeft,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  TextSearch,
  UserCog,
  UserPlus,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { normalise } from '@/features/search/search-engine'
import { cn } from '@/shared/lib/utils'

/** How each kind of result looks: an icon and a colour, so the eye finds the right kind at once. */
export type ResultLook = { Icon: LucideIcon; tone: string }

const tone = {
  sky: 'bg-sky-500/12 text-sky-700 dark:text-sky-300',
  emerald: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
  violet: 'bg-violet-500/12 text-violet-700 dark:text-violet-300',
  amber: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  rose: 'bg-rose-500/12 text-rose-700 dark:text-rose-300',
  indigo: 'bg-indigo-500/12 text-indigo-700 dark:text-indigo-300',
  teal: 'bg-teal-500/12 text-teal-700 dark:text-teal-300',
  slate: 'bg-slate-500/12 text-slate-700 dark:text-slate-300',
  orange: 'bg-orange-500/12 text-orange-700 dark:text-orange-300',
  primary: 'bg-primary/12 text-primary',
}

export const KIND_LOOK: Record<'page' | 'tab' | 'setting' | 'howto' | 'inside' | 'recent' | 'suggested' | 'mentions', ResultLook> = {
  page: { Icon: LayoutPanelTop, tone: tone.sky },
  tab: { Icon: PanelsTopLeft, tone: tone.indigo },
  setting: { Icon: SlidersHorizontal, tone: tone.violet },
  howto: { Icon: HelpCircle, tone: tone.amber },
  inside: { Icon: ArrowRight, tone: tone.primary },
  recent: { Icon: History, tone: tone.slate },
  suggested: { Icon: Sparkles, tone: tone.orange },
  mentions: { Icon: TextSearch, tone: tone.slate },
}

/** Records, by the section the server puts them in. */
export const RECORD_LOOK: Record<string, ResultLook> = {
  'Service users': { Icon: Users, tone: tone.emerald },
  Staff: { Icon: UserRound, tone: tone.teal },
  'Enquiries & referrals': { Icon: Inbox, tone: tone.sky },
  Incidents: { Icon: AlertTriangle, tone: tone.rose },
  Safeguarding: { Icon: ShieldAlert, tone: tone.rose },
  'Complaints & compliments': { Icon: MessageSquareWarning, tone: tone.orange },
  Policies: { Icon: BookOpen, tone: tone.indigo },
  'Service user documents': { Icon: FileText, tone: tone.slate },
  'Staff documents': { Icon: FileText, tone: tone.slate },
  Contacts: { Icon: Contact, tone: tone.emerald },
  Surveys: { Icon: ClipboardList, tone: tone.violet },
  'Outside people (surveys)': { Icon: Contact, tone: tone.violet },
  Courses: { Icon: GraduationCap, tone: tone.sky },
  Candidates: { Icon: UserPlus, tone: tone.teal },
  'Office users': { Icon: UserCog, tone: tone.slate },
  Roles: { Icon: KeyRound, tone: tone.slate },
  Branches: { Icon: Building2, tone: tone.slate },
  Funders: { Icon: Landmark, tone: tone.slate },
}
export const recordLook = (section: string): ResultLook => RECORD_LOOK[section] ?? { Icon: FileText, tone: tone.slate }

/** The title with the typed words picked out (start of a word, case and accents ignored). */
export function Highlight({ text, query }: { text: string; query: string }) {
  const words = normalise(query)
    .split(' ')
    .filter(w => w.length >= 2)
  if (!words.length) return <>{text}</>
  const lower = text.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
  const marks = new Array<boolean>(text.length).fill(false)
  for (const w of words) {
    let from = 0
    for (;;) {
      const at = lower.indexOf(w, from)
      if (at < 0) break
      // Only at the start of a word ("ice" must not light up inside "service").
      if (at === 0 || !/[a-z0-9]/.test(lower[at - 1] ?? '')) for (let i = at; i < at + w.length && i < text.length; i++) marks[i] = true
      from = at + 1
    }
  }
  const parts: React.ReactNode[] = []
  let i = 0
  while (i < text.length) {
    const on = marks[i]
    let j = i
    while (j < text.length && marks[j] === on) j++
    const chunk = text.slice(i, j)
    parts.push(
      on ? (
        <mark key={i} className="rounded-sm bg-primary/15 px-0.5 font-semibold text-foreground">
          {chunk}
        </mark>
      ) : (
        chunk
      ),
    )
    i = j
  }
  return <>{parts}</>
}

/** Where it is: the menu steps to get there, small, under the name. */
export function Trail({ steps }: { steps: string[] }) {
  if (!steps.length) return null
  return (
    <span className="flex min-w-0 items-center gap-0.5 overflow-hidden text-[11px] leading-4 text-muted-foreground" data-testid="find-trail">
      {steps.map((s, i) => (
        <React.Fragment key={`${s}-${i}`}>
          {i > 0 ? <ChevronRight className="h-3 w-3 shrink-0 opacity-60" aria-hidden /> : null}
          <span className={cn('truncate', i === steps.length - 1 ? 'shrink' : 'shrink-[2]')}>{s}</span>
        </React.Fragment>
      ))}
    </span>
  )
}

/** One result: coloured icon, the name (typed words picked out), where it is, and a small detail on the right. */
export function ResultRow({
  look,
  title,
  query,
  trail,
  detail,
  answer,
}: {
  look: ResultLook
  title: string
  query: string
  trail?: string[]
  detail?: string
  answer?: string
}) {
  const { Icon } = look
  return (
    <span className="flex min-w-0 flex-1 items-start gap-3">
      <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', look.tone)}>
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
            <Highlight text={title} query={query} />
          </span>
          {detail ? (
            <span className="shrink-0 max-w-[40%] truncate rounded-full border border-border bg-muted/60 px-2 py-px text-[10px] text-muted-foreground">{detail}</span>
          ) : null}
        </span>
        {answer ? <span className="line-clamp-2 text-[11.5px] leading-4 text-muted-foreground">{answer}</span> : null}
        {trail?.length ? <Trail steps={trail} /> : null}
      </span>
    </span>
  )
}

/** A group's heading: its icon, name and how many are shown. */
export function GroupHeading({ look, label, count }: { look: ResultLook; label: string; count: number }) {
  const { Icon } = look
  return (
    <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
      <span className="rounded-full bg-muted px-1.5 text-[10px] font-medium normal-case tracking-normal">{count}</span>
    </span>
  )
}

/** Item classes: roomy rows, and a clear marker on the row the arrow keys are on. */
export const RESULT_ITEM_CLASS =
  'cursor-pointer rounded-lg px-2 py-2 aria-selected:bg-primary/8 data-[selected=true]:bg-primary/[0.08] data-[selected=true]:shadow-[inset_3px_0_0_hsl(var(--primary))]'
