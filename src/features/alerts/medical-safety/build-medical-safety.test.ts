import { describe, expect, it } from 'vitest'
import { buildMedicalSafetySnapshot } from '@/features/alerts/medical-safety/build-medical-safety'
import type { ServiceUserAllergyRow } from '@/features/service-users/api/service-users.api'
import type { MedicationAllergyRow } from '@/features/service-users/api/medication-allergies.api'

function allergy(partial: Partial<ServiceUserAllergyRow> & { allergyName: string }): ServiceUserAllergyRow {
  return {
    id: partial.id ?? 'a1',
    serviceUserId: 'su-1',
    allergyCatalogId: null,
    allergyName: partial.allergyName,
    comment: partial.comment ?? '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

function medAllergy(
  partial: Partial<MedicationAllergyRow> & { allergyName: string },
): MedicationAllergyRow {
  return {
    id: partial.id ?? 'ma1',
    serviceUserId: 'su-1',
    allergyName: partial.allergyName,
    reaction: partial.reaction ?? null,
    severity: partial.severity ?? null,
    notes: partial.notes ?? null,
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('buildMedicalSafetySnapshot', () => {
  it('surfaces allergies and only critical anaphylaxis as immediate', () => {
    const snap = buildMedicalSafetySnapshot({
      serviceUserId: 'su-1',
      profile: null,
      allergies: [
        allergy({ allergyName: 'Penicillin', comment: 'Anaphylaxis — carry EpiPen' }),
        allergy({ id: 'a2', allergyName: 'Latex', comment: '' }),
      ],
      flash: null,
      documents: null,
      iaRisks: [],
      bodyMapAlerts: [],
    })
    expect(snap.allergies).toHaveLength(2)
    expect(snap.allergies[0]?.severity).toBe('CRITICAL')
    expect(snap.allergies[0]?.kind).toBe('clinical')
    expect(snap.allergies[1]?.severity).toBe('MEDIUM')
    expect(snap.immediate.some((i) => i.title === 'Penicillin')).toBe(true)
    expect(snap.immediate.some((i) => i.title === 'Latex')).toBe(false)
    expect(snap.conditionsUnavailable).toBe(true)
    expect(snap.communicationLimited).toBe(true)
  })

  it('maps structured medical conditions when SoT is available', () => {
    const snap = buildMedicalSafetySnapshot({
      serviceUserId: 'su-1',
      profile: null,
      allergies: [],
      flash: null,
      documents: null,
      iaRisks: [],
      bodyMapAlerts: [],
      medicalConditions: [
        {
          id: 'c1',
          status: 'ACTIVE',
          notes: 'Diet controlled',
          onsetDate: '2020-01-01',
          updatedAt: '2026-01-01T00:00:00.000Z',
          condition: { name: 'Diabetes', category: 'ENDOCRINE_METABOLIC' },
        },
        {
          id: 'c2',
          status: 'DISCONTINUED',
          condition: { name: 'Old condition' },
        },
      ],
    })
    expect(snap.conditionsUnavailable).toBe(false)
    expect(snap.conditions).toHaveLength(1)
    expect(snap.conditions[0]?.title).toBe('Diabetes')
    expect(snap.conditions[0]?.kind).toBe('clinical')
  })

  it('surfaces medication allergies without duplicating general allergies', () => {
    const snap = buildMedicalSafetySnapshot({
      serviceUserId: 'su-1',
      profile: null,
      allergies: [allergy({ allergyName: 'Penicillin', comment: '' })],
      medicationAllergies: [
        medAllergy({ allergyName: 'Penicillin', severity: 'HIGH' }),
        medAllergy({
          id: 'ma2',
          allergyName: 'Aspirin',
          reaction: 'Anaphylaxis',
          severity: 'CRITICAL',
        }),
      ],
      flash: null,
      documents: null,
      iaRisks: [],
      bodyMapAlerts: [],
    })
    expect(snap.allergies.map((a) => a.title)).toEqual(['Penicillin', 'Aspirin'])
    expect(snap.allergies.find((a) => a.title === 'Aspirin')?.sourceLabel).toBe(
      'Medication allergies',
    )
    expect(snap.immediate.some((i) => i.title === 'Aspirin')).toBe(true)
    expect(snap.immediate.every((i) => i.kind === 'clinical')).toBe(true)
  })

  it('omits flash from immediate when requested', () => {
    const snap = buildMedicalSafetySnapshot({
      serviceUserId: 'su-1',
      profile: null,
      allergies: [],
      flash: {
        id: 'f1',
        serviceUserId: 'su-1',
        message: 'Do not leave alone overnight',
        displayUntil: '2030-01-01T00:00:00.000Z',
        status: 'ACTIVE',
        isCurrent: true,
        clearedAt: null,
        clearReason: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        createdBy: null,
        clearedBy: null,
      },
      documents: null,
      iaRisks: [],
      bodyMapAlerts: [],
      omitFlashFromImmediate: true,
    })
    expect(snap.immediate.some((i) => i.title === 'Urgent flash message')).toBe(false)
  })

  it('surfaces flash, DNACPR, and high risk without creating Alert-shaped data', () => {
    const snap = buildMedicalSafetySnapshot({
      serviceUserId: 'su-1',
      profile: {
        id: 'su-1',
        riskLevel: { id: 'r1', name: 'High', code: 'HIGH', color: null },
      } as never,
      allergies: [],
      flash: {
        id: 'f1',
        serviceUserId: 'su-1',
        message: 'Do not leave alone overnight',
        displayUntil: '2030-01-01T00:00:00.000Z',
        status: 'ACTIVE',
        isCurrent: true,
        clearedAt: null,
        clearReason: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        createdBy: null,
        clearedBy: null,
      },
      documents: {
        legal: {
          id: 'l1',
          serviceUserId: 'su-1',
          dnacprInPlace: true,
          dnacprStatusConfirmation: 'IN_PLACE',
          dnacprPhysicalLocation: 'Fridge folder',
          dnacprCertificateUrl: null,
          dnacprStartDate: null,
          lpaStatusConfirmation: 'NONE',
          lpaHealthCertificateUrl: null,
          lpaFinanceCertificateUrl: null,
          updatedAt: null,
        },
        dols: [],
      },
      iaRisks: [
        {
          id: 'risk-1',
          submissionId: 'sub-1',
          serviceUserId: 'su-1',
          riskType: 'FALLS',
          description: 'History of falls',
          likelihood: 'HIGH',
          severity: 'HIGH',
          riskLevel: 'HIGH',
          controlMeasures: null,
          residualRisk: null,
          reviewDate: null,
          status: 'OPEN',
          sourceSectionNumber: 1,
          sourceQuestionId: null,
          sourceQuestionText: null,
          responsiblePersonId: null,
          autoGenerated: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      bodyMapAlerts: [],
    })
    expect(snap.immediate.some((i) => i.title === 'Urgent flash message')).toBe(true)
    expect(snap.safetyRisk.some((i) => i.title === 'DNACPR in place')).toBe(true)
    expect(snap.safetyRisk.some((i) => i.title.includes('Falls'))).toBe(true)
    expect(snap.immediate.every((i) => !i.id.startsWith('alert-row'))).toBe(true)
  })
})
