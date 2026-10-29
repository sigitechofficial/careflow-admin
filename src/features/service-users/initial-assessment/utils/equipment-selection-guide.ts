/** Quick Guide to Equipment Selection — Pressure relieving / redistribution devices (paper reference). */

// Risk bands and the equipment to consider per band come from the Waterlow tab's
// WATERLOW_EQUIPMENT_CATALOG (single source) — no second, contradicting table here.

export const EQUIPMENT_SELECTION_ADVISORY_NOTES = [
  'Please consider my postural alignment, weight distribution, balance, stability and pressure risk when positioning me or selecting my equipment.',
  'Please consider any hazards in my home when positioning my bed or mattress, e.g. working radiators.',
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
    indicationsForUse: 'At risk (10–14) / high risk (15–19)',
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
    indicationsForUse: 'At risk (10–14)',
  },
  {
    product: 'Foam replacement mattress',
    information: "For use with hospital bed and client's own bed",
    indicationsForUse: 'At risk (10–14)',
  },
  {
    product: 'Electric alternating mattress (overlay)',
    information:
      'Can be placed on top of existing mattress (single); assess the height of the bed to ensure client safety',
    indicationsForUse: 'At risk to high risk (10–19); weight restriction to 140 kg',
  },
  {
    product: 'Electric alternating mattress (full replacement mattress)',
    information: 'Requires hospital bed',
    indicationsForUse: 'High / very high risk (15+); existing pressure ulcer; limited mobility',
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
