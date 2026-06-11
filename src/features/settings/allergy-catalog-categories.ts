export type AllergyCatalogCategory =
  | 'FOOD'
  | 'DRINK'
  | 'ENVIRONMENTAL'
  | 'MEDICATION'
  | 'OTHER'

export const ALLERGY_CATALOG_CATEGORY_ORDER: AllergyCatalogCategory[] = [
  'FOOD',
  'DRINK',
  'ENVIRONMENTAL',
  'MEDICATION',
  'OTHER',
]

export const ALLERGY_CATALOG_CATEGORY_LABELS: Record<AllergyCatalogCategory, string> = {
  FOOD: 'Food',
  DRINK: 'Drink',
  ENVIRONMENTAL: 'Environmental & contact',
  MEDICATION: 'Medication',
  OTHER: 'Other',
}
