import { create } from 'zustand'

/** API error codes for carer weekly hours that open a dialog instead of a toast. */
export const CARER_NO_CONTRACTED_HOURS_CODE = 'CARER_NO_CONTRACTED_HOURS'
export const CARER_OVER_MAX_CODE = 'CARER_OVER_MAX_WEEKLY_HOURS'

export type CarerHoursStop = {
  code: typeof CARER_NO_CONTRACTED_HOURS_CODE | typeof CARER_OVER_MAX_CODE
  message: string
  /** The carer it is about (links to their working hours). */
  employeeId?: string
}

type CarerHoursStopState = {
  stop: CarerHoursStop | null
  show: (stop: CarerHoursStop) => void
  close: () => void
}

export const useCarerHoursStopStore = create<CarerHoursStopState>(set => ({
  stop: null,
  show: stop => set({ stop }),
  close: () => set({ stop: null }),
}))
