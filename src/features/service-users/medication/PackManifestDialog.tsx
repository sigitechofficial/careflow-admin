import * as React from 'react'
import { Loader2, Printer, Download } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { toastApiError } from '@/shared/lib/toast'
import {
  useMedicationPackManifest,
  useDownloadPackManifestPdf,
} from '@/features/service-users/hooks/useMedicationPackLifecycle'

const PACK_TYPE_LABEL: Record<string, string> = {
  BLISTER: 'Blister pack',
  DOSSETTE: 'Dossette box',
  NOMAD: 'Nomad tray',
  OTHER: 'Other',
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function PackManifestDialog({
  open,
  onOpenChange,
  serviceUserId,
  packId,
  serviceUserName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceUserId: string
  packId: string | null
  serviceUserName?: string
}) {
  const manifestQuery = useMedicationPackManifest(serviceUserId, packId, open)
  const manifest = manifestQuery.data
  const downloadPdf = useDownloadPackManifestPdf(serviceUserId)

  const handleDownload = async () => {
    if (!packId) return
    try {
      const blob = await downloadPdf.mutateAsync(packId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mca-contents-${packId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      toastApiError(e, 'Could not download the PDF')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            MCA contents record
            {manifest && (
              <Badge variant={manifest.source === 'PUBLISHED' ? 'success' : 'warning'} size="sm">
                {manifest.source === 'PUBLISHED' ? 'Published snapshot' : 'Live (unpublished)'}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          {manifestQuery.isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading contents…
            </div>
          )}
          {manifestQuery.error instanceof Error && (
            <p className="text-sm text-destructive">{manifestQuery.error.message}</p>
          )}
          {manifest && (
            <div className="space-y-4 text-sm" id="pack-manifest-print">
              <div className="rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-base font-semibold">{manifest.packName}</h3>
                  <span className="text-muted-foreground">
                    {PACK_TYPE_LABEL[manifest.packType] ?? manifest.packType} · Cycle {manifest.cycleNumber}
                  </span>
                </div>
                <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
                  <Field label="Service user" value={serviceUserName ?? '—'} />
                  <Field label="NHS number" value={manifest.nhsNumber ?? '—'} />
                  <Field label="Pharmacy" value={manifest.pharmacyName ?? '—'} />
                  <Field label="Pharmacy phone" value={manifest.pharmacyPhone ?? '—'} />
                  <Field label="GP" value={manifest.gpName ?? '—'} />
                  <Field label="GP surgery" value={manifest.gpSurgery ?? '—'} />
                  <Field label="Start date" value={formatDate(manifest.startDate)} />
                  <Field label="Review / end date" value={formatDate(manifest.endDate)} />
                  <Field label="Published" value={formatDate(manifest.publishedAt)} />
                </dl>
              </div>

              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-left">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Medicine</th>
                      <th className="px-3 py-2 font-medium">Strength</th>
                      <th className="px-3 py-2 font-medium">Dose</th>
                      <th className="px-3 py-2 font-medium">Route</th>
                      <th className="px-3 py-2 font-medium">Round(s)</th>
                      <th className="px-3 py-2 font-medium">Instructions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {manifest.lines.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">
                          No medicines linked to this pack yet.
                        </td>
                      </tr>
                    )}
                    {manifest.lines.map(line => (
                      <tr key={line.id}>
                        <td className="px-3 py-2 font-medium">{line.medicationName}</td>
                        <td className="px-3 py-2">{line.strength ?? '—'}</td>
                        <td className="px-3 py-2">{line.dose ?? '—'}</td>
                        <td className="px-3 py-2">{line.routeName ?? '—'}</td>
                        <td className="px-3 py-2">{line.roundLabels ?? '—'}</td>
                        <td className="px-3 py-2 text-muted-foreground">{line.instructions ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-muted-foreground">
                This document must be kept with the medication. CQC inspectors check this record.
              </p>
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={!manifest || downloadPdf.isPending}
            onClick={() => void handleDownload()}
          >
            {downloadPdf.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            PDF
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            disabled={!manifest}
            onClick={() => window.print()}
          >
            <Printer className="h-3.5 w-3.5" /> Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-dashed border-border/60 py-0.5 sm:border-none">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-right">{value}</dd>
    </div>
  )
}
