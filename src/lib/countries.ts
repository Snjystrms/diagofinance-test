export const COUNTRIES = [
  { name: 'United States', code: '+1' },
  { name: 'India', code: '+91' },
  { name: 'United Kingdom', code: '+44' },
  { name: 'Australia', code: '+61' },
  { name: 'Canada', code: '+1' },
  { name: 'Germany', code: '+49' },
  { name: 'France', code: '+33' },
  { name: 'Japan', code: '+81' },
  { name: 'China', code: '+86' },
  { name: 'Brazil', code: '+55' },
  { name: 'Russia', code: '+7' },
  { name: 'South Korea', code: '+82' },
  { name: 'Italy', code: '+39' },
  { name: 'Spain', code: '+34' },
  { name: 'Mexico', code: '+52' },
  { name: 'Indonesia', code: '+62' },
  { name: 'Turkey', code: '+90' },
  { name: 'Saudi Arabia', code: '+966' },
  { name: 'United Arab Emirates', code: '+971' },
  { name: 'South Africa', code: '+27' },
] as const;

export const COUNTRY_CODES = [...new Set(COUNTRIES.map((country) => country.code))];
