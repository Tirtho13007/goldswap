/** Owner-supplied identity, with separately sourced registry observations. */
export const COMPANY_PROFILE = {
  legalName: 'Standard Pure Gold Trading LLC',
  city: 'Dubai',
  country: 'United Arab Emirates',
  countryCode: 'AE',
  registeredOffice: '702, Makateb Building, Port Saeed, Dubai, P.O. Box 27430, UAE',
  licenceNumber: '802467',
  lei: '984500B80CECC46U0482',
  entityStatus: 'ACTIVE',
  leiRegistrationStatus: 'LAPSED',
  checkedOn: '2026-11-03',
  registryUrl: 'https://api.gleif.org/api/v1/lei-records/984500B80CECC46U0482',
  registryPageUrl: 'https://search.gleif.org/#/record/984500B80CECC46U0482',
  companySourceUrl: 'https://www.standardpure.gold/compliance',
  custodyAttestation: {
    label: 'Verified by GoldSwap INC',
    scope: 'Internal company verification. Not an independent audit.',
    ownership: 'Your gold balance represents a claim against GoldSwap for an equivalent quantity of gold, rather than ownership of a specific allocated gold bar.',
  },
} as const;
