import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus, Search, ShieldAlert } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { useAuthStore } from '@/features/auth/store'
import { serviceUserKeys } from '@/features/service-users/keys'
import {
  createMedicationAllergy,
  deleteMedicationAllergy,
  listMedicationAllergies,
} from '@/features/service-users/api/medication-allergies.api'
import {
  useAllergyCatalog,
  useCreateAllergyCatalog,
} from '@/features/settings/hooks/useLookupsAdmin'

export function MedicationAllergiesTab({ serviceUserId }: { serviceUserId: string }) {
  const canManage = useAuthStore(
    s => s.can('service_users.update') || s.can('service_users.medications.allergies.manage' as never),
  )
  const canManageCatalog = useAuthStore(s => s.can('lookups.manage'))
  const qc = useQueryClient()
  const allergiesKey = [...serviceUserKeys.detail(serviceUserId), 'medication-allergies'] as const

  const [search, setSearch] = React.useState('')
  const [newAllergyName, setNewAllergyName] = React.useState('')

  /* ── data ─────────────────────────────────────────────────── */

  const { data: allergies = [], isLoading: loadingLinked } = useQuery({
    queryKey: allergiesKey,
    queryFn: ({ signal }) => listMedicationAllergies(serviceUserId, { signal }),
  })

  const catalogQuery = useAllergyCatalog()
  const catalogRows = catalogQuery.data ?? []
  const loadingCatalog = catalogQuery.isLoading

  /** Medication-category allergens from the catalogue, sorted A-Z. */
  const medicationAllergens = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return catalogRows
      .filter(r => r.category === 'MEDICATION' && r.isActive !== false)
      .filter(r => (q ? r.name.toLowerCase().includes(q) : true))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [catalogRows, search])

  /** lowered allergyName → linked MedicationAllergy id (for unlink). */
  const linkedByName = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const row of allergies) map.set(row.allergyName.trim().toLowerCase(), row.id)
    return map
  }, [allergies])

  const linkedCount = linkedByName.size

  /* ── mutations ────────────────────────────────────────────── */

  const invalidate = () => qc.invalidateQueries({ queryKey: allergiesKey })

  const [pendingName, setPendingName] = React.useState<string | null>(null)

  const toggleMut = useMutation({
    mutationFn: async ({ name, checked }: { name: string; checked: boolean }) => {
      if (checked) {
        await createMedicationAllergy(serviceUserId, { allergyName: name })
      } else {
        const id = linkedByName.get(name.trim().toLowerCase())
        if (id) await deleteMedicationAllergy(serviceUserId, id)
      }
    },
    onMutate: ({ name }) => setPendingName(name),
    onSuccess: (_d, { checked }) => {
      toastSuccess(checked ? 'Allergy linked' : 'Allergy unlinked')
      void invalidate()
    },
    onError: e => toastApiError(e, 'Could not update allergy'),
    onSettled: () => setPendingName(null),
  })

  const createCatalogMut = useCreateAllergyCatalog()

  const onAddNew = async () => {
    const name = newAllergyName.trim()
    if (!name) return
    const code = `MEDICATION_${name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '')}`.slice(0, 64)
    try {
      await createCatalogMut.mutateAsync({ name, code, category: 'MEDICATION' })
      toastSuccess('Allergy added to catalogue')
      setNewAllergyName('')
    } catch (e) {
      toastApiError(e, 'Could not add allergy')
    }
  }

  /* ── render ───────────────────────────────────────────────── */

  const loading = loadingLinked || loadingCatalog

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-700 dark:text-red-300">
          <ShieldAlert className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            Medication allergies
            {linkedCount > 0 ? (
              <span className="ml-2 inline-flex items-center rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-700 dark:text-red-300">
                {linkedCount} linked
              </span>
            ) : null}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Tick the medication allergies that apply to this service user. These flag on the MAR and
            when adding medications.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search medication allergies…"
          className="pl-9"
        />
      </div>

      {/* Checkbox grid */}
      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading allergies…
        </div>
      ) : medicationAllergens.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
          {search.trim()
            ? 'No matching medication allergies in the catalogue.'
            : 'No medication allergies in the catalogue yet. Add one below.'}
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {medicationAllergens.map(row => {
            const isLinked = linkedByName.has(row.name.trim().toLowerCase())
            const isPending = toggleMut.isPending && pendingName === row.name
            return (
              <label
                key={row.id}
                className={
                  'flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors ' +
                  (isLinked
                    ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/40'
                    : 'border-border bg-card hover:bg-muted/40')
                }
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input accent-red-600"
                  checked={isLinked}
                  disabled={!canManage || isPending}
                  onChange={e =>
                    toggleMut.mutate({ name: row.name, checked: e.target.checked })
                  }
                />
                <span className="min-w-0 flex-1 truncate">{row.name}</span>
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
                ) : null}
              </label>
            )
          })}
        </div>
      )}

      {/* Add new allergy to catalogue */}
      {canManageCatalog ? (
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-muted/20 p-4">
          <div className="min-w-[220px] flex-1 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Add a new medication allergy to the catalogue
            </label>
            <Input
              value={newAllergyName}
              onChange={e => setNewAllergyName(e.target.value)}
              placeholder="e.g. Penicillin"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void onAddNew()
                }
              }}
              disabled={createCatalogMut.isPending}
            />
          </div>
          <Button
            type="button"
            size="sm"
            className="gap-1.5"
            disabled={!newAllergyName.trim() || createCatalogMut.isPending}
            onClick={() => void onAddNew()}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            {createCatalogMut.isPending ? 'Adding…' : 'Add to catalogue'}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
