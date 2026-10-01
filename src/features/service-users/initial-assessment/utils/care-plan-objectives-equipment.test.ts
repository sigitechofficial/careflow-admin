import { describe, expect, it } from 'vitest'
import { detectCarePlanEquipmentInUse } from '@/features/service-users/initial-assessment/utils/care-plan-objectives'

describe('detectCarePlanEquipmentInUse', () => {
  it('returns nothing when no equipment is recorded', () => {
    expect(detectCarePlanEquipmentInUse({})).toEqual({})
  })

  it('maps Moving & Handling methods and the hoist answer', () => {
    expect(
      detectCarePlanEquipmentInUse({ hoistInUse: true, movingHandlingMethods: ['walkingAid', 'commode', 'slidingSheets'] }),
    ).toEqual({ hoistSling: ['movingHandling'], zimmerFrame: ['movingHandling'], commode: ['movingHandling'] })
  })

  it('reads free-text aid lists and keeps each source', () => {
    const found = detectCarePlanEquipmentInUse({
      movingHandlingMethods: ['walkingAid'],
      mobilityAidsText: '<p>Rollator indoors, wheelchair for outings</p>',
      dailyLivingAidsText: 'Riser recliner chair, perching stool, profiling bed, Sara Stedy',
    })
    expect(found.zimmerFrame).toEqual(['movingHandling', 'mobilityAids'])
    expect(found.wheelchair).toEqual(['mobilityAids'])
    expect(found.reclinerChair).toEqual(['dailyLivingAids'])
    expect(found.perchingStool).toEqual(['dailyLivingAids'])
    expect(found.profilingBed).toEqual(['dailyLivingAids'])
    expect(found.standAid).toEqual(['dailyLivingAids'])
    expect(found.hoistSling).toBeUndefined()
  })

  it('does not treat a stand aid as a walking aid', () => {
    const found = detectCarePlanEquipmentInUse({ mobilityAidsText: 'Standing aid for transfers' })
    expect(found.standAid).toEqual(['mobilityAids'])
    expect(found.zimmerFrame).toBeUndefined()
  })
})
