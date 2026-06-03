import { describe, expect, it } from 'vitest'
import {
  carParkingMatrixScore,
  carParkingRiskRatingLabel,
  carParkingRiskSummary,
} from '@/features/service-users/initial-assessment/utils/car-parking-risk.util'

describe('carParkingMatrixScore', () => {
  it('matches paper example: possible × major = 9', () => {
    expect(carParkingMatrixScore('possible', 'major')).toBe(9)
  })

  it('rates low scores as Low', () => {
    expect(carParkingRiskRatingLabel(1)).toBe('Low')
    expect(carParkingRiskRatingLabel(2)).toBe('Low')
  })

  it('rates mid scores as Moderate', () => {
    expect(carParkingRiskRatingLabel(3)).toBe('Moderate')
    expect(carParkingRiskRatingLabel(4)).toBe('Moderate')
  })

  it('rates high scores as Significant', () => {
    expect(carParkingRiskRatingLabel(6)).toBe('Significant')
    expect(carParkingRiskRatingLabel(9)).toBe('Significant')
  })
})

describe('carParkingRiskSummary', () => {
  it('returns null until both axes are chosen', () => {
    expect(carParkingRiskSummary('possible', undefined)).toBeNull()
    expect(carParkingRiskSummary(undefined, 'major')).toBeNull()
  })

  it('returns score and rating when complete', () => {
    expect(carParkingRiskSummary('possible', 'major')).toEqual({
      score: 9,
      ratingLabel: 'Significant',
    })
  })
})
