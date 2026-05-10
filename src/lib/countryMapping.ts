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
