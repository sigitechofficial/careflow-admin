import * as React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { BookCopy, CheckCircle2, Loader2, Printer, RefreshCw, Search } from 'lucide-react'
import { PolicyDownloadButtons } from '@/features/policies/components/PolicyDownloadButtons'
import { useAuthStore } from '@/features/auth/store'
import { PolicySectionLayout } from '@/features/policies/components/PolicySectionLayout'
import { POLICY_PATHS } from '@/features/policies/policy-routes'
import {
  MODULE_LABELS,
  useAdoptLibraryPolicies,
  useLibraryPolicies,
  useLibraryPolicy,
  type LibraryPolicy,
} from '@/features/policies/api/policy-library.api'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { cn, formatDate } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Checkbox } from '@/shared/ui/toggle-controls'
import { RichTextHtml } from '@/shared/ui/rich-text-html'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'

const TYPE_LABELS: Record<LibraryPolicy['documentType'], string> = {
  POLICY: 'Policy',
  PROCEDURE: 'Procedure',
  PROTOCOL: 'Protocol',
  GUIDELINE: 'Guideline',
}

const audienceText = (p: LibraryPolicy) => (p.audience.includes('ALL_EMPLOYEES') ? 'All staff' : p.audience.join(', '))

/**
 * Policies → Ready-made policies: complete policies written for a CQC-registered home care provider.
 * Adopting one creates the organisation's own DRAFT (its name filled in, with audience and page
 * links), which goes through the normal review, approval and publishing steps.
 */
export default function ReadyMadePoliciesPage() {
  const canAdopt = useAuthStore(s => s.can('policies.create'))
  const library = useLibraryPolicies()
  const adopt = useAdoptLibraryPolicies()
  const navigate = useNavigate()
  const [search, setSearch] = React.useState('')
  const [category, setCategory] = React.useState<string>('ALL')
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [previewId, setPreviewId] = React.useState<string | null>(null)
  const preview = useLibraryPolicy(previewId)

  const policies = library.data ?? []
  const categories = React.useMemo(() => {
    const byId = new Map<string, LibraryPolicy['category'] & { count: number }>()
    for (const p of policies) {
      const c = byId.get(p.category.id)
      if (c) c.count += 1
      else byId.set(p.category.id, { ...p.category, count: 1 })
    }
    return [...byId.values()].sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name))
  }, [policies])
  const q = search.trim().toLowerCase()
  const visible = policies.filter(
    p =>
      (category === 'ALL' || p.category.id === category) &&
      (!q || `${p.title} ${p.reference} ${p.summary}`.toLowerCase().includes(q)),
  )
  const groups = categories
    .map(c => ({ category: c, items: visible.filter(p => p.category.id === c.id) }))
    .filter(g => g.items.length)
  const adoptedCount = policies.filter(p => p.adoptedPolicyId).length
  const selectable = visible.filter(p => !p.adoptedPolicyId)

  const toggle = (id: string, on: boolean) =>
    setSelected(prev => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })

  const onAdopt = (ids: string[]) =>
    adopt.mutate(ids, {
      onSuccess: result => {
        setSelected(new Set())
        setPreviewId(null)
        const made = result.created.length
        // One policy adopted: open it, where it can be edited and sent for review.
        if (made === 1 && result.created[0]) {
          toastSuccess(
            `${result.created[0].title} added to your Policy Library as a draft`,
            'Check it matches how you work, then send it for review.',
          )
          void navigate({ to: POLICY_PATHS.detail, params: { policyId: result.created[0].policyId } })
          return
        }
        toastSuccess(
          `${made} draft polic${made === 1 ? 'y' : 'ies'} added to your Policy Library`,
          result.skipped.length
            ? `Not added: ${result.skipped.map(s => `${s.reference || s.title} (${s.reason})`).join('; ')}`
            : 'Check each one matches how you work, then send it for review.',
        )
      },
      onError: e => toastApiError(e, 'Could not adopt the policies'),
    })

  const shown = preview.data
  return (
    <PolicySectionLayout
      title="Ready-made policies"
      description="Complete policies written for CQC-registered home care, researched against current legislation and national guidance. Adopting one adds it to your Policy Library as a draft with your organisation's name, ready for review and approval."
      testId="ready-made-policies-page"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search policies…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label="Search ready-made policies"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {policies.length} policies · {adoptedCount} adopted
          </p>
          {canAdopt && selectable.length ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(new Set(selectable.map(p => p.id)))}>
              Select all not yet adopted ({selectable.length})
            </Button>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Categories">
          {[{ id: 'ALL', name: 'All', count: policies.length }, ...categories].map(c => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={category === c.id}
              onClick={() => setCategory(c.id)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium',
                category === c.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {c.name} <span className="tabular-nums">({c.count})</span>
            </button>
          ))}
        </div>

        {library.isLoading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : library.isError ? (
          <p className="text-sm text-destructive">The ready-made policies could not be loaded.</p>
        ) : !policies.length ? (
          <p className="text-sm text-muted-foreground">No ready-made policies are available yet.</p>
        ) : (
          groups.map(g => (
            <section key={g.category.id} className="space-y-2">
              <h3 className="text-sm font-semibold">{g.category.name}</h3>
              <ul className="divide-y divide-border rounded-lg border border-border bg-card">
                {g.items.map(p => (
                  <li key={p.id} className="flex items-start gap-3 px-3 py-2.5" data-testid="ready-made-policy">
                    {canAdopt ? (
                      <Checkbox
                        className="mt-1"
                        checked={selected.has(p.id)}
                        disabled={Boolean(p.adoptedPolicyId)}
                        onCheckedChange={v => toggle(p.id, v === true)}
                        aria-label={`Select ${p.title}`}
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <button type="button" className="text-left text-sm font-medium hover:underline" onClick={() => setPreviewId(p.id)}>
                        {p.title}
                      </button>
                      <p className="text-xs text-muted-foreground">
                        {p.reference} · {TYPE_LABELS[p.documentType]} · {p.sectionHeadings.length} sections ·{' '}
                        {p.wordCount.toLocaleString()} words · review every {p.reviewFrequencyMonths} months
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{p.summary}</p>
                    </div>
                    {p.adoptedPolicyId && p.updateAvailable ? (
                      <Link
                        to={POLICY_PATHS.detail}
                        params={{ policyId: p.adoptedPolicyId }}
                        className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-amber-700 hover:underline dark:text-amber-400"
                        title={p.revisionNote ?? undefined}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Update available
                      </Link>
                    ) : p.adoptedPolicyId ? (
                      <Link
                        to={POLICY_PATHS.detail}
                        params={{ policyId: p.adoptedPolicyId }}
                        className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Adopted
                      </Link>
                    ) : (
                      <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => setPreviewId(p.id)}>
                        Read
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}

        {canAdopt && selected.size ? (
          <div className="sticky bottom-0 z-20 flex items-center justify-between gap-3 rounded-lg border border-sky-300 bg-sky-50 px-4 py-3 text-sm text-sky-900 shadow-md dark:border-sky-900 dark:bg-sky-950 dark:text-sky-100">
            <span>
              {selected.size} polic{selected.size === 1 ? 'y' : 'ies'} selected
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setSelected(new Set())} disabled={adopt.isPending}>
                Clear
              </Button>
              <Button type="button" size="sm" onClick={() => onAdopt([...selected])} disabled={adopt.isPending}>
                {adopt.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <BookCopy className="mr-1 h-4 w-4" />}
                Adopt as drafts
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <Dialog open={Boolean(previewId)} onOpenChange={open => (open ? null : setPreviewId(null))}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{shown?.title ?? 'Policy'}</DialogTitle>
            <DialogDescription>
              {shown
                ? `${shown.reference} · ${TYPE_LABELS[shown.documentType]} · ${shown.category.name} · researched ${formatDate(shown.researchedOn)}`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="max-h-[70vh] space-y-4 overflow-y-auto">
            {preview.isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : preview.isError || !shown ? (
              <p className="text-sm text-destructive">This policy could not be loaded.</p>
            ) : (
              <>
                <dl className="grid gap-3 rounded-md border border-border bg-muted/20 p-3 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-xs text-muted-foreground">For</dt>
                    <dd>{audienceText(shown)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Shows on</dt>
                    <dd>{shown.moduleLinks.map(m => MODULE_LABELS[m] ?? m).join(', ') || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Review and acknowledgement</dt>
                    <dd>
                      Every {shown.reviewFrequencyMonths} months{shown.acknowledgementRequired ? ' · staff acknowledge' : ''}
                    </dd>
                  </div>
                </dl>
                <RichTextHtml
                  className="policy-doc"
                  data-testid="ready-made-policy-content"
                  html={shown.contentHtml}
                />
              </>
            )}
          </DialogBody>
          <DialogFooter className="flex-wrap gap-2">
            {shown ? (
              <span className="mr-auto flex flex-wrap items-center gap-2" data-testid="ready-made-print-actions">
                <Link
                  to="/policies/ready-made/$libraryId/print"
                  params={{ libraryId: shown.id }}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                  data-testid="ready-made-print-link"
                  aria-label={`Print ${shown.title}, opens in a new tab`}
                >
                  <Printer className="h-4 w-4" aria-hidden /> Print
                </Link>
                <PolicyDownloadButtons target={{ kind: 'library', libraryId: shown.id }} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60" />
              </span>
            ) : null}
            <Button type="button" variant="outline" onClick={() => setPreviewId(null)}>
              Close
            </Button>
            {shown && canAdopt && !shown.adoptedPolicyId ? (
              <Button type="button" onClick={() => onAdopt([shown.id])} disabled={adopt.isPending}>
                {adopt.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <BookCopy className="mr-1 h-4 w-4" />}
                Adopt as draft
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PolicySectionLayout>
  )
}
