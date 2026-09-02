import { describe, expect, it } from 'vitest'
import {
  isPeepSnapshotComplete,
  normalizePeepSnapshot,
} from '@/features/service-users/initial-assessment/utils/peep-snapshot'
import {
  hasStructuredAssessmentPanel,
  IA_ASSESSMENT_TOOL_REGISTRY,
  resolveAssessmentPanelId,
} from '@/features/service-users/assessments/assessment-tool-registry'
import { emptyToolCaptureState, validateToolCapture } from '@/features/service-users/assessments/utils/assessment-snapshot.util'

describe('IA assessment tool registry (Phase 3)', () => {
  it('registers peep on tab 19 with a structured panel, not generic', () => {
    const peep = IA_ASSESSMENT_TOOL_REGISTRY.find((tool) => tool.assessmentKey === 'peep')
    expect(peep).toEqual(
      expect.objectContaining({ holisticTabId: 19, snapshotKey: 'peep', panelId: 'peep' }),
    )
    expect(resolveAssessmentPanelId('peep')).toBe('peep')
    expect(hasStructuredAssessmentPanel('peep')).toBe(true)
  })

  it('registers equipment-selection on tab 6 using existing worksheet snapshot keys', () => {
    const equipment = IA_ASSESSMENT_TOOL_REGISTRY.find(
      (tool) => tool.assessmentKey === 'equipment-selection',
    )
    expect(equipment).toEqual(
      expect.objectContaining({
        holisticTabId: 6,
        snapshotKey: 'equipmentSelection',
        panelId: 'equipment-selection',
      }),
    )
    expect(hasStructuredAssessmentPanel('equipment-selection')).toBe(true)
  })

  it('does not add assessment keys for Bed Rails IA, Infection, or Fire Safety', () => {
    const keys = IA_ASSESSMENT_TOOL_REGISTRY.map((tool) => tool.assessmentKey)
    expect(keys).not.toContain('bed-rail-assessment')
    expect(keys).not.toContain('infection')
    expect(keys).not.toContain('fire-safety')
    expect(IA_ASSESSMENT_TOOL_REGISTRY.some((tool) => tool.holisticTabId === 20)).toBe(false)
    expect(IA_ASSESSMENT_TOOL_REGISTRY.some((tool) => tool.holisticTabId === 21)).toBe(false)
    expect(IA_ASSESSMENT_TOOL_REGISTRY.some((tool) => tool.holisticTabId === 22)).toBe(false)
  })

  it('loads an existing PEEP snapshot into capture state and validates completeness', () => {
    const state = emptyToolCaptureState({
      peep: { canSelfEvacuate: true },
    })
    expect(state.peep.canSelfEvacuate).toBe(true)
    expect(validateToolCapture('peep', null, state)).toBeNull()
    expect(validateToolCapture('peep', null, emptyToolCaptureState({ peep: {} }))).toMatch(/evacuation/i)
  })

  it('promotes equipment capture when risk level and selected equipment are present', () => {
    const complete = emptyToolCaptureState({
      equipmentSelection: {
        selectedRiskLevel: 'Low risk',
        selectedEquipment: 'Standard foam mattress — no additional pressure equipment',
      },
    })
    expect(validateToolCapture('equipment-selection', null, complete)).toBeNull()
    expect(validateToolCapture('equipment-selection', null, emptyToolCaptureState({}))).toMatch(
      /equipment/i,
    )
  })

  it('reads nested therapyAideMemoire when the promotion snapshot is missing a top-level key', () => {
    const nested = {
      choking: { checked: false },
      chestInfections: { checked: false },
      speechConcern: { checked: false },
      mobilityChange: { checked: false },
      selfCareChange: { checked: false },
      carePackageConcern: { checked: false },
      furtherReferralRequired: false,
    }
    const fromNested = emptyToolCaptureState({ painAssessment: { therapyAideMemoire: nested } })
    const fromTopLevel = emptyToolCaptureState({ therapyAideMemoire: nested })
    expect(fromNested.therapyAideMemoire.furtherReferralRequired).toBe(false)
    expect(fromTopLevel.therapyAideMemoire.furtherReferralRequired).toBe(false)
  })
})

describe('PEEP snapshot completeness', () => {
  it('treats self-evacuate Yes as complete and assisted No as incomplete until children are filled', () => {
    expect(isPeepSnapshotComplete({ canSelfEvacuate: true })).toBe(true)
    expect(isPeepSnapshotComplete({ canSelfEvacuate: false })).toBe(false)
    expect(
      isPeepSnapshotComplete({
        canSelfEvacuate: false,
        peepAssistanceRequired: 'Two staff',
        peepEquipmentRequired: 'Evac chair',
        peepEvacuationProcedure: 'Wait at refuge then evacuate',
        peepAlarmWarningConsiderations: 'Visual alarm',
        peepRefugeLocation: 'Landing',
        peepDiscussedWithPerson: true,
        peepReviewDate: '2026-10-01',
      }),
    ).toBe(true)
    expect(normalizePeepSnapshot({ canSelfEvacuate: true }).canSelfEvacuate).toBe(true)
  })
})
