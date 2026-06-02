import * as React from 'react'
import { Eye, EyeOff, Loader2, X } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { toastApiError, toastError, toastSuccess } from '@/shared/lib/toast'
import { resolveMediaUrl } from '@/shared/lib/media-url'
import type {
  ServiceUserDomCareCarerBrief,
  ServiceUserDomCareData,
} from '@/features/service-users/types'
import {
  usePatchServiceUserDomCare,
  useSearchServiceUserDomCareEmployees,
  useUploadServiceUserDomCareContract,
} from '@/features/service-users/hooks/useServiceUserMutations'
import { useServiceUserDomCare } from '@/features/service-users/hooks/useServiceUserTabs'
import { useAuthStore } from '@/features/auth/store'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { cn } from '@/shared/lib/utils'

function sectionClass() {
  return 'rounded-xl border border-border bg-card p-6 shadow-sm'
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-4 text-sm font-semibold text-sky-600 dark:text-sky-400">{children}</h2>
}

type CarerMap = Record<string, ServiceUserDomCareCarerBrief>

function mergeCarerMap(prev: CarerMap, carers: ServiceUserDomCareCarerBrief[]): CarerMap {
  const next = { ...prev }
  for (const c of carers) next[c.id] = c
  return next
}

type CarerFieldProps = {
  label: string
  placeholder: string
  serviceUserId: string
  excludeIds: string[]
  selectedIds: string[]
  carerMap: CarerMap
  onAdd: (c: ServiceUserDomCareCarerBrief) => void
  onRemove: (id: string) => void
  disabled: boolean
}

function CarerMultiField({
  label,
  placeholder,
  serviceUserId,
  excludeIds,
  selectedIds,
  carerMap,
  onAdd,
  onRemove,
  disabled,
}: CarerFieldProps) {
  const searchMutation = useSearchServiceUserDomCareEmployees(serviceUserId)
  const [q, setQ] = React.useState('')
  const [open, setOpen] = React.useState(false)
  const [hits, setHits] = React.useState<ServiceUserDomCareCarerBrief[]>([])
  const [debouncing, setDebouncing] = React.useState(false)
  const wrapRef = React.useRef<HTMLDivElement>(null)

  const excludeKey = excludeIds.slice().sort().join(',')
  const selectedKey = selectedIds.slice().sort().join(',')

  React.useEffect(() => {
    if (!open || disabled) return
    setDebouncing(true)
    const t = window.setTimeout(() => {
      setDebouncing(false)
      void searchMutation
        .mutateAsync({
          search: q || undefined,
          limit: 20,
        })
        .then(rows => {
          const ex = new Set(excludeIds)
          setHits(rows.filter(r => !ex.has(r.id) && !selectedIds.includes(r.id)))
        })
        .catch(() => setHits([]))
    }, 280)
    return () => {
      window.clearTimeout(t)
      setDebouncing(false)
    }
  }, [open, q, serviceUserId, excludeKey, selectedKey, disabled])

  const loading = debouncing || searchMutation.isPending

  React.useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const el = wrapRef.current
      if (el && !el.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const taCls =
    'min-h-[42px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

  return (
    <div className="space-y-2">
      <label className="text-sm text-muted-foreground">{label}</label>
      <div ref={wrapRef} className="relative space-y-2">
        <input
          type="text"
          className={taCls}
          placeholder={placeholder}
          value={q}
          disabled={disabled}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
          }}
        />
        {open && !disabled && (
          <div
            className="absolute z-30 mt-1 max-h-52 w-full overflow-auto rounded-md border border-border bg-popover shadow-md"
            onMouseDown={(e) => e.preventDefault()}
          >
            {loading ? (
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Searching…
              </div>
            ) : hits.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">No matches</div>
            ) : (
              hits.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  className="flex w-full cursor-pointer items-center px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    onAdd(h)
                    setQ('')
                    setOpen(false)
                  }}
                >
                  {h.firstName} {h.lastName}
                </button>
              ))
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {selectedIds.map((id) => {
            const c = carerMap[id]
            const labelText = c ? `${c.firstName} ${c.lastName}`.trim() : id
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2.5 py-1 text-xs font-medium"
              >
                {labelText}
                {!disabled && (
                  <button
                    type="button"
                    className="rounded-full p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
                    onClick={() => onRemove(id)}
                    aria-label={`Remove ${labelText}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function ServiceUserDomCareTab({ serviceUserId }: { serviceUserId: string }) {
  const can = useAuthStore((s) => s.can)
  const canRead = can('service_users.dom_care.read') || can('service_users.read')
  const canUpdate = can('service_users.dom_care.update') || can('service_users.update')

  const domCareQuery = useServiceUserDomCare(serviceUserId, canRead)
  const patchMutation = usePatchServiceUserDomCare(serviceUserId)
  const uploadMutation = useUploadServiceUserDomCareContract(serviceUserId)

  const [data, setData] = React.useState<ServiceUserDomCareData | null>(null)
  const [carerMap, setCarerMap] = React.useState<CarerMap>({})
  const [doorVisible, setDoorVisible] = React.useState(false)
  const fileRef = React.useRef<HTMLInputElement>(null)

  const loading = domCareQuery.isLoading
  const saving = patchMutation.isPending
  const uploading = uploadMutation.isPending
  const error =
    domCareQuery.error instanceof ApiError
      ? domCareQuery.error.message
      : patchMutation.error instanceof ApiError
        ? patchMutation.error.message
        : uploadMutation.error instanceof ApiError
          ? uploadMutation.error.message
          : domCareQuery.error || patchMutation.error || uploadMutation.error
            ? 'Request failed'
            : null

  React.useEffect(() => {
    if (domCareQuery.data) {
      setData(domCareQuery.data)
      setCarerMap(mergeCarerMap({}, [...domCareQuery.data.preferredCarers, ...domCareQuery.data.blockedCarers]))
    }
  }, [domCareQuery.data])

  const setField = <K extends keyof ServiceUserDomCareData>(key: K, value: ServiceUserDomCareData[K]) => {
    setData((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const preferredIds = data?.preferredCarers.map((c) => c.id) ?? []
  const blockedIds = data?.blockedCarers.map((c) => c.id) ?? []

  const save = async () => {
    if (!data || !canUpdate) return
    const n = Number(data.numberOfCarers)
    if (!Number.isFinite(n) || n < 1 || n > 99) {
      toastError('Cannot save', 'Number of carers must be between 1 and 99.')
      return
    }
    try {
      const d = await patchMutation.mutateAsync({
        accessInstruction: data.accessInstruction,
        accessRisks: data.accessRisks,
        doorCode: data.doorCode,
        careInstructions: data.careInstructions,
        weeklyContractedHours: data.weeklyContractedHours,
        numberOfCarers: n,
        preferredEmployeeIds: preferredIds,
        blockedEmployeeIds: blockedIds,
      })
      setData(d)
      setCarerMap((m) => mergeCarerMap(m, [...d.preferredCarers, ...d.blockedCarers]))
      toastSuccess('DOM care saved', 'Your changes have been saved.')
    } catch (e) {
      toastApiError(e, 'Save failed')
    }
  }

  const onContractPick = async (file: File | null) => {
    if (!file || !canUpdate) return
    try {
      const d = await uploadMutation.mutateAsync(file)
      setData(d)
      setCarerMap((m) => mergeCarerMap(m, [...d.preferredCarers, ...d.blockedCarers]))
      toastSuccess('Contract uploaded', 'The contract file has been attached.')
    } catch (e) {
      toastApiError(e, 'Upload failed')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  if (!canRead) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
        You need <span className="font-mono text-xs">service_users.read</span> or{' '}
        <span className="font-mono text-xs">service_users.dom_care.read</span> to view DOM care.
      </div>
    )
  }

  if (loading || !data) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading…
      </div>
    )
  }

  const contractHref = data.contractDocumentUrl ? resolveMediaUrl(data.contractDocumentUrl) : null

  const areaCls =
    'min-h-[100px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <section className={sectionClass()}>
        <SectionTitle>Access</SectionTitle>
        <div className="space-y-5">
          <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-[minmax(140px,200px)_1fr] md:gap-x-6">
            <label className="pt-2 text-sm text-muted-foreground">Access Instruction</label>
            <textarea
              className={cn(areaCls, !canUpdate && 'opacity-80')}
              value={data.accessInstruction}
              onChange={(e) => setField('accessInstruction', e.target.value)}
              disabled={!canUpdate}
              rows={4}
            />
          </div>
          <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-[minmax(140px,200px)_1fr] md:gap-x-6">
            <label className="pt-2 text-sm text-muted-foreground">Access Risks</label>
            <textarea
              className={cn(areaCls, !canUpdate && 'opacity-80')}
              value={data.accessRisks}
              onChange={(e) => setField('accessRisks', e.target.value)}
              disabled={!canUpdate}
              rows={4}
            />
          </div>
          <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-[minmax(140px,200px)_1fr] md:gap-x-6">
            <div className="flex items-center gap-2 pt-2 text-sm text-muted-foreground">
              <button
                type="button"
                className="rounded p-1 text-foreground hover:bg-muted"
                title={doorVisible ? 'Hide door code' : 'Show door code'}
                onClick={() => setDoorVisible((v) => !v)}
              >
                {doorVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <span>Door Code</span>
            </div>
            <Input
              type={doorVisible ? 'text' : 'password'}
              autoComplete="off"
              value={data.doorCode ?? ''}
              onChange={(e) => setField('doorCode', e.target.value === '' ? null : e.target.value)}
              disabled={!canUpdate}
              className="max-w-md"
            />
          </div>
        </div>
      </section>

      <section className={sectionClass()}>
        <SectionTitle>Care Instructions</SectionTitle>
        <div className="space-y-5">
          <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-[minmax(140px,200px)_1fr] md:gap-x-6">
            <label className="pt-2 text-sm text-muted-foreground">Care Instructions</label>
            <textarea
              className={cn(areaCls, !canUpdate && 'opacity-80')}
              value={data.careInstructions}
              onChange={(e) => setField('careInstructions', e.target.value)}
              disabled={!canUpdate}
              rows={5}
            />
          </div>
          <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-[minmax(140px,200px)_1fr] md:gap-x-6">
            <label className="pt-2 text-sm text-muted-foreground">Weekly Contracted Hours</label>
            <Input
              className="max-w-xs"
              value={data.weeklyContractedHours ?? ''}
              onChange={(e) => setField('weeklyContractedHours', e.target.value === '' ? null : e.target.value)}
              disabled={!canUpdate}
              placeholder="e.g. 10"
            />
          </div>
          <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-[minmax(140px,200px)_1fr] md:gap-x-6">
            <label className="pt-2 text-sm text-muted-foreground">Upload Contract Document</label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => void onContractPick(e.target.files?.[0] ?? null)}
              />
              <Button
                type="button"
                variant="default"
                className="bg-teal-800 hover:bg-teal-900"
                disabled={!canUpdate || uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  'Browse…'
                )}
              </Button>
              {contractHref ? (
                <a
                  href={contractHref}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-sm text-sky-700 underline dark:text-sky-400"
                >
                  View current contract
                </a>
              ) : (
                <span className="text-sm text-muted-foreground">No file uploaded</span>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className={sectionClass()}>
        <SectionTitle>Preferences</SectionTitle>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <CarerMultiField
            label="Preferred Carers"
            placeholder="Search Employee..."
            serviceUserId={serviceUserId}
            excludeIds={blockedIds}
            selectedIds={preferredIds}
            carerMap={carerMap}
            disabled={!canUpdate}
            onAdd={(c) => {
              setCarerMap((m) => mergeCarerMap(m, [c]))
              setData((prev) => {
                if (!prev) return prev
                const blocked = prev.blockedCarers.filter((x) => x.id !== c.id)
                const preferred = prev.preferredCarers.some((x) => x.id === c.id)
                  ? prev.preferredCarers
                  : [...prev.preferredCarers, c]
                return { ...prev, preferredCarers: preferred, blockedCarers: blocked }
              })
            }}
            onRemove={(id) => {
              setData((prev) =>
                prev ? { ...prev, preferredCarers: prev.preferredCarers.filter((x) => x.id !== id) } : prev,
              )
            }}
          />
          <CarerMultiField
            label="Blocked Carers"
            placeholder="Search Employee..."
            serviceUserId={serviceUserId}
            excludeIds={preferredIds}
            selectedIds={blockedIds}
            carerMap={carerMap}
            disabled={!canUpdate}
            onAdd={(c) => {
              setCarerMap((m) => mergeCarerMap(m, [c]))
              setData((prev) => {
                if (!prev) return prev
                const preferred = prev.preferredCarers.filter((x) => x.id !== c.id)
                const blocked = prev.blockedCarers.some((x) => x.id === c.id)
                  ? prev.blockedCarers
                  : [...prev.blockedCarers, c]
                return { ...prev, preferredCarers: preferred, blockedCarers: blocked }
              })
            }}
            onRemove={(id) => {
              setData((prev) =>
                prev ? { ...prev, blockedCarers: prev.blockedCarers.filter((x) => x.id !== id) } : prev,
              )
            }}
          />
        </div>
        <div className="mt-6 grid max-w-md grid-cols-1 items-start gap-3 md:grid-cols-[minmax(140px,200px)_1fr] md:gap-x-6">
          <label className="pt-2 text-sm text-muted-foreground">
            Number of Carers <span className="text-destructive">*</span>
          </label>
          <Input
            type="number"
            min={1}
            max={99}
            className="w-24"
            value={data.numberOfCarers}
            onChange={(e) => {
              const raw = Number(e.target.value)
              const v = Number.isFinite(raw) ? Math.min(99, Math.max(1, raw)) : 1
              setField('numberOfCarers', v)
            }}
            disabled={!canUpdate}
          />
        </div>
      </section>

      {canUpdate && (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save changes
          </Button>
        </div>
      )}
    </div>
  )
}
