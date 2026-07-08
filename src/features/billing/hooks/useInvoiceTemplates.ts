import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createInvoiceTemplate,
  deleteInvoiceTemplate,
  fetchInvoiceTemplate,
  fetchInvoiceTemplateSystemFields,
  fetchInvoiceTemplates,
  fetchInvoiceTemplatesSummary,
  resolveServiceUserInvoiceTemplate,
  updateInvoiceTemplate,
  validateInvoiceTemplate,
} from '@/features/billing/api/invoice-templates.api'
import { billingKeys } from '@/features/billing/keys'
import type { InvoiceTemplateInput } from '@/features/billing/types/invoice-templates.types'

export function useInvoiceTemplates(filters?: {
  search?: string
  status?: string
  templateType?: string
  funderId?: string
}) {
  return useQuery({
    queryKey: billingKeys.invoiceTemplates(filters),
    queryFn: () => fetchInvoiceTemplates(filters),
  })
}

export function useInvoiceTemplate(id: string | null, enabled = true) {
  return useQuery({
    queryKey: billingKeys.invoiceTemplate(id ?? ''),
    queryFn: () => fetchInvoiceTemplate(id!),
    enabled: enabled && !!id,
  })
}

export function useInvoiceTemplateSystemFields(enabled = true) {
  return useQuery({
    queryKey: billingKeys.invoiceTemplateSystemFields(),
    queryFn: fetchInvoiceTemplateSystemFields,
    enabled,
    staleTime: 60_000,
  })
}

export function useInvoiceTemplatesSummary() {
  return useQuery({
    queryKey: billingKeys.invoiceTemplatesSummary(),
    queryFn: fetchInvoiceTemplatesSummary,
  })
}

export function useCreateInvoiceTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: InvoiceTemplateInput) => createInvoiceTemplate(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: billingKeys.all })
    },
  })
}

export function useUpdateInvoiceTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<InvoiceTemplateInput> }) =>
      updateInvoiceTemplate(id, body),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: billingKeys.all })
      void qc.invalidateQueries({ queryKey: billingKeys.invoiceTemplate(vars.id) })
    },
  })
}

export function useDeleteInvoiceTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteInvoiceTemplate(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: billingKeys.all })
    },
  })
}

export function useResolveServiceUserInvoiceTemplate(
  serviceUserId: string | null,
  fundingId?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: billingKeys.invoiceTemplateResolve(serviceUserId ?? '', fundingId),
    queryFn: () => resolveServiceUserInvoiceTemplate(serviceUserId!, fundingId),
    enabled: enabled && !!serviceUserId,
  })
}

export function useValidateInvoiceTemplate() {
  return useMutation({
    mutationFn: ({
      templateId,
      serviceUserId,
      fundingId,
    }: {
      templateId: string
      serviceUserId: string
      fundingId?: string
    }) => validateInvoiceTemplate(templateId, { serviceUserId, fundingId }),
  })
}
