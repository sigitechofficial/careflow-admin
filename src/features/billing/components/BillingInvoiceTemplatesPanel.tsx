import * as React from 'react'
import { Eye, FileSpreadsheet, Pencil, Plus, Search, ShieldCheck, Trash2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { ContentSectionHeader } from '@/shared/ui/content-section'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Badge } from '@/shared/ui/badge'
import { InvoiceTemplateFormDialog } from '@/features/billing/components/InvoiceTemplateFormDialog'
import { InvoiceTemplateValidateDialog } from '@/features/billing/components/InvoiceTemplateValidateDialog'
import { InvoiceTemplatePreviewDialog } from '@/features/billing/components/InvoiceTemplatePreviewDialog'
import { RateCardStatusBadge } from '@/features/billing/components/BillingStatusBadge'
import {
  useDeleteInvoiceTemplate,
  useInvoiceTemplates,
  useInvoiceTemplatesSummary,
} from '@/features/billing/hooks/useInvoiceTemplates'
import {
  formatInvoiceTemplateScope,
  type InvoiceTemplate,
} from '@/features/billing/types/invoice-templates.types'
import { useAuthStore } from '@/features/auth/store'

export function BillingInvoiceTemplatesPanel() {
  const canManage = useAuthStore(s => s.can('billing.invoice_templates.manage' as never))
  const canRead = useAuthStore(s => s.can('billing.invoice_templates.read' as never))
  const [search, setSearch] = React.useState('')
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [validateOpen, setValidateOpen] = React.useState(false)
  const [previewOpen, setPreviewOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<InvoiceTemplate | null>(null)
  const [validating, setValidating] = React.useState<InvoiceTemplate | null>(null)
  const [previewing, setPreviewing] = React.useState<InvoiceTemplate | null>(null)

  const listQuery = useInvoiceTemplates({ search: search.trim() || undefined })
  const summaryQuery = useInvoiceTemplatesSummary()
  const deleteMutation = useDeleteInvoiceTemplate()

  const rows = listQuery.data ?? []
  const summary = summaryQuery.data

  const error =
    listQuery.error instanceof ApiError
      ? listQuery.error.message
      : listQuery.error
        ? 'Could not load invoice templates.'
        : null

  const openCreate = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const openEdit = (template: InvoiceTemplate) => {
    setEditing(template)
    setDialogOpen(true)
  }

  const openValidate = (template: InvoiceTemplate) => {
    setValidating(template)
    setValidateOpen(true)
  }

  const openPreview = (template: InvoiceTemplate) => {
    setPreviewing(template)
    setPreviewOpen(true)
  }

  const onDelete = async (template: InvoiceTemplate) => {
    if (!canManage) return
    if (!window.confirm(`Delete invoice template "${template.name}"?`)) return
    try {
      await deleteMutation.mutateAsync(template.id)
    } catch {
      // silent
    }
  }

  if (!canRead) {
    return (
      <p className="text-sm text-muted-foreground">
        You do not have permission to view invoice templates. Required:{' '}
        <span className="font-mono text-xs">billing.invoice_templates.read</span>.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <ContentSectionHeader
        title="Funder invoice templates"
        description="Separate billing calculation from invoice presentation. Each profile controls format, grouping, delivery, and required field validation."
        action={
          canManage ? (
            <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
              New template profile
            </Button>
          ) : undefined
        }
      />

      {summary ? (
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" size="md">
            {summary.total} templates
          </Badge>
          <Badge variant="success" size="md">
            {summary.active} active
          </Badge>
          {!summary.hasOrganisationDefault ? (
            <Badge variant="warning" size="md">
              No organisation default
            </Badge>
          ) : null}
          {summary.fundersMissingDefaultTemplate > 0 ? (
            <Badge variant="destructive" size="md">
              {summary.fundersMissingDefaultTemplate} funders without default
            </Badge>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        <strong className="text-foreground">Flow:</strong> visit completed → charge calculated → invoice lines created →
        funder identified → template selected → fields validated → PDF / Excel / CSV / API export generated.
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="Search templates, funders, grouping…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {listQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading invoice templates…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No invoice templates yet.</p>
      ) : (
        <div className="grid gap-4">
          {rows.map(tpl => (
            <div key={tpl.id} className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-foreground">{tpl.name}</h3>
                    <Badge variant="outline" size="sm">
                      {tpl.templateType}
                    </Badge>
                    <RateCardStatusBadge status={tpl.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatInvoiceTemplateScope(tpl)} · v{tpl.version} · {tpl.code}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => openPreview(tpl)}>
                    <Eye className="mr-1 h-3.5 w-3.5" />
                    Preview design
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => openValidate(tpl)}>
                    <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                    Validate
                  </Button>
                  {canManage ? (
                    <>
                      <Button type="button" variant="outline" size="sm" onClick={() => openEdit(tpl)}>
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => void onDelete(tpl)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Delivery</p>
                  <p>{tpl.deliveryMethod ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Grouping</p>
                  <p>{tpl.groupingRule ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Required fields</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {tpl.fields.filter(f => f.isRequired).length ? (
                      tpl.fields
                        .filter(f => f.isRequired)
                        .map(f => (
                          <Badge key={f.systemFieldKey} variant="muted" size="sm">
                            {f.label}
                          </Badge>
                        ))
                    ) : (
                      <span className="text-muted-foreground">None</span>
                    )}
                  </div>
                </div>
              </div>

              {tpl.fields.length > 0 ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  {tpl.fields.length} mapped field{tpl.fields.length === 1 ? '' : 's'}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Template selection priority: funding contract override → funder default → matched scope → organisation default.
        Missing template or validation failure blocks export with an exception.
      </p>

      <InvoiceTemplateFormDialog open={dialogOpen} onOpenChange={setDialogOpen} template={editing} />
      <InvoiceTemplateValidateDialog open={validateOpen} onOpenChange={setValidateOpen} template={validating} />
      <InvoiceTemplatePreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} template={previewing} />
    </div>
  )
}
