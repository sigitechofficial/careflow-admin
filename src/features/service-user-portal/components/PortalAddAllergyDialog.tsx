import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { toastApiError, toastError, toastSuccess } from '@/shared/lib/toast'
import {
  useCreatePortalAllergy,
  usePortalLookups,
} from '@/features/service-user-portal/hooks/usePortalAboutMe'
import type { CreatePortalAllergyPayload } from '@/features/service-user-portal/api/portal.api'
import {
  ALLERGY_CATALOG_CATEGORY_LABELS,
  ALLERGY_CATALOG_CATEGORY_ORDER,
  type AllergyCatalogCategory,
} from '@/features/settings/allergy-catalog-categories'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'

const SELECT_NONE = '__none__'
const SELECT_CUSTOM = '__custom__'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PortalAddAllergyDialog({ open, onOpenChange }: Props) {
  const { data: lookups } = usePortalLookups()
  const createMutation = useCreatePortalAllergy()
  const [catalogId, setCatalogId] = React.useState(SELECT_NONE)
  const [customName, setCustomName] = React.useState('')
  const [comment, setComment] = React.useState('')
  const [catalogSearch, setCatalogSearch] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setCatalogId(SELECT_NONE)
    setCustomName('')
    setComment('')
    setCatalogSearch('')
  }, [open])

  const allergyCatalog = lookups?.allergies ?? []

  const catalogByCategory = React.useMemo(() => {
    const q = catalogSearch.trim().toLowerCase()
    const grouped = new Map<AllergyCatalogCategory, typeof allergyCatalog>()
    for (const cat of ALLERGY_CATALOG_CATEGORY_ORDER) grouped.set(cat, [])
    for (const item of allergyCatalog) {
      const cat = (item.category as AllergyCatalogCategory | undefined) ?? 'OTHER'
      if (!ALLERGY_CATALOG_CATEGORY_ORDER.includes(cat)) continue
      if (q && !item.name.toLowerCase().includes(q) && !item.code.toLowerCase().includes(q)) {
        continue
      }
      grouped.get(cat)!.push(item)
    }
    return grouped
  }, [allergyCatalog, catalogSearch])

  function buildPayload(): CreatePortalAllergyPayload {
    const c = comment.trim()
    if (!c) throw new Error('Comment is required.')
    if (catalogId === SELECT_NONE) throw new Error('Please select an allergy.')
    if (catalogId === SELECT_CUSTOM) {
      const n = customName.trim()
      if (!n) throw new Error('Enter an allergy name or pick from the list.')
      return { allergyName: n, comment: c }
    }
    return { allergyCatalogId: catalogId, comment: c }
  }

  async function submit() {
    let payload: CreatePortalAllergyPayload
    try {
      payload = buildPayload()
    } catch (err) {
      toastError('Cannot save allergy', err instanceof Error ? err.message : 'Invalid form')
      return
    }

    try {
      await createMutation.mutateAsync(payload)
      onOpenChange(false)
      toastSuccess('Allergy added', 'The allergy has been saved to your record.')
    } catch (err) {
      toastApiError(err, 'Save failed')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add allergy</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">
              Allergy <span className="text-destructive">*</span>
            </label>
            <Input
              value={catalogSearch}
              onChange={e => setCatalogSearch(e.target.value)}
              placeholder="Search (food, latex, penicillin…)"
              className="mb-2"
            />
            <Select value={catalogId} onValueChange={setCatalogId}>
              <SelectTrigger>
                <SelectValue placeholder="Select allergy" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value={SELECT_NONE}>Select allergy</SelectItem>
                {ALLERGY_CATALOG_CATEGORY_ORDER.map(cat => {
                  const items = catalogByCategory.get(cat) ?? []
                  if (items.length === 0) return null
                  return (
                    <SelectGroup key={cat}>
                      <SelectLabel>{ALLERGY_CATALOG_CATEGORY_LABELS[cat]}</SelectLabel>
                      {items.map(a => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )
                })}
                <SelectItem value={SELECT_CUSTOM}>Other (type below)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {catalogId === SELECT_CUSTOM ? (
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-muted-foreground">Allergy name</span>
              <Input
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                placeholder="Enter allergy"
              />
            </label>
          ) : null}

          <label className="block space-y-1 text-sm">
            <span className="font-medium text-muted-foreground">
              Comment <span className="text-destructive">*</span>
            </span>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={4}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Describe your reaction or any details your care team should know"
            />
          </label>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={createMutation.isPending}>
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add allergy'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
