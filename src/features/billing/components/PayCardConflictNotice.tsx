import { Link } from '@tanstack/react-router'
import { AlertTriangle } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import { usePayCardConflictCheck, usePayCardConflicts } from '@/features/billing/hooks/usePayCards'
import type {
  PayCardConflictCard,
  PayCardConflictCheckInput,
} from '@/features/billing/types/billing-cards.types'

const cardLabel = (card: Pick<PayCardConflictCard, 'code' | 'name'>) => `${card.code} — ${card.name}`

function CarerLinks({ carers, total }: { carers: Array<{ employeeId: string; name: string }>; total: number }) {
  return (
    <p className="text-xs text-amber-900/90 dark:text-amber-100/90">
      {carers.map((carer, index) => (
        <span key={carer.employeeId}>
          {index > 0 ? ', ' : ''}
          <Link
            to="/employee/$employeeId/edit"
            params={{ employeeId: carer.employeeId }}
            search={{ tab: 'pay-card' } as never}
            className="underline underline-offset-2"
          >
            {carer.name}
          </Link>
        </span>
      ))}
      {total > carers.length ? ` and ${total - carers.length} more` : ''}
    </p>
  )
}

/**
 * Carers whose pay card cannot be decided today because two or more cards match them at the same
 * level (PC-32). Their visit pay is held, not paid on a guess. Shows nothing when there is none.
 */
export function PayCardConflictsBanner() {
  const { locationId } = useGlobalLocationScope()
  const query = usePayCardConflicts(locationId)

  if (query.isLoading) return null
  if (query.error) {
    // A branch user who has not chosen a branch yet: the rest of the screen says so.
    if (query.error instanceof ApiError && (query.error.status === 403 || query.error.status === 404)) return null
    return (
      <p className="text-sm text-destructive" data-testid="pay-card-conflicts-error">
        Could not check for conflicting pay cards.
      </p>
    )
  }
  const data = query.data
  if (!data || data.carerCount === 0) return null

  return (
    <div
      className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/40 dark:bg-amber-500/10"
      data-testid="pay-card-conflicts"
      role="alert"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-amber-950 dark:text-amber-50">
            {data.carerCount} carer{data.carerCount === 1 ? '' : 's'} cannot be paid: more than one pay card applies
          </p>
          <p className="text-xs text-amber-900/90 dark:text-amber-100/90">
            Their visit pay is held until one card is chosen. End one of the cards before the date
            the other starts, or give each carer their own pay card.
          </p>
        </div>
      </div>
      <ul className="space-y-2">
        {data.groups.map(group => (
          <li
            key={group.cards.map(card => card.id).join('|')}
            className="rounded-md border border-amber-200 bg-background/70 px-3 py-2 dark:border-amber-500/30"
            data-testid="pay-card-conflict-group"
          >
            <p className="text-sm text-foreground">{group.cards.map(cardLabel).join('  ·  ')}</p>
            <CarerLinks carers={group.carers} total={group.carerCount} />
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * For the pay card form: says, before anything is saved, whether the card as entered would leave
 * carers between two cards. A warning, not a refusal — several cards at one level are normal when
 * carers are given their card individually.
 */
export function PayCardConflictCheckNotice({ input }: { input: PayCardConflictCheckInput | null }) {
  const { locationId } = useGlobalLocationScope()
  const query = usePayCardConflictCheck(input, locationId)
  const data = query.data
  if (!input || !data?.message) return null
  const held = data.affectedCarerCount > 0

  return (
    <div
      className={
        held
          ? 'space-y-1 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 dark:border-amber-500/40 dark:bg-amber-500/10'
          : 'space-y-1 rounded-md border border-border bg-muted/30 px-3 py-2'
      }
      data-testid="pay-card-conflict-check"
      role={held ? 'alert' : 'note'}
    >
      <p className="flex items-start gap-2 text-sm text-foreground">
        <AlertTriangle
          className={held ? 'mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300' : 'mt-0.5 h-4 w-4 shrink-0 text-muted-foreground'}
          aria-hidden
        />
        <span>{data.message}</span>
      </p>
      {data.overlapping.length ? (
        <p className="text-xs text-muted-foreground">
          {data.overlapping.map(card => `${cardLabel(card)} (both in force from ${card.overlapFrom})`).join('; ')}
        </p>
      ) : null}
      {held ? <CarerLinks carers={data.affectedCarers} total={data.affectedCarerCount} /> : null}
    </div>
  )
}
