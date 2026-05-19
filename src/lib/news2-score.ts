export type News2Payload = {
  respirationRate?: number
  oxygenSaturation?: number
  oxygenSaturationScale?: number
  airOrOxygen?: string
  systolic?: number
  diastolic?: number
  pulse?: number
  consciousness?: string
  temperature?: number
}

function scoreRespiration(rpm: number): number {
  if (rpm <= 8) return 3
  if (rpm <= 11) return 1
  if (rpm <= 20) return 0
  if (rpm <= 24) return 2
  return 3
}

function scoreSpO2Scale1(spo2: number): number {
  if (spo2 <= 91) return 3
  if (spo2 <= 93) return 2
  if (spo2 <= 95) return 1
  return 0
}

function scoreSpO2Scale2(spo2: number): number {
  if (spo2 <= 83) return 3
  if (spo2 <= 85) return 2
  if (spo2 <= 87) return 1
  if (spo2 <= 92) return 0
  if (spo2 <= 94) return 1
  if (spo2 <= 96) return 2
  return 3
}

function scoreOxygen(airOrOxygen: string): number {
  return airOrOxygen === 'OXYGEN' ? 2 : 0
}

function scoreSystolic(bp: number): number {
  if (bp <= 90) return 3
  if (bp <= 100) return 2
  if (bp <= 110) return 1
  if (bp <= 219) return 0
  return 3
}

function scorePulse(bpm: number): number {
  if (bpm <= 40) return 3
  if (bpm <= 50) return 1
  if (bpm <= 90) return 0
  if (bpm <= 110) return 1
  if (bpm <= 130) return 2
  return 3
}

function scoreConsciousness(level: string): number {
  return level === 'A' ? 0 : 3
}

function scoreTemperature(c: number): number {
  if (c <= 35.0) return 3
  if (c <= 36.0) return 1
  if (c <= 38.0) return 0
  if (c <= 39.0) return 1
  return 2
}

/** Returns total NEWS2 score when all inputs are present; otherwise null. */
export function calculateNews2Score(payload: Partial<News2Payload>): number | null {
  const {
    respirationRate,
    oxygenSaturation,
    oxygenSaturationScale = 1,
    airOrOxygen,
    systolic,
    pulse,
    consciousness,
    temperature,
  } = payload

  if (
    respirationRate == null ||
    Number.isNaN(respirationRate) ||
    oxygenSaturation == null ||
    Number.isNaN(oxygenSaturation) ||
    !airOrOxygen ||
    systolic == null ||
    Number.isNaN(systolic) ||
    pulse == null ||
    Number.isNaN(pulse) ||
    !consciousness ||
    temperature == null ||
    Number.isNaN(temperature)
  ) {
    return null
  }

  const spo2Score =
    oxygenSaturationScale === 2
      ? scoreSpO2Scale2(oxygenSaturation)
      : scoreSpO2Scale1(oxygenSaturation)

  return (
    scoreRespiration(respirationRate) +
    spo2Score +
    scoreOxygen(airOrOxygen) +
    scoreSystolic(systolic) +
    scorePulse(pulse) +
    scoreConsciousness(consciousness) +
    scoreTemperature(temperature)
  )
}
