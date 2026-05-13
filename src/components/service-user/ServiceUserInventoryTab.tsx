import * as React from 'react'
import { Camera, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ApiError } from '@/lib/api-client'
import { toastApiError, toastError, toastSuccess } from '@/lib/toast'
import { resolveMediaUrl } from '@/lib/media-url'
import {
  createServiceUserInventoryItem,
  deleteServiceUserInventoryItem,
  listServiceUserInventory,
  updateServiceUserInventoryItem,
  uploadServiceUserInventoryItemPhoto,
  type ServiceUserInventoryItem,
} from '@/lib/service-users-api'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/dialog'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

export type InventorySignaturePadRef = {
  clear: () => void
  getDataUrl: () => string | null
}

const InventorySignaturePad = React.forwardRef<InventorySignaturePadRef, { className?: string }>(
  function InventorySignaturePad({ className }, ref) {
    const canvasRef = React.useRef<HTMLCanvasElement>(null)
    const drawing = React.useRef(false)
    const dirty = React.useRef(false)
    const last = React.useRef<{ x: number; y: number } | null>(null)

    const layoutCanvas = React.useCallback(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const dpr = Math.min(window.devicePixelRatio ?? 1, 2)
      const cssW = 320
      const cssH = 140
      canvas.style.width = `${cssW}px`
      canvas.style.height = `${cssH}px`
      canvas.width = Math.floor(cssW * dpr)
      canvas.height = Math.floor(cssH * dpr)
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.strokeStyle = '#111827'
      ctx.lineWidth = Math.max(2, 2 * dpr)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
    }, [])

    React.useLayoutEffect(() => {
      layoutCanvas()
    }, [layoutCanvas])

    const bitmapPoint = (clientX: number, clientY: number) => {
      const canvas = canvasRef.current!
      const r = canvas.getBoundingClientRect()
      const scaleX = canvas.width / r.width
      const scaleY = canvas.height / r.height
      return { x: (clientX - r.left) * scaleX, y: (clientY - r.top) * scaleY }
    }

    const drawSegment = (a: { x: number; y: number }, b: { x: number; y: number }) => {
      const ctx = canvasRef.current?.getContext('2d')
      if (!ctx) return
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
    }

    const onPointerDown = (e: React.MouseEvent | React.TouchEvent) => {
      if ('touches' in e) e.preventDefault()
      const clientX = 'touches' in e ? e.touches[0]?.clientX ?? 0 : e.clientX
      const clientY = 'touches' in e ? e.touches[0]?.clientY ?? 0 : e.clientY
      drawing.current = true
      last.current = bitmapPoint(clientX, clientY)
    }

    const onPointerMove = (e: React.MouseEvent | React.TouchEvent) => {
      if (!drawing.current) return
      if ('touches' in e) e.preventDefault()
      const clientX = 'touches' in e ? e.touches[0]?.clientX ?? 0 : e.clientX
      const clientY = 'touches' in e ? e.touches[0]?.clientY ?? 0 : e.clientY
      const p = bitmapPoint(clientX, clientY)
      const prev = last.current
      if (prev) {
        drawSegment(prev, p)
        dirty.current = true
      }
      last.current = p
    }

    const endStroke = () => {
      drawing.current = false
      last.current = null
    }

    React.useImperativeHandle(ref, () => ({
      clear: () => {
        dirty.current = false
        last.current = null
        drawing.current = false
        layoutCanvas()
      },
      getDataUrl: () => {
        if (!dirty.current || !canvasRef.current) return null
        return canvasRef.current.toDataURL('image/png')
      },
    }))

    return (
      <canvas
        ref={canvasRef}
        className={cn('max-w-full cursor-crosshair touch-none rounded-md border border-border bg-white', className)}
        onMouseDown={onPointerDown}
        onMouseMove={onPointerMove}
        onMouseUp={endStroke}
        onMouseLeave={endStroke}
        onTouchStart={onPointerDown}
        onTouchMove={onPointerMove}
        onTouchEnd={endStroke}
        aria-label="Witness signature"
      />
    )
  },
)

type FormState = {
  itemName: string
  quantity: string
  itemValue: string
  description: string
  location: string
  dateDeposited: string
}

function emptyForm(): FormState {
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  return {
    itemName: '',
    quantity: '1',
    itemValue: '',
    description: '',
    location: '',
    dateDeposited: `${yyyy}-${mm}-${dd}`,
  }
}

function itemToForm(item: ServiceUserInventoryItem): FormState {
  return {
    itemName: item.itemName,
    quantity: String(item.quantity),
    itemValue: item.itemValue ?? '',
    description: item.description,
    location: item.location,
    dateDeposited: item.dateDeposited,
  }
}

export function ServiceUserInventoryTab({ serviceUserId }: { serviceUserId: string }) {
  const can = useAuthStore((s) => s.can)
  const canRead =
    can('service_users.inventory.read') || can('service_users.read')
  const canCreate =
    can('service_users.inventory.create') || can('service_users.update')
  const canUpdate =
    can('service_users.inventory.update') || can('service_users.update')
  const canDelete =
    can('service_users.inventory.delete') || can('service_users.delete')

  const [rows, setRows] = React.useState<ServiceUserInventoryItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [listError, setListError] = React.useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [form, setForm] = React.useState<FormState>(() => emptyForm())
  const [formError, setFormError] = React.useState<string | null>(null)
  const [formSaving, setFormSaving] = React.useState(false)
  const photoInputRef = React.useRef<HTMLInputElement>(null)
  const [photoFile, setPhotoFile] = React.useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null)
  const signatureRef = React.useRef<InventorySignaturePadRef>(null)

  React.useEffect(() => {
    return () => {
      if (photoPreview?.startsWith('blob:')) URL.revokeObjectURL(photoPreview)
    }
  }, [photoPreview])

  const [deleteId, setDeleteId] = React.useState<string | null>(null)
  const [deleteSaving, setDeleteSaving] = React.useState(false)

  const load = React.useCallback(async () => {
    if (!canRead) {
      setRows([])
      setLoading(false)
      return
    }
    setLoading(true)
    setListError(null)
    try {
      const data = await listServiceUserInventory(serviceUserId)
      setRows(data)
    } catch (e) {
      setRows([])
      setListError(e instanceof ApiError ? e.message : 'Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }, [canRead, serviceUserId])

  React.useEffect(() => {
    void load()
  }, [load])

  function openAdd() {
    setEditingId(null)
    setForm(emptyForm())
    setFormError(null)
    setPhotoFile(null)
    setPhotoPreview(null)
    window.setTimeout(() => signatureRef.current?.clear(), 0)
    setDialogOpen(true)
  }

  function openEdit(item: ServiceUserInventoryItem) {
    setEditingId(item.id)
    setForm(itemToForm(item))
    setFormError(null)
    setPhotoFile(null)
    setPhotoPreview(resolveMediaUrl(item.itemPhotoUrl))
    window.setTimeout(() => signatureRef.current?.clear(), 0)
    setDialogOpen(true)
  }

  function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
      setFormError('Photo must be JPEG, PNG, or WebP.')
      return
    }
    setPhotoFile(f)
    setPhotoPreview(URL.createObjectURL(f))
    setFormError(null)
  }

  async function saveForm() {
    setFormError(null)
    const itemName = form.itemName.trim()
    const description = form.description.trim()
    const location = form.location.trim()
    if (!itemName) {
      setFormError('Item name is required.')
      toastError('Cannot save item', 'Item name is required.')
      return
    }
    if (!description) {
      setFormError('Item description is required.')
      toastError('Cannot save item', 'Item description is required.')
      return
    }
    if (!location) {
      setFormError('Location is required.')
      toastError('Cannot save item', 'Location is required.')
      return
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.dateDeposited.trim())) {
      setFormError('Date deposited must be a valid calendar date.')
      toastError('Cannot save item', 'Date deposited must be a valid calendar date.')
      return
    }
    const qty = Number.parseInt(form.quantity, 10)
    if (!Number.isFinite(qty) || qty < 1) {
      setFormError('Quantity must be at least 1.')
      toastError('Cannot save item', 'Quantity must be at least 1.')
      return
    }

    const witnessSignatureDataUrl = signatureRef.current?.getDataUrl() ?? null

    setFormSaving(true)
    try {
      const baseBody = {
        itemName,
        quantity: qty,
        itemValue: form.itemValue.trim() || undefined,
        description,
        location,
        dateDeposited: form.dateDeposited.trim(),
        ...(witnessSignatureDataUrl ? { witnessSignatureDataUrl } : {}),
      }

      let itemId = editingId
      if (editingId) {
        await updateServiceUserInventoryItem(serviceUserId, editingId, baseBody)
      } else {
        const created = await createServiceUserInventoryItem(serviceUserId, baseBody)
        itemId = created.id
      }
      if (photoFile && itemId) {
        await uploadServiceUserInventoryItemPhoto(serviceUserId, itemId, photoFile)
      }
      setDialogOpen(false)
      await load()
      toastSuccess(editingId ? 'Inventory updated' : 'Inventory item added', 'Personal inventory has been saved.')
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Save failed')
      toastApiError(e, 'Save failed')
    } finally {
      setFormSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteId) return
    setDeleteSaving(true)
    try {
      await deleteServiceUserInventoryItem(serviceUserId, deleteId)
      setDeleteId(null)
      await load()
      toastSuccess('Item removed', 'The inventory item was deleted.')
    } catch (e) {
      setListError(e instanceof ApiError ? e.message : 'Delete failed')
      toastApiError(e, 'Delete failed')
    } finally {
      setDeleteSaving(false)
    }
  }

  if (!canRead) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 px-6 py-12 text-center text-sm text-muted-foreground">
        You do not have permission to view personal inventory. Ask an administrator to grant{' '}
        <span className="font-mono text-xs">service_users.read</span> or{' '}
        <span className="font-mono text-xs">service_users.inventory.read</span>.
      </div>
    )
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-sky-600 dark:text-sky-400">Personal Inventory</h2>
        {canCreate && (
          <Button type="button" size="sm" className="gap-1 bg-sky-600 text-white hover:bg-sky-700" onClick={openAdd}>
            <Plus className="h-4 w-4" />
            Add inventory item
          </Button>
        )}
      </div>

      {listError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {listError}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No inventory items recorded yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Photo</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Item</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Qty</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Value</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Location</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Deposited</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 align-middle">
                    {row.itemPhotoUrl ? (
                      <img
                        src={resolveMediaUrl(row.itemPhotoUrl) ?? ''}
                        alt=""
                        className="h-12 w-12 rounded border object-cover"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="max-w-[14rem] px-3 py-2 align-middle">
                    <div className="font-medium text-foreground">{row.itemName}</div>
                    <div className="line-clamp-2 text-xs text-muted-foreground">{row.description}</div>
                  </td>
                  <td className="px-3 py-2 align-middle">{row.quantity}</td>
                  <td className="px-3 py-2 align-middle">{row.itemValue ?? '—'}</td>
                  <td className="max-w-[10rem] px-3 py-2 align-middle">{row.location}</td>
                  <td className="whitespace-nowrap px-3 py-2 align-middle">{row.dateDeposited}</td>
                  <td className="px-3 py-2 text-right align-middle">
                    <div className="inline-flex gap-1">
                      {canUpdate && (
                        <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}>
                          <Pencil className="h-3.5 w-3.5" />
                          <span className="sr-only">Edit</span>
                        </Button>
                      )}
                      {canDelete && (
                        <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => setDeleteId(row.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent size="lg" className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sky-600">{editingId ? 'Edit Inventory Item' : 'Add Inventory Item'}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <div className="grid gap-3 sm:grid-cols-12">
              <div className="sm:col-span-5">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Item name <span className="text-destructive">*</span>
                </label>
                <Input value={form.itemName} onChange={(e) => setForm((f) => ({ ...f, itemName: e.target.value }))} />
              </div>
              <div className="sm:col-span-3">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Quantity</label>
                <Input
                  inputMode="numeric"
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-4">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Item value</label>
                <Input value={form.itemValue} onChange={(e) => setForm((f) => ({ ...f, itemValue: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Item description <span className="text-destructive">*</span>
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={4}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Location <span className="text-destructive">*</span>
                </label>
                <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
              </div>
              <div className="shrink-0">
                <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onPickPhoto} />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0 border-destructive text-destructive hover:bg-destructive/10"
                  title="Upload item photo"
                  onClick={() => photoInputRef.current?.click()}
                >
                  <Camera className="h-5 w-5" />
                </Button>
              </div>
            </div>
            {photoPreview && (
              <div className="flex items-center gap-3">
                <img src={photoPreview} alt="" className="h-16 w-16 rounded border object-cover" />
                <Button type="button" variant="ghost" size="sm" onClick={() => { setPhotoFile(null); setPhotoPreview(null) }}>
                  Remove photo
                </Button>
              </div>
            )}
            <div className="max-w-xs">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Date deposited <span className="text-destructive">*</span>
              </label>
              <Input type="date" value={form.dateDeposited} onChange={(e) => setForm((f) => ({ ...f, dateDeposited: e.target.value }))} />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">Witness signature</span>
                <button
                  type="button"
                  className="text-xs font-medium text-destructive hover:underline"
                  onClick={() => signatureRef.current?.clear()}
                >
                  Clear
                </button>
              </div>
              <InventorySignaturePad ref={signatureRef} />
            </div>
          </DialogBody>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={formSaving}>
              Close
            </Button>
            <Button
              type="button"
              className="bg-sky-600 text-white hover:bg-sky-700"
              disabled={formSaving || (editingId ? !canUpdate : !canCreate)}
              onClick={() => void saveForm()}
            >
              {formSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove inventory item?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone from the list view.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()} disabled={deleteSaving}>
              {deleteSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
