/** Countries Stripe can collect shipping addresses for, grouped for the picker. */
export const COUNTRY_GROUPS: { region: string; countries: { code: string; name: string }[] }[] = [
  { region: "North America", countries: [
    { code: "US", name: "United States" }, { code: "CA", name: "Canada" }, { code: "MX", name: "Mexico" },
  ]},
  { region: "United Kingdom & Ireland", countries: [
    { code: "GB", name: "United Kingdom" }, { code: "IE", name: "Ireland" },
  ]},
  { region: "Europe", countries: [
    { code: "AT", name: "Austria" }, { code: "BE", name: "Belgium" }, { code: "BG", name: "Bulgaria" },
    { code: "HR", name: "Croatia" }, { code: "CY", name: "Cyprus" }, { code: "CZ", name: "Czechia" },
    { code: "DK", name: "Denmark" }, { code: "EE", name: "Estonia" }, { code: "FI", name: "Finland" },
    { code: "FR", name: "France" }, { code: "DE", name: "Germany" }, { code: "GR", name: "Greece" },
    { code: "HU", name: "Hungary" }, { code: "IS", name: "Iceland" }, { code: "IT", name: "Italy" },
    { code: "LV", name: "Latvia" }, { code: "LT", name: "Lithuania" }, { code: "LU", name: "Luxembourg" },
    { code: "MT", name: "Malta" }, { code: "NL", name: "Netherlands" }, { code: "NO", name: "Norway" },
    { code: "PL", name: "Poland" }, { code: "PT", name: "Portugal" }, { code: "RO", name: "Romania" },
    { code: "SK", name: "Slovakia" }, { code: "SI", name: "Slovenia" }, { code: "ES", name: "Spain" },
    { code: "SE", name: "Sweden" }, { code: "CH", name: "Switzerland" },
  ]},
  { region: "Asia Pacific", countries: [
    { code: "AU", name: "Australia" }, { code: "NZ", name: "New Zealand" }, { code: "JP", name: "Japan" },
    { code: "SG", name: "Singapore" }, { code: "HK", name: "Hong Kong" }, { code: "KR", name: "South Korea" },
    { code: "MY", name: "Malaysia" }, { code: "TH", name: "Thailand" }, { code: "ID", name: "Indonesia" },
    { code: "PH", name: "Philippines" }, { code: "IN", name: "India" }, { code: "TW", name: "Taiwan" },
  ]},
  { region: "Middle East & Africa", countries: [
    { code: "AE", name: "United Arab Emirates" }, { code: "SA", name: "Saudi Arabia" }, { code: "IL", name: "Israel" },
    { code: "ZA", name: "South Africa" }, { code: "KE", name: "Kenya" }, { code: "NG", name: "Nigeria" },
  ]},
  { region: "Latin America", countries: [
    { code: "BR", name: "Brazil" }, { code: "AR", name: "Argentina" }, { code: "CL", name: "Chile" },
    { code: "CO", name: "Colombia" }, { code: "PE", name: "Peru" }, { code: "UY", name: "Uruguay" },
  ]},
];

export const ALL_COUNTRIES = COUNTRY_GROUPS.flatMap(g => g.countries);
const NAMES = new Map(ALL_COUNTRIES.map(c => [c.code, c.name]));
export const countryName = (code: string) => NAMES.get(code) || code;
export const isValidCountry = (code: string) => NAMES.has(code);