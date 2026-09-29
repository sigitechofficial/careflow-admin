import { describe, expect, it } from 'vitest'
import { mergeDomLateVisitZoneAlerts } from './dom-care-settings-defaults'

const HOUNSLOW = { id: 'sa-hou', name: 'Allfor Care Hounslow', location: { name: 'Allfor Care Hounslow' } }
const HARROW = { id: 'sa-har', name: 'Allfor Care Harrow', location: { name: 'Allfor Care Harrow' } }

describe('mergeDomLateVisitZoneAlerts', () => {
  it('lists only live branches and keeps saved recipients; sample names are dropped', () => {
    const out = mergeDomLateVisitZoneAlerts(
      [
        {
          zoneKey: 'renamed',
          label: 'Old name',
          scheduleAreaId: 'sa-hou',
          emailEmployeeIds: ['e1'],
          notificationEmployeeIds: [],
        },
        {
          zoneKey: 'croydon-croydon-2',
          label: 'Croydon - Croydon 2',
          scheduleAreaId: null,
          emailEmployeeIds: ['e2'],
          notificationEmployeeIds: [],
        },
      ],
      [HOUNSLOW, HARROW],
    )
    expect(out.map(z => z.label)).toEqual(['Allfor Care Harrow', 'Allfor Care Hounslow'])
    expect(out.find(z => z.scheduleAreaId === 'sa-hou')?.emailEmployeeIds).toEqual(['e1'])
    expect(out.find(z => z.scheduleAreaId === 'sa-har')?.emailEmployeeIds).toEqual([])
    expect(JSON.stringify(out)).not.toContain('Croydon')
  })

  it('falls back to the saved (API branch-derived) rows while branches are loading', () => {
    const saved = [
      {
        zoneKey: 'allfor-care-harrow',
        label: 'Allfor Care Harrow',
        scheduleAreaId: 'sa-har',
        emailEmployeeIds: [],
        notificationEmployeeIds: [],
      },
    ]
    expect(mergeDomLateVisitZoneAlerts(saved, [])).toEqual(saved)
  })
})
