import { describe, expect, it } from 'vitest'
import {
  buildMcaSnapshotFromMetadata,
  isMcaScreeningStandaloneComplete,
  metadataFromMcaSnapshotRows,
} from '@/features/service-users/initial-assessment/utils/mca-screening-standalone'

describe('mca-screening-standalone', () => {
  it('round-trips metadata through snapshot rows', () => {
    const meta = {
      mcaStage1Impairment: true,
      mcaStage2UnableToDecide: false,
      mcaFunctionalUnderstand: true,
      mcaFunctionalRetain: true,
      mcaFunctionalWeigh: false,
      mcaFunctionalCommunicate: true,
      mcaScreeningOutcome: 'lacks_capacity',
      mcaScreeningComments: 'Follow up with GP',
    }
    const rows = buildMcaSnapshotFromMetadata(meta)
    const parsed = metadataFromMcaSnapshotRows(rows)
    expect(parsed.mcaStage1Impairment).toBe(true)
    expect(parsed.mcaStage2UnableToDecide).toBe(false)
    expect(parsed.mcaScreeningOutcome).toBe('lacks_capacity')
    expect(parsed.mcaScreeningComments).toBe('Follow up with GP')
    expect(isMcaScreeningStandaloneComplete(parsed)).toBe(true)
  })

  it('is incomplete when required yes/no missing', () => {
    expect(
      isMcaScreeningStandaloneComplete({
        mcaStage1Impairment: true,
        mcaScreeningOutcome: 'has_capacity',
      }),
    ).toBe(false)
  })
})
