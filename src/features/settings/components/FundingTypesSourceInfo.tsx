import * as PopoverPrimitive from '@radix-ui/react-popover'
import { ExternalLink, Info } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

type SourceLink = {
  label: string
  detail: string
  href: string
}

/** Official guidance describing funding routes (not a single national tick-box list). */
const FUNDING_ROUTES: SourceLink[] = [
  {
    label: 'NHS — Continuing Healthcare (who pays, joint packages)',
    detail:
      'Describes NHS CHC, joint packages with councils, and when the NHS pays part or all of care. No fixed dropdown list for service users.',
    href: 'https://www.nhs.uk/social-care-and-support/money-work-and-benefits/nhs-continuing-healthcare/',
  },
  {
    label: 'NHS England — CHC & NHS-funded nursing care (leaflet PDF)',
    detail:
      'Official leaflet on CHC eligibility, NHS-funded nursing care (FNC), and joint packages of care.',
    href: 'https://assets.publishing.service.gov.uk/media/63074037d3bf7f366522beec/Public-Information-Leaflet0NHS-Continuing-Healthcare-and-NHS-funded-Nursing-Care-2022.pdf',
  },
  {
    label: 'GOV.UK — Paying for care and support (overview)',
    detail:
      'How care is paid for in England: council support, NHS care, benefits, and self-funding.',
    href: 'https://www.gov.uk/pay-for-care-and-support',
  },
  {
    label: 'Care Act 2014 — statutory guidance (charging & affordability)',
    detail:
      'Legal framework for local authority charging, means tests, personal budgets, and direct payments.',
    href: 'https://www.gov.uk/government/publications/care-act-statutory-guidance/care-and-support-statutory-guidance',
  },
]

/** National statistics & LA returns — aggregate income sources, not per-person codes. */
const STATISTICS_AND_RETURNS: SourceLink[] = [
  {
    label: 'DHSC — Adult social care finance report (England)',
    detail:
      'How councils fund ASC: client contributions, NHS income, Better Care Fund, etc. Statistical categories — not a service-user pick list.',
    href: 'https://www.gov.uk/government/statistics/adult-social-care-finance-report-england-2024-to-2025/adult-social-care-finance-report-england-2024-to-2025',
  },
  {
    label: 'NHS England Digital — ASC-FR general guidance',
    detail:
      'Adult Social Care Finance Return: how LA income from NHS, client contributions, and joint arrangements is recorded.',
    href: 'https://digital.nhs.uk/data-and-information/data-collections-and-data-sets/data-collections/social-care-collection-materials-2025/adult-social-care-finance-return-asc-fr/general-guidance',
  },
]

/** Regulators — duties and monitoring, not published funding-type catalogues. */
const REGULATORS: SourceLink[] = [
  {
    label: 'CQC — Provider Information Return (equality & diversity)',
    detail:
      'CQC monitors how providers meet needs inclusively. It does not publish a standard funding-source dropdown for service users.',
    href: 'https://www.cqc.org.uk/guidance-providers/adult-social-care/pir-guidance-people-who-use-your-service',
  },
]

/** International — different systems; no global care funding taxonomy. */
const INTERNATIONAL: SourceLink[] = [
  {
    label: 'US CMS — Medicaid & Medicare (overview)',
    detail:
      'US care funding uses Medicaid/Medicare/self-pay — a different structure from UK CHC and local authority routes.',
    href: 'https://www.medicare.gov/health-drug-plans/health-plans/your-coverage-options',
  },
  {
    label: 'WHO — no international care funding classification',
    detail:
      'WHO ICD classifies health conditions, not how social care is funded. Countries define funding locally.',
    href: 'https://www.who.int/standards/classifications/classification-of-diseases',
  },
]

function SourceList({ items }: { items: SourceLink[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map(source => (
        <li key={source.href} className="text-xs leading-relaxed">
          <a
            href={source.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-start gap-1 font-medium text-primary underline-offset-2 hover:underline"
          >
            <span>{source.label}</span>
            <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 opacity-70" />
          </a>
          <p className="mt-0.5 text-muted-foreground">{source.detail}</p>
        </li>
      ))}
    </ul>
  )
}

export function FundingTypesSourceInfo() {
  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
            'bg-primary/10 text-primary hover:bg-primary/15',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          )}
          aria-label="Funding type lookup data sources"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side="bottom"
          align="start"
          sideOffset={6}
          className={cn(
            'z-50 max-h-[min(70vh,28rem)] w-[min(100vw-2rem,26rem)] overflow-y-auto rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-md',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          )}
        >
          <p className="text-sm font-semibold text-foreground">Where this list comes from</p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            There is <strong className="font-medium text-foreground">no single UK national tick-box list</strong> of
            funding types for individual service users. CQC, DHSC, and NHS publish{' '}
            <strong className="font-medium text-foreground">funding routes and statistical categories</strong>, not a
            catalogue identical to this lookup.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Our seed data combines the main England &amp; Wales routes —{' '}
            <strong className="font-medium text-foreground">NHS CHC/FNC</strong>,{' '}
            <strong className="font-medium text-foreground">local authority</strong>,{' '}
            <strong className="font-medium text-foreground">direct payments</strong>,{' '}
            <strong className="font-medium text-foreground">self-funding</strong>, and{' '}
            <strong className="font-medium text-foreground">mixed/joint</strong> packages — plus common practical
            variants used in care records.
          </p>

          <p className="mt-3 text-xs font-medium text-foreground">UK funding routes (guidance)</p>
          <div className="mt-2">
            <SourceList items={FUNDING_ROUTES} />
          </div>

          <p className="mt-3 text-xs font-medium text-foreground">
            National statistics &amp; LA returns (aggregate, not per person)
          </p>
          <div className="mt-2">
            <SourceList items={STATISTICS_AND_RETURNS} />
          </div>

          <p className="mt-3 text-xs font-medium text-foreground">Regulation (context)</p>
          <div className="mt-2">
            <SourceList items={REGULATORS} />
          </div>

          <p className="mt-3 text-xs font-medium text-foreground">International comparison</p>
          <div className="mt-2">
            <SourceList items={INTERNATIONAL} />
          </div>

          <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
            Your organisation can add or edit entries. Align choices with how you contract with councils, ICBs, and
            self-funders.
          </p>
          <PopoverPrimitive.Arrow className="fill-popover" />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
