import { create } from 'zustand'

/**
 * Hours requests the signed-in user just sent for manager approval (the API lists them in
 * `meta.hoursRequestIds`). A manager is offered "Approve now" for them.
 */
type SentHoursRequestsState = {
  ids: string[]
  offer: (ids: string[]) => void
  /** Done with these (approved or left for a manager); any sent since stay offered. */
  dismiss: (ids: string[]) => void
}

export const useSentHoursRequestsStore = create<SentHoursRequestsState>(set => ({
  ids: [],
  offer: ids => set(s => ({ ids: [...new Set([...s.ids, ...ids])] })),
  dismiss: ids => set(s => ({ ids: s.ids.filter(id => !ids.includes(id)) })),
}))
