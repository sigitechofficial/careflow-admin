import { Link, useNavigate, useParams } from '@tanstack/react-router'
import {
  CalendarDays,
  ChevronRight,
  CreditCard,
  FileText,
  Loader2,
  PoundSterling,
  Save,
  Users,
} from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { Button } from '@/shared/ui/button'
import { ContentCard } from '@/shared/ui/content-section'
import { toastSuccess } from '@/shared/lib/toast'
import { ChargeCardForm } from '@/features/billing/components/ChargeCardForm'
import { RateCardStatusBadge } from '@/features/billing/components/BillingStatusBadge'
import { useChargeCard } from '@/features/billing/hooks/useChargeCards'
import {
  formatBillingDate,
  formatChargeCardAssignmentDisplay,
  type ChargeCard,
} from '@/features/billing/types/billing-cards.types'

/** Native id on the form in ChargeCardForm, so header actions here can submit it. */
const CHARGE_CARD_FORM_ID = 'charge-card-form'
/** Approx. sticky-header height — tab scrolling leaves this much clear. */
const HEADER_OFFSET = 168

const SECTIONS = [
  { id: 'charge-card-general', label: 'General', icon: FileText },
  { id: 'charge-card-rates', label: 'Charge rates', icon: PoundSterling },
]

/** Scroll the app's main scroll surface to a section, leaving the sticky header clear. */
function scrollToSection(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  // Sections are collapsible <details> — open before scrolling.
  if (el instanceof HTMLDetailsElement) el.open = true
  const scroller = el.closest<HTMLElement>('[data-app-main-scroll]')
  if (scroller) {
    const top =
      el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - HEADER_OFFSET
    scroller.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  } else {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

function SectionTabs() {
  return (
    <nav
      className="-mb-px flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Charge card sections"
      data-testid="charge-card-section-nav"
    >
      {SECTIONS.map(s => {
        const Icon = s.icon
        return (
          <button
            key={s.id}
            type="button"
            className="group flex items-center gap-2 whitespace-nowrap border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onClick={() => scrollToSection(s.id)}
          >
            <Icon
              className="h-4 w-4 shrink-0 opacity-60 transition-opacity group-hover:opacity-100"
              aria-hidden
            />
            {s.label}
          </button>
        )
      })}
    </nav>
  )
}

function Breadcrumb({ isEdit }: { isEdit: boolean }) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-muted-foreground" aria-label="Breadcrumb">
      <Link to="/billing" search={{ tab: 'charge-cards' }} className="hover:text-foreground">
        Charge cards
      </Link>
      <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="text-foreground">{isEdit ? 'Edit charge card' : 'New charge card'}</span>
    </nav>
  )
}

/** Full-page create (`/billing/charge-cards/new`) and edit (`/billing/charge-cards/$chargeCardId/edit`). */
export default function ChargeCardEditorPage() {
  const navigate = useNavigate()
  const { chargeCardId } = useParams({ strict: false }) as { chargeCardId?: string }
  const isEdit = !!chargeCardId
  const cardQuery = useChargeCard(chargeCardId ?? null, isEdit)
  const card = cardQuery.data ?? null

  const backToList = () => void navigate({ to: '/billing', search: { tab: 'charge-cards' } })

  if (isEdit && (cardQuery.isLoading || cardQuery.error || !card)) {
    return (
      <div className="min-w-0 space-y-6 pb-10">
        <Breadcrumb isEdit={isEdit} />
        <ContentCard>
          {cardQuery.isLoading ? (
            <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading charge card…
            </p>
          ) : (
            <p className="text-sm text-destructive">
              {cardQuery.error instanceof ApiError ? cardQuery.error.message : 'Charge card not found.'}
            </p>
          )}
        </ContentCard>
      </div>
    )
  }

  return (
    <div className="min-w-0">
      <ChargeCardEditorHeader card={card} isEdit={isEdit} onCancel={backToList} />

      <div className="pt-6">
        <ChargeCardForm
          key={card?.id ?? 'new'}
          formId={CHARGE_CARD_FORM_ID}
          card={card}
          onCancel={backToList}
          onSaved={saved => {
            toastSuccess(isEdit ? `Charge card "${saved.name}" updated.` : `Charge card "${saved.name}" created.`)
            backToList()
          }}
        />
      </div>
    </div>
  )
}

/** Sticky page header: breadcrumb, title row, meta, actions, and the section tab bar. */
function ChargeCardEditorHeader({
  card,
  isEdit,
  onCancel,
}: {
  card: ChargeCard | null
  isEdit: boolean
  onCancel: () => void
}) {
  return (
    <div className="sticky top-0 z-20 -mx-4 border-b border-border bg-card px-4 pt-3 shadow-sm md:-mx-[22px] md:px-[22px]">
      <Breadcrumb isEdit={isEdit} />

      <div className="mt-3 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-1 basis-64 items-start gap-3.5">
          <span className="mt-0.5 hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary ring-1 ring-inset ring-primary/10 sm:inline-flex">
            <CreditCard className="h-6 w-6" aria-hidden />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                {isEdit && card ? card.name : 'New charge card'}
              </h1>
              {card ? (
                <span className="rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-xs font-medium text-muted-foreground">
                  {card.code}
                </span>
              ) : null}
              {card ? <RateCardStatusBadge status={card.status} /> : null}
            </div>

            <p className="mt-1 text-sm text-muted-foreground">
              Set who this charge card is for, then add the charge rates below.
            </p>

            {card ? (
              <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                  {formatBillingDate(card.effectiveFrom)} → {formatBillingDate(card.effectiveTo)}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1">
                  <Users className="h-3.5 w-3.5" aria-hidden />
                  {formatChargeCardAssignmentDisplay(card)}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1">
                  <PoundSterling className="h-3.5 w-3.5" aria-hidden />
                  {card.rules.length} rate{card.rules.length === 1 ? '' : 's'}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={CHARGE_CARD_FORM_ID}
            leftIcon={isEdit ? <Save className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
          >
            {isEdit ? 'Save changes' : 'Create charge card'}
          </Button>
        </div>
      </div>

      <div className="mt-3">
        <SectionTabs />
      </div>
    </div>
  )
}
