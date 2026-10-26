import { CountryCode } from '@/lib/domain';
import { CountryAdapter } from './types';
import { idAdapter } from './idAdapter';
import { sgAdapter } from './sgAdapter';
import { myAdapter } from './myAdapter';
import { usAdapter } from './usAdapter';

export * from './types';
export { idAdapter, sgAdapter, myAdapter, usAdapter };

export const countryAdapters: Record<CountryCode, CountryAdapter> = {
  ID: idAdapter,
  SG: sgAdapter,
  MY: myAdapter,
  US: usAdapter,
};

export function getCountryAdapter(countryCode: CountryCode): CountryAdapter {
  const adapter = countryAdapters[countryCode];
  if (!adapter) {
    throw new Error(`Country adapter for ${countryCode} is not implemented.`);
  }
  return adapter;
}

export function getAdapter(countryCode: string): CountryAdapter {
  const code = (countryCode?.toUpperCase() || 'ID') as CountryCode;
  return countryAdapters[code] || idAdapter;
}

export function listAdapters(): CountryAdapter[] {
  return [idAdapter, sgAdapter, myAdapter, usAdapter];
}
