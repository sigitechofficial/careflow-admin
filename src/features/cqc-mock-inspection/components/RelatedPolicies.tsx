import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { FileText } from 'lucide-react'
import { useAuthStore } from '@/features/auth/store'
import { Badge } from '@/shared/ui/badge'
import type { StatementPolicy } from '../types'
import { useStatementPolicies } from '../hooks'
import { AdoptOneButton, UndoAdoptButton, useCanAdopt, useCanUndoAdopt } from './AdoptButtons'

/** Ready-made policies by statement, for users who may see policies (empty otherwise). */
export function usePoliciesByStatement() {
  const canSee = useAuthStore(s => s.can('policies.read'))
  const query = useStatementPolicies(canSee)
  return { canSee, byStatement: query.data ?? {} }
}

const TYPE_LABEL: Record<string, string> = {
  POLICY: 'Policy',
  PROCEDURE: 'Procedure',
  PROTOCOL: 'Protocol',
  GUIDELINE: 'Guideline',
}

/** One policy: a link to the organisation's adopted copy (or the ready-made policy to read), and Adopt when not adopted. */
export function PolicyLink({ p }: { p: StatementPolicy }) {
  const canAdopt = useCanAdopt('policy')
  const canUndo = useCanUndoAdopt('policy')
  const body = (
    <>
      <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
      <span className="min-w-0">
        <span className="font-medium text-foreground group-hover:underline">{p.title}</span>
        <span className="mt-0.5 block text-[11px] text-muted-foreground">
          {p.reference} · {TYPE_LABEL[p.documentType] ?? p.documentType}
        </span>
      </span>
    </>
  )
  const linkCls = 'group flex min-w-0 flex-1 items-start gap-1.5'
  return (
    <div
      className="flex flex-col gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs hover:border-primary"
      data-testid="mock-related-policy-card"
    >
      {p.adoptedPolicyId ? (
        <Link
          to="/policies/$policyId"
          params={{ policyId: p.adoptedPolicyId }}
          className={linkCls}
          title="Open your organisation's policy"
          data-testid="mock-related-policy"
        >
          {body}
        </Link>
      ) : (
        <Link
          to="/policies/ready-made"
          search={{ open: p.id }}
          className={linkCls}
          title="Read this ready-made policy"
          data-testid="mock-related-policy"
        >
          {body}
        </Link>
      )}
      <div className="flex items-center justify-between gap-2 pl-5">
        {p.adoptedStatus === 'ARCHIVED' ? (
          <Badge size="sm" variant="warning" title="Your copy is archived, so staff no longer see it. Open it to restore or replace it.">
            Archived
          </Badge>
        ) : p.adoptedPolicyId ? (
          <Badge size="sm" variant="success">
            Adopted
          </Badge>
        ) : (
          <Badge size="sm" variant="outline">
            Not adopted
          </Badge>
        )}
        {!p.adoptedPolicyId && canAdopt ? <AdoptOneButton kind="policy" id={p.id} title={p.title} /> : null}
        {p.adoptedPolicyId && p.canUndoAdopt && canUndo ? (
          <UndoAdoptButton kind="policy" id={p.adoptedPolicyId} title={p.title} />
        ) : null}
      </div>
    </div>
  )
}

/** Policies as links, the first `limit` shown and the rest behind "Show all". */
export function PolicyList({ policies, limit, columns = 1 }: { policies: StatementPolicy[]; limit: number; columns?: 1 | 2 }) {
  const [all, setAll] = React.useState(false)
  const shown = all ? policies : policies.slice(0, limit)
  return (
    <div className="space-y-1.5">
      <div className={columns === 2 ? 'grid gap-1.5 sm:grid-cols-2' : 'space-y-1.5'}>
        {shown.map(p => (
          <PolicyLink key={p.id} p={p} />
        ))}
      </div>
      {policies.length > limit ? (
        <button
          type="button"
          className="text-xs font-medium text-primary hover:underline"
          onClick={() => setAll(v => !v)}
          data-testid="mock-related-policies-toggle"
        >
          {all ? 'Show fewer' : `Show all ${policies.length} (${policies.length - shown.length} more)`}
        </button>
      ) : null}
    </div>
  )
}

/** "Policies that apply" for one statement; nothing when there are none. */
export function RelatedPolicies({ policies }: { policies: StatementPolicy[] | undefined }) {
  if (!policies?.length) return null
  return (
    <div data-testid="mock-related-policies">
      <p className="text-xs font-semibold text-foreground">Policies that apply</p>
      <p className="mb-1.5 text-[11px] text-muted-foreground">
        The policies an inspector would expect to see behind this statement. Make sure yours are adopted and up to date.
      </p>
      <PolicyList policies={policies} limit={6} columns={2} />
    </div>
  )
}

/** Every policy for a set of statements, once each: those behind more of these statements first. */
export function policiesForStatements(codes: string[], byStatement: Record<string, StatementPolicy[]>): StatementPolicy[] {
  const hits = new Map<string, { p: StatementPolicy; covers: number; first: number }>()
  let order = 0
  for (const code of codes) {
    for (const p of byStatement[code] ?? []) {
      const h = hits.get(p.id)
      if (h) h.covers += 1
      else hits.set(p.id, { p, covers: 1, first: order++ })
    }
  }
  return [...hits.values()].sort((a, b) => b.covers - a.covers || a.first - b.first).map(h => h.p)
}
