import * as React from 'react'
import { createPortal } from 'react-dom'
import {
  Briefcase,
  CalendarClock,
  Check,
  ChevronDown,
  Loader2,
  Lock,
  Minus,
  PoundSterling,
  Search,
  ShieldAlert,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip'
import { cn } from '@/shared/lib/utils'
import { useAuthStore } from '@/features/auth/store'
import {
  useAssignRoleResponsibilities,
  useRoleResponsibilities,
} from '@/features/settings/hooks/useRolesPermissions'
import type { RoleResponsibility } from '@/features/settings/roles-permissions/roles-permissions.types'

type Group = { id: string; title: string; icon: React.ReactNode; keys: string[] }

const GROUPS: Group[] = [
  {
    id: 'finance',
    title: 'Finance & payroll',
    icon: <PoundSterling className="h-4 w-4" aria-hidden />,
    keys: ['payroll', 'carer-pay', 'office-salaries', 'invoices', 'visit-reconciliation'],
  },
  {
    id: 'care',
    title: 'Scheduling & care',
    icon: <CalendarClock className="h-4 w-4" aria-hidden />,
    keys: ['visits-rota', 'service-users', 'care-plans'],
  },
  {
    id: 'people',
    title: 'People & HR',
    icon: <Users className="h-4 w-4" aria-hidden />,
    keys: ['employees', 'staff-compliance', 'recruitment', 'hours-approvals', 'training'],
  },
  {
    id: 'quality',
    title: 'Quality & safety',
    icon: <ShieldAlert className="h-4 w-4" aria-hidden />,
    keys: ['incidents', 'complaints', 'surveys', 'survey_responses'],
  },
]

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x))

/** Square check cell — on / part of the job / off, with a ring when changed but not saved. */
function MatrixCell({
  state,
  changed,
  label,
  onToggle,
}: {
  state: 'on' | 'partial' | 'off'
  changed: boolean
  label: string
  onToggle: () => void
}) {
  const box = (
    <button
      type="button"
      role="checkbox"
      aria-checked={state === 'on' ? true : state === 'partial' ? 'mixed' : false}
      aria-label={label}
      onClick={onToggle}
      className={cn(
        'relative inline-flex h-6 w-6 items-center justify-center rounded-md border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        state === 'on' && 'border-primary bg-primary text-primary-foreground',
        state === 'partial' && 'border-warning/70 bg-warning/10 text-warning',
        state === 'off' && 'border-border bg-background hover:border-primary/60 hover:bg-primary/5',
        changed && 'ring-2 ring-primary/30 ring-offset-1 ring-offset-background',
      )}
    >
      {state === 'on' ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden /> : null}
      {state === 'partial' ? <Minus className="h-3.5 w-3.5" strokeWidth={3} aria-hidden /> : null}
    </button>
  )
  if (state !== 'partial') return box
  return (
    <Tooltip>
      <TooltipTrigger asChild>{box}</TooltipTrigger>
      <TooltipContent>Can do part of this job today. Tick to give the full job.</TooltipContent>
    </Tooltip>
  )
}

function LegendItem({ children, swatch }: { children: React.ReactNode; swatch: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      {swatch}
      {children}
    </span>
  )
}

/** Give plain-language jobs to roles; writes the matching permissions behind the scenes. */
export function ResponsibilitiesPanel() {
  const canManage = useAuthStore((s) => s.can('permissions.manage'))
  const { data, isLoading, isError } = useRoleResponsibilities(canManage)
  const saveAll = useAssignRoleResponsibilities()
  const [draft, setDraft] = React.useState<Record<string, string[]>>({})
  const [query, setQuery] = React.useState('')
  const [summaryOpen, setSummaryOpen] = React.useState(false)

  const roles = data?.roles ?? []
  const items = React.useMemo(() => data?.responsibilities ?? [], [data?.responsibilities])
  const byKey = React.useMemo(() => new Map(items.map((i) => [i.key, i])), [items])
  const adminLabel = data?.adminRoles.join(' & ') || 'Admin'
  const nameOf = (id: string) => roles.find((r) => r.id === id)?.name ?? id

  const selectedFor = (item: RoleResponsibility) => draft[item.key] ?? item.roleIds
  const toggle = (item: RoleResponsibility, roleId: string) =>
    setDraft((d) => {
      const current = d[item.key] ?? item.roleIds
      const next = current.includes(roleId) ? current.filter((x) => x !== roleId) : [...current, roleId]
      const copy = { ...d }
      if (sameSet(next, item.roleIds)) delete copy[item.key]
      else copy[item.key] = next
      return copy
    })

  const changes = Object.entries(draft)
    .map(([key, roleIds]) => {
      const item = byKey.get(key)
      if (!item) return null
      return {
        item,
        roleIds,
        gaining: roleIds.filter((id) => !item.roleIds.includes(id)),
        // Roles with the full job or part of it that are no longer chosen.
        losing: [...item.roleIds, ...item.partialRoleIds].filter((id) => !roleIds.includes(id)),
      }
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)

  const save = () =>
    saveAll.mutate(
      changes.map((c) => ({ key: c.item.key, roleIds: c.roleIds })),
      {
        onSuccess: () => {
          setDraft({})
          setSummaryOpen(false)
        },
      },
    )

  const q = query.trim().toLowerCase()
  const matches = (item: RoleResponsibility) =>
    !q || item.label.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
  const grouped = [
    ...GROUPS,
    {
      id: 'other',
      title: 'Other',
      icon: <Briefcase className="h-4 w-4" aria-hidden />,
      keys: items.map((i) => i.key).filter((k) => !GROUPS.some((g) => g.keys.includes(k))),
    },
  ]
    .map((g) => ({
      ...g,
      items: g.keys
        .map((k) => byKey.get(k))
        .filter((i): i is RoleResponsibility => Boolean(i) && matches(i as RoleResponsibility)),
    }))
    .filter((g) => g.items.length > 0)

  const jobsHeld = (roleId: string) => items.filter((i) => selectedFor(i).includes(roleId)).length

  if (!canManage) {
    return (
      <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground shadow-sm">
        You do not have permission to change responsibilities.
      </p>
    )
  }
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading responsibilities…
      </div>
    )
  }
  if (isError || !data) {
    return (
      <p className="rounded-xl border border-border bg-card p-5 text-sm text-destructive shadow-sm">
        Could not load responsibilities.
      </p>
    )
  }

  return (
    <TooltipProvider delayDuration={200}>
    <div className="space-y-4" data-testid="responsibilities-panel">
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl space-y-1">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
              Who does what
            </h2>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Tick the roles responsible for each job. Only ticked roles can make changes there — {adminLabel} always
              have full access. Roles you untick keep any view access they already have.
            </p>
          </div>
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search jobs…"
              className="pl-8"
              aria-label="Search jobs"
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-3">
          <LegendItem
            swatch={
              <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-primary bg-primary text-primary-foreground">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
            }
          >
            Responsible
          </LegendItem>
          <LegendItem
            swatch={
              <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-warning/70 bg-warning/10 text-warning">
                <Minus className="h-3 w-3" strokeWidth={3} />
              </span>
            }
          >
            Part of the job
          </LegendItem>
          <LegendItem swatch={<span className="h-4 w-4 rounded border border-border bg-background" />}>
            Not responsible
          </LegendItem>
          <LegendItem
            swatch={<span className="h-4 w-4 rounded border border-border ring-2 ring-primary/30 ring-offset-1" />}
          >
            Changed, not saved
          </LegendItem>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="max-h-[calc(100vh-15rem)] min-h-[20rem] overflow-auto overscroll-contain">
          <table className="w-full min-w-[1100px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 top-0 z-40 w-[18rem] min-w-[18rem] border-b border-r border-border bg-muted px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">
                  Job
                </th>
                {roles.map((role) => (
                  <th
                    key={role.id}
                    className="sticky top-0 z-30 min-w-[6.5rem] border-b border-border bg-muted px-2 py-3 text-center align-bottom text-xs font-medium text-foreground"
                  >
                    <span className="block leading-tight">{role.name}</span>
                    <span className="mt-0.5 block text-[11px] font-normal tabular-nums text-muted-foreground">
                      {jobsHeld(role.id)} job{jobsHeld(role.id) === 1 ? '' : 's'}
                    </span>
                  </th>
                ))}
                <th className="sticky top-0 z-30 min-w-[7rem] border-b border-l border-border bg-muted px-2 py-3 text-center align-bottom text-xs font-medium text-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Lock className="h-3 w-3 text-muted-foreground" aria-hidden />
                    {adminLabel}
                  </span>
                  <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">Always</span>
                </th>
              </tr>
            </thead>
            {grouped.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={roles.length + 2} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No jobs match “{query}”.
                  </td>
                </tr>
              </tbody>
            ) : (
              grouped.map((group) => (
                <tbody key={group.id}>
                  <tr>
                    <td
                      colSpan={roles.length + 2}
                      className="border-b border-border bg-muted/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      <span className="sticky left-4 inline-flex items-center gap-2">
                        {group.icon}
                        {group.title}
                      </span>
                    </td>
                  </tr>
                  {group.items.map((item) => {
                    const selected = selectedFor(item)
                    const rowChanged = Boolean(draft[item.key])
                    return (
                      <tr
                        key={item.key}
                        className={cn('group', rowChanged && 'bg-primary/[0.03]')}
                        data-testid={`responsibility-${item.key}`}
                      >
                        <td
                          className={cn(
                            'sticky left-0 z-20 border-b border-r border-border bg-card px-4 py-3 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)] group-hover:bg-muted',
                            rowChanged &&
                              'before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-primary',
                          )}
                        >
                          <p className="font-medium text-foreground">{item.label}</p>
                          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{item.description}</p>
                        </td>
                        {roles.map((role) => {
                          const on = selected.includes(role.id)
                          const partial = !on && item.partialRoleIds.includes(role.id)
                          const original = item.roleIds.includes(role.id)
                          return (
                            <td
                              key={role.id}
                              className="border-b border-border px-2 py-3 text-center group-hover:bg-muted/40"
                            >
                              <MatrixCell
                                state={on ? 'on' : partial ? 'partial' : 'off'}
                                changed={on !== original}
                                label={`${role.name} — ${item.label}`}
                                onToggle={() => toggle(item, role.id)}
                              />
                            </td>
                          )
                        })}
                        <td className="border-b border-l border-border bg-muted/20 px-2 py-3 text-center">
                          <span
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-muted text-muted-foreground"
                            aria-label={`${adminLabel} always responsible`}
                          >
                            <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              ))
            )}
          </table>
        </div>
      </div>

      {changes.length > 0
        ? createPortal(
        <div className="fixed bottom-6 right-6 z-50 w-[min(42rem,calc(100vw-3rem))] rounded-xl border border-border bg-card/95 shadow-xl backdrop-blur">
          <div className="flex flex-wrap items-center gap-3 px-4 py-3">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground"
              onClick={() => setSummaryOpen((o) => !o)}
              aria-expanded={summaryOpen}
            >
              <ChevronDown className={cn('h-4 w-4 transition-transform', summaryOpen && 'rotate-180')} />
              {changes.length} unsaved change{changes.length === 1 ? '' : 's'}
            </button>
            <span className="hidden text-xs text-muted-foreground sm:inline">Review before saving.</span>
            <div className="ml-auto flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={saveAll.isPending}
                onClick={() => {
                  setDraft({})
                  setSummaryOpen(false)
                }}
              >
                Discard
              </Button>
              <Button type="button" size="sm" disabled={saveAll.isPending} onClick={save}>
                {saveAll.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </div>
          {summaryOpen ? (
            <ul className="max-h-60 space-y-1.5 overflow-y-auto border-t border-border px-4 py-3 text-xs">
              {changes.map((c) => (
                <li key={c.item.key} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="font-medium text-foreground">{c.item.label}:</span>
                  {c.gaining.map((id) => (
                    <span key={`+${id}`} className="rounded-full bg-success/10 px-2 py-0.5 font-medium text-success">
                      + {nameOf(id)}
                    </span>
                  ))}
                  {c.losing.map((id) => (
                    <span
                      key={`-${id}`}
                      className="rounded-full bg-destructive/10 px-2 py-0.5 font-medium text-destructive"
                    >
                      − {nameOf(id)}
                    </span>
                  ))}
                </li>
              ))}
            </ul>
          ) : null}
        </div>,
            document.body,
          )
        : null}
    </div>
    </TooltipProvider>
  )
}
