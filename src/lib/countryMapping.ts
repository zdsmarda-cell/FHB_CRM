export const COUNTRIES = [
  "Czechia", "Slovakia", "Hungary", "Romania", "Poland", 
  "Germany", "Austria", "Switzerland", "United Kingdom", 
  "France", "Italy", "Spain", "Netherlands", "Belgium", 
  "Sweden", "Denmark", "Norway", "Finland", "Ireland", 
  "Portugal", "Greece", "Croatia", "Slovenia", "Bulgaria",
  "Lithuania", "Latvia", "Estonia", "Serbia", "Bosnia",
  "United States", "Canada", "Australia", "Japan", "China", 
  "India", "Brazil", "Other"
];

export const PHONE_PREFIXES = [
  { code: '00420', country: 'Czechia', label: 'CZ (+420)', flag: '🇨🇿' },
  { code: '00421', country: 'Slovakia', label: 'SK (+421)', flag: '🇸🇰' },
  { code: '0036', country: 'Hungary', label: 'HU (+36)', flag: '🇭🇺' },
  { code: '0040', country: 'Romania', label: 'RO (+40)', flag: '🇷🇴' },
  { code: '0048', country: 'Poland', label: 'PL (+48)', flag: '🇵🇱' },
  { code: '0049', country: 'Germany', label: 'DE (+49)', flag: '🇩🇪' },
  { code: '0043', country: 'Austria', label: 'AT (+43)', flag: '🇦🇹' },
  { code: '0041', country: 'Switzerland', label: 'CH (+41)', flag: '🇨🇭' },
  { code: '0044', country: 'United Kingdom', label: 'UK (+44)', flag: '🇬🇧' },
  { code: '0033', country: 'France', label: 'FR (+33)', flag: '🇫🇷' },
  { code: '0039', country: 'Italy', label: 'IT (+39)', flag: '🇮🇹' },
  { code: '0034', country: 'Spain', label: 'ES (+34)', flag: '🇪🇸' },
  { code: '0031', country: 'Netherlands', label: 'NL (+31)', flag: '🇳🇱' },
  { code: '0032', country: 'Belgium', label: 'BE (+32)', flag: '🇧🇪' },
  { code: '0046', country: 'Sweden', label: 'SE (+46)', flag: '🇸🇪' },
  { code: '0045', country: 'Denmark', label: 'DK (+45)', flag: '🇩🇰' },
  { code: '0047', country: 'Norway', label: 'NO (+47)', flag: '🇳🇴' },
  { code: '00358', country: 'Finland', label: 'FI (+358)', flag: '🇫🇮' },
  { code: '00353', country: 'Ireland', label: 'IE (+353)', flag: '🇮🇪' },
  { code: '00351', country: 'Portugal', label: 'PT (+351)', flag: '🇵🇹' },
  { code: '0030', country: 'Greece', label: 'GR (+30)', flag: '🇬🇷' },
  { code: '00385', country: 'Croatia', label: 'HR (+385)', flag: '🇭🇷' },
  { code: '00386', country: 'Slovenia', label: 'SI (+386)', flag: '🇸🇮' },
  { code: '00359', country: 'Bulgaria', label: 'BG (+359)', flag: '🇧🇬' },
  { code: '00370', country: 'Lithuania', label: 'LT (+370)', flag: '🇱🇹' },
  { code: '00371', country: 'Latvia', label: 'LV (+371)', flag: '🇱🇻' },
  { code: '00372', country: 'Estonia', label: 'EE (+372)', flag: '🇪🇪' },
  { code: '00381', country: 'Serbia', label: 'RS (+381)', flag: '🇷🇸' },
  { code: '00387', country: 'Bosnia', label: 'BA (+387)', flag: '🇧🇦' },
  { code: '001', country: 'United States', label: 'US (+1)', flag: '🇺🇸' },
  { code: '001', country: 'Canada', label: 'CA (+1)', flag: '🇨🇦' },
  { code: '0061', country: 'Australia', label: 'AU (+61)', flag: '🇦🇺' },
  { code: '0081', country: 'Japan', label: 'JP (+81)', flag: '🇯🇵' },
  { code: '0086', country: 'China', label: 'CN (+86)', flag: '🇨🇳' },
  { code: '0091', country: 'India', label: 'IN (+91)', flag: '🇮🇳' },
  { code: '0055', country: 'Brazil', label: 'BR (+55)', flag: '🇧🇷' },
  { code: '0000', country: 'Other', label: 'Other', flag: '🌍' }
];

export function getDefaultPhonePrefixForCountry(country: string): string {
  const found = PHONE_PREFIXES.find(p => p.country === country);
  return found ? found.code : '00420'; // default CZ
}

export function getRegionForCountry(country: string): string {
  if (['Czechia', 'Slovakia'].includes(country)) return 'SK_CZ';
  if (['Hungary', 'Romania', 'Poland'].includes(country)) return 'CEE';
  if (['Germany', 'Austria', 'Switzerland'].includes(country)) return 'DACH';
  
  const europeCountries = [
    "United Kingdom", "France", "Italy", "Spain", "Netherlands", 
    "Belgium", "Sweden", "Denmark", "Norway", "Finland", 
    "Ireland", "Portugal", "Greece", "Croatia", "Slovenia", 
    "Bulgaria", "Lithuania", "Latvia", "Estonia", "Serbia", "Bosnia"
  ];
  
  if (europeCountries.includes(country)) return 'EU';
  return 'WORLD';
}
