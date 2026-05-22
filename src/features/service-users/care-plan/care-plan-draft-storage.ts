export type CarePlanDraftValues = Record<string, string | boolean>

function draftKey(serviceUserId: string, formId: string) {
  return `care-plan-draft:${serviceUserId}:${formId}`
}

export function loadCarePlanDraft(serviceUserId: string, formId: string): CarePlanDraftValues {
  try {
    const raw = sessionStorage.getItem(draftKey(serviceUserId, formId))
    if (!raw) return {}
    const parsed = JSON.parse(raw) as CarePlanDraftValues
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function saveCarePlanDraft(
  serviceUserId: string,
  formId: string,
  values: CarePlanDraftValues,
): void {
  sessionStorage.setItem(draftKey(serviceUserId, formId), JSON.stringify(values))
}
