/** Country → city options for Location Management zone forms. */
export type CountryOption = {
  code: string
  name: string
  cities: string[]
}

export const ZONE_COUNTRY_OPTIONS: CountryOption[] = [
  {
    code: 'GB',
    name: 'United Kingdom',
    cities: [
      'London',
      'Birmingham',
      'Manchester',
      'Leeds',
      'Glasgow',
      'Edinburgh',
      'Liverpool',
      'Bristol',
      'Sheffield',
      'Newcastle',
      'Cardiff',
      'Belfast',
      'Nottingham',
      'Leicester',
      'Croydon',
      'Amersham',
      'Reading',
      'Oxford',
      'Cambridge',
      'Brighton',
    ],
  },
  {
    code: 'IE',
    name: 'Ireland',
    cities: ['Dublin', 'Cork', 'Galway', 'Limerick', 'Waterford'],
  },
  {
    code: 'US',
    name: 'United States',
    cities: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Boston', 'Seattle'],
  },
  {
    code: 'CA',
    name: 'Canada',
    cities: ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa'],
  },
  {
    code: 'AU',
    name: 'Australia',
    cities: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide'],
  },
  {
    code: 'IN',
    name: 'India',
    cities: ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata'],
  },
  {
    code: 'PK',
    name: 'Pakistan',
    cities: ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Peshawar'],
  },
  {
    code: 'DE',
    name: 'Germany',
    cities: ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne'],
  },
  {
    code: 'FR',
    name: 'France',
    cities: ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice'],
  },
]

export function citiesForCountry(countryNameOrCode: string): string[] {
  const key = countryNameOrCode.trim().toLowerCase()
  if (!key) return []
  const match = ZONE_COUNTRY_OPTIONS.find(
    c => c.code.toLowerCase() === key || c.name.toLowerCase() === key,
  )
  return match?.cities ?? []
}

export function countryNameFromCode(code: string): string | undefined {
  return ZONE_COUNTRY_OPTIONS.find(c => c.code === code)?.name
}
