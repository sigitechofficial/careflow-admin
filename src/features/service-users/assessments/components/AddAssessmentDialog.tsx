import * as React from 'react'
import { Link } from '@tanstack/react-router'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { useAssessmentCatalogue } from '@/features/service-users/assessments/hooks/useServiceUserAssessments'
import type { AssessmentCatalogueItem } from '@/features/service-users/assessments/types'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceUserId: string
  onSelect: (item: AssessmentCatalogueItem) => void
}

function filterItems(items: AssessmentCatalogueItem[], search: string) {
  const q = search.trim().toLowerCase()
  if (!q) return items
  return items.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.assessmentKey.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q),
  )
}

function CatalogueSection({
  title,
  description,
  items,
  onSelect,
}: {
  title: string
  description: string
  items: AssessmentCatalogueItem[]
  onSelect: (item: AssessmentCatalogueItem) => void
}) {
  if (items.length === 0) return null

  return (
    <section className="space-y-2">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <button
            type="button"
            key={item.assessmentKey}
            className="w-full rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-left transition hover:border-border/90 hover:bg-muted/40"
            onClick={() => onSelect(item)}
          >
            <div className="text-sm font-medium text-foreground">{item.title}</div>
            {item.description ? (
              <div className="text-xs text-muted-foreground">{item.description}</div>
            ) : null}
          </button>
        ))}
      </div>
    </section>
  )
}

export function AddAssessmentDialog({ open, onOpenChange, serviceUserId, onSelect }: Props) {
  const catalogueQuery = useAssessmentCatalogue(serviceUserId, open)
  const [search, setSearch] = React.useState('')

  React.useEffect(() => {
    if (!open) setSearch('')
  }, [open])

  const catalogue = catalogueQuery.data
  const toolItems = React.useMemo(
    () => filterItems(catalogue?.tools ?? [], search),
    [catalogue?.tools, search],
  )
  const pathwayItems = React.useMemo(
    () => filterItems(catalogue?.carePathwayForms ?? [], search),
    [catalogue?.carePathwayForms, search],
  )
  const totalItems = (catalogue?.tools.length ?? 0) + (catalogue?.carePathwayForms.length ?? 0)
  const filteredCount = toolItems.length + pathwayItems.length

  const handleSelect = (item: AssessmentCatalogueItem) => {
    onSelect(item)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Add assessment</DialogTitle>
          <DialogDescription>
            Choose an Initial Assessment holistic tool or a care pathway assessment form to capture
            manually.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search assessments…"
            aria-label="Search assessments"
          />
          {catalogueQuery.isLoading && (
            <p className="text-sm text-muted-foreground">Loading assessment catalogue…</p>
          )}
          {catalogueQuery.error && !catalogueQuery.isLoading && (
            <p className="text-sm text-destructive" role="alert">
              Unable to load assessment catalogue.
            </p>
          )}
          {!catalogueQuery.isLoading && !catalogueQuery.error && filteredCount === 0 && (
            <p className="text-sm text-muted-foreground">
              {totalItems === 0
                ? 'No assessment templates available yet.'
                : 'No assessments match your search.'}
            </p>
          )}
          {filteredCount > 0 && (
            <div className="max-h-[min(50vh,24rem)] space-y-4 overflow-y-auto">
              <CatalogueSection
                title="Initial Assessment tools"
                description="Fixed CQC-style worksheets promoted from IA (Waterlow, MUST, falls, and similar)."
                items={toolItems}
                onSelect={handleSelect}
              />
              <CatalogueSection
                title="Care pathway forms"
                description="Configurable Form Builder assessments (capability, bed rails, choking risk, and similar)."
                items={pathwayItems}
                onSelect={handleSelect}
              />
            </div>
          )}
          {!catalogueQuery.isLoading &&
            !catalogueQuery.error &&
            (catalogue?.carePathwayForms.length ?? 0) === 0 &&
            search.trim() === '' && (
            <p className="text-xs text-muted-foreground">
              Care pathway forms are managed under{' '}
              <Link to="/settings/care-pathway" className="text-primary underline underline-offset-2">
                Settings → Care Pathway → Form Selection → Assessments
              </Link>
              .
            </p>
          )}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
