import type { CountryCode } from '@/data/multiCountryTaxData';

const SYMBOL: Record<CountryCode, string> = { ID: 'Rp', SG: 'S$', MY: 'RM', US: '$' };
const LOCALE: Record<CountryCode, string> = { ID: 'id-ID', SG: 'en-SG', MY: 'en-MY', US: 'en-US' };

/** Full money string, e.g. "Rp 120.000.000" or "S$ 84,000". */
export function money(amount: number, country: CountryCode = 'ID'): string {
  const sign = amount < 0 ? '−' : '';
  return `${sign}${SYMBOL[country]} ${Math.round(Math.abs(amount)).toLocaleString(LOCALE[country])}`;
}

/** Compact money, e.g. "Rp 1,2 M" (miliar), "Rp 120 jt", "S$ 84K". */
export function moneyCompact(amount: number, country: CountryCode = 'ID'): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '−' : '';
  const sym = SYMBOL[country];
  if (country === 'ID') {
    const fmt = (v: number) => v.toLocaleString('id-ID', { maximumFractionDigits: v < 10 ? 2 : 1 });
    if (abs >= 1e12) return `${sign}${sym} ${fmt(abs / 1e12)} T`;
    if (abs >= 1e9) return `${sign}${sym} ${fmt(abs / 1e9)} M`;
    if (abs >= 1e6) return `${sign}${sym} ${fmt(abs / 1e6)} jt`;
    if (abs >= 1e3) return `${sign}${sym} ${fmt(abs / 1e3)} rb`;
    return `${sign}${sym} ${Math.round(abs)}`;
  }
  const fmt = (v: number) => v.toLocaleString('en-US', { maximumFractionDigits: v < 10 ? 2 : 1 });
  if (abs >= 1e9) return `${sign}${sym} ${fmt(abs / 1e9)}B`;
  if (abs >= 1e6) return `${sign}${sym} ${fmt(abs / 1e6)}M`;
  if (abs >= 1e3) return `${sign}${sym} ${fmt(abs / 1e3)}K`;
  return `${sign}${sym} ${Math.round(abs)}`;
}

export function pct(value: number, digits = 1): string {
  return `${(value * 100).toLocaleString('id-ID', { maximumFractionDigits: digits })}%`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** "2026-11-30" → "30 Nov 2026" */
export function dateShort(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

export function dateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Whole days from today (local) to an ISO date; negative = overdue. */
export function daysUntil(iso: string, today = new Date()): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return NaN;
  const target = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target.getTime() - base.getTime()) / 86_400_000);
}

export function relativeDays(iso: string, today = new Date()): string {
  const d = daysUntil(iso, today);
  if (Number.isNaN(d)) return '';
  if (d === 0) return 'hari ini';
  if (d === 1) return 'besok';
  if (d === -1) return 'kemarin';
  return d > 0 ? `${d} hari lagi` : `terlambat ${-d} hari`;
}

export function nowWib(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} WIB`;
}
