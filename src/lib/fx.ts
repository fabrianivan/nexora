import type { CountryCode } from '@/data/multiCountryTaxData';

/** Indicative IDR rates used only to aggregate multi-currency group totals. */
export const FX_TO_IDR: Record<CountryCode, number> = { ID: 1, SG: 11_950, MY: 3_520, US: 16_250 };
export const FX_NOTE = 'Kurs indikatif: 1 SGD = Rp 11.950 · 1 MYR = Rp 3.520 · 1 USD = Rp 16.250';

export function toIdr(amount: number, country: CountryCode): number {
  return amount * FX_TO_IDR[country];
}
