/** Map API administration enum to MAR display code (mirrors backend util). */
export function administrationStatusToDisplayCode(status: string): string {
  switch (status) {
    case 'GIVEN':
      return 'G'
    case 'REFUSED':
      return 'R'
    case 'MISSED':
    case 'NOT_GIVEN':
      return 'N'
    case 'HELD':
      return 'U'
    case 'CANCELLED':
      return 'C'
    case 'PENDING':
      return 'Pending'
    default:
      return status
  }
}

export function supplyModelLabel(model: string): string {
  switch (model) {
    case 'BLISTER_CYCLE':
      return 'Pharmacy blister pack'
    case 'BOTTLE_28DAY':
      return 'Eye drop / bottle (28-day)'
    case 'PRESCRIPTION_QTY':
      return 'Prescription supply'
    default:
      return model
  }
}
