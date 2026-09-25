import {
  dueTimeFallsInHmWindow,
  dueTimeOutsideAllVisitWindows,
  filterCompartmentsForVisitWindow,
  marRowMatchesVisitWindow,
} from './visit-medication-window.util'

describe('visit-medication-window.util', () => {
  it('matches 09:30 only to the 09:00–10:00 visit, not 06:00–08:00', () => {
    expect(dueTimeFallsInHmWindow('09:30', '06:00', '08:00')).toBe(false)
    expect(dueTimeFallsInHmWindow('09:30', '09:00', '10:00')).toBe(true)
  })

  it('filters MAR rows by visit window', () => {
    expect(marRowMatchesVisitWindow({ dueTime: '09:30' }, '09:00', '10:00')).toBe(true)
    expect(marRowMatchesVisitWindow({ dueTime: '09:30' }, '06:00', '08:00')).toBe(false)
  })

  it('filters compartments by visit window; empty window yields none', () => {
    const comps = [{ dueTime: '07:15' }, { dueTime: '09:30' }]
    expect(filterCompartmentsForVisitWindow(comps, '06:00', '08:00').map(c => c.dueTime)).toEqual([
      '07:15',
    ])
    expect(filterCompartmentsForVisitWindow(comps, null, null)).toEqual([])
  })

  it('flags due times outside all visit windows', () => {
    const windows = [
      { start: '06:00', end: '08:00' },
      { start: '09:00', end: '10:00' },
    ]
    expect(dueTimeOutsideAllVisitWindows('09:30', windows)).toBe(false)
    expect(dueTimeOutsideAllVisitWindows('08:30', windows)).toBe(true)
    expect(dueTimeOutsideAllVisitWindows('09:30', [])).toBe(true)
    expect(dueTimeOutsideAllVisitWindows(null, windows)).toBe(false)
  })
})
