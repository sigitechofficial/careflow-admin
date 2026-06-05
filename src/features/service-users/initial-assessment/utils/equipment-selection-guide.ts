/** Quick Guide to Equipment Selection — Pressure relieving / redistribution devices (paper reference). */

export type PressureRiskEquipmentRow = {
  riskLevel: string
  scoreRange: string
  recommendedEquipment: string
}

export const PRESSURE_RISK_EQUIPMENT_ROWS: PressureRiskEquipmentRow[] = [
  {
    riskLevel: 'Minimal risk',
    scoreRange: '< 10',
    recommendedEquipment: 'High risk foam mattress / alternating overlay',
  },
  {
    riskLevel: 'At risk',
    scoreRange: '10–14',
    recommendedEquipment: 'High risk foam mattress / alternating overlay',
  },
  {
    riskLevel: 'High risk',
    scoreRange: '15–19',
    recommendedEquipment: 'Full replacement mattress',
  },
  {
    riskLevel: 'Very high risk',
    scoreRange: '20+',
    recommendedEquipment: 'Full replacement mattress',
  },
]

export const EQUIPMENT_SELECTION_ADVISORY_NOTES = [
  'Consider postural alignment, distribution of weight, balance, stability, and pressure risk adjustment when positioning or selecting equipment.',
  'Consider environmental danger when positioning bed/mattress e.g. working radiators.',
] as const

export type EquipmentProductGuideRow = {
  product: string
  information: string
  indicationsForUse: string
}

export const EQUIPMENT_PRODUCT_GUIDE_ROWS: EquipmentProductGuideRow[] = [
  {
    product: 'Foam cushion',
    information: 'Fits chairs and wheelchairs',
    indicationsForUse: 'At risk / high risk',
  },
  {
    product: 'Dynamic cushion (high risk)',
    information: 'Reduces shear and friction; redistributes body weight',
    indicationsForUse: '—',
  },
  {
    product: 'Foam overlay',
    information:
      "Foam pad placed on top of mattress; can be used on client's own mattress",
    indicationsForUse: 'At risk / medium risk',
  },
  {
    product: 'Foam replacement mattress',
    information: "For use with hospital bed and client's own bed",
    indicationsForUse: 'At risk / medium risk',
  },
  {
    product: 'Electric alternating mattress (overlay)',
    information:
      'Can be placed on top of existing mattress (single); assess the height of the bed to ensure client safety',
    indicationsForUse: 'Medium to high risk; weight restriction to 140 kg',
  },
  {
    product: 'Electric alternating mattress (full replacement mattress)',
    information: 'Requires hospital bed',
    indicationsForUse: 'High risk; existing pressure ulcer; limited mobility',
  },
  {
    product: 'Off loading boot',
    information:
      'To relieve pressure from foot (foam dressings should not be used)',
    indicationsForUse:
      'All clients with vulnerable heels, blanching or non-blanching, including clients with diabetes or vascular problems',
  },
  {
    product: 'Sliding sheet',
    information: 'Standard and full body length sizes',
    indicationsForUse:
      'To reduce the risks of shearing and friction during client repositioning',
  },
  {
    product: 'Aderma gel pad',
    information:
      'Variable sizes and thickness; 1.2 cm thickness should be considered for the protection of extreme bony prominences',
    indicationsForUse:
      'To reduce the risks of shearing and friction for protection of vulnerable areas',
  },
]
