import * as PopoverPrimitive from '@radix-ui/react-popover'
import { ExternalLink, Info } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

type SourceLink = {
  label: string
  detail: string
  href: string
}

/** Pages that publish an actual ethnicity category list (tick-boxes or national codes). */
const CATEGORY_LISTS: SourceLink[] = [
  {
    label: 'ONS Census 2021 — 19 standard categories (table)',
    detail:
      'Core options in this lookup align with the England & Wales Census 2021 ethnic group tick-boxes.',
    href: 'https://www.ons.gov.uk/census/census2021dictionary/variablesbytopic/ethnicgroupnationalidentitylanguageandreligionvariablescensus2021/ethnicgroup/classifications',
  },
  {
    label: 'GOV.UK — GSS harmonised categories (full list)',
    detail:
      'Same 19 categories in plain text for public-sector and employer data collection in England & Wales.',
    href: 'https://www.gov.uk/government/publications/ethnicity-pay-reporting-guidance-for-employers/collecting-ethnicity-data',
  },
  {
    label: 'NHS Data Dictionary — ETHNIC CATEGORY national codes',
    detail:
      '16+1 mandatory NHS ethnicity codes (A–Z), still used in many health datasets. Based on the 2001 Census grouping.',
    href: 'https://archive.datadictionary.nhs.uk/DD%20Release%20May%202024/data_elements/ethnic_category.html',
  },
  {
    label: 'ONS Census 2021 — detailed ethnic groups (288 categories)',
    detail:
      'Many extended entries here are informed by common write-in responses in this detailed ONS list — not a full copy.',
    href: 'https://www.ons.gov.uk/datasets/TS022/editions/2021/versions/2?showAll=ethnic_group_288a',
  },
]

/** UK care regulators — equality duties and guidance, but no published tick-box list. */
const UK_REGULATORS: SourceLink[] = [
  {
    label: 'CQC — PIR guidance (people who use your service)',
    detail:
      'CQC collects diversity information through the Provider Information Return and expects inclusive, non-discriminatory care. It does not publish its own ethnicity category list — providers typically use ONS/GSS or NHS-aligned options.',
    href: 'https://www.cqc.org.uk/guidance-providers/adult-social-care/pir-guidance-people-who-use-your-service',
  },
  {
    label: 'CQC — Equality, diversity and human rights (registration)',
    detail:
      'Registration guidance on respecting personal, cultural, social and religious needs under the Equality Act 2010.',
    href: 'https://www.cqc.org.uk/guidance-regulation/registration/supporting-documents-provider/document/equality-diversity-human-rights',
  },
  {
    label: 'ONS — Ethnicity in health administrative data (England, 2022)',
    detail:
      'How NHS and social care systems in England collect ethnicity, and how they relate to ONS census categories.',
    href: 'https://www.ons.gov.uk/peoplepopulationandcommunity/healthandsocialcare/healthinequalities/articles/methodsandsystemsusedtocollectethnicityinformationinhealthadministrativedatasourcesengland2022/2023-01-16',
  },
]

/** International — different countries use different systems; no single global care regulator list. */
const INTERNATIONAL: SourceLink[] = [
  {
    label: 'US CMS / HHS — Race & ethnicity data collection (OMB standard)',
    detail:
      'US Medicare and federally funded care uses OMB categories (5 race groups + Hispanic ethnicity). Different structure from UK Census options.',
    href: 'https://www.cms.gov/about-cms/agency-information/omh/downloads/data-collection-resources.pdf',
  },
  {
    label: 'HIQA (Ireland) — Draft demographic standard (ethnicity field)',
    detail:
      'Irish health and social care standard includes optional self-identified ethnicity with example categories — not a fixed national tick-box list like ONS.',
    href: 'https://www.hiqa.ie/sites/default/files/2025-06/Draft-National-Standard-for-a-Demographic-Dataset-for-Healthcare-and-Social-Care.pdf',
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

export function EthnicitiesSourceInfo() {
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
          aria-label="Ethnicity lookup data sources"
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
            This lookup was <strong className="font-medium text-foreground">not</strong> copied from
            CQC or any international care regulator. Those bodies set equality duties and data
            collection expectations, but generally <strong className="font-medium text-foreground">do not publish a standard ethnicity tick-box list</strong> for
            service users.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Our seed data is primarily based on <strong className="font-medium text-foreground">UK ONS Census 2021</strong> categories,
            with additional backgrounds for practical care recording. There is no single worldwide
            standard — WHO/ICD classifies diseases, not ethnicity.
          </p>

          <p className="mt-3 text-xs font-medium text-foreground">
            Lists with actual ethnicity categories
          </p>
          <div className="mt-2">
            <SourceList items={CATEGORY_LISTS} />
          </div>

          <p className="mt-3 text-xs font-medium text-foreground">
            UK care regulation (context, not category lists)
          </p>
          <div className="mt-2">
            <SourceList items={UK_REGULATORS} />
          </div>

          <p className="mt-3 text-xs font-medium text-foreground">
            International comparison
          </p>
          <div className="mt-2">
            <SourceList items={INTERNATIONAL} />
          </div>

          <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
            Your organisation can add or edit entries. Align with how you report to commissioners,
            CQC equality monitoring, and NHS partners where relevant.
          </p>
          <PopoverPrimitive.Arrow className="fill-popover" />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
