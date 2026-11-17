import { redirect } from 'next/navigation';

/** Risiko & fraud and Review temuan merged into Kasus; old links keep working. */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  for (const key of ['tab', 'f']) {
    const value = sp[key];
    if (typeof value === 'string') q.set(key, value);
  }
  const qs = q.toString();
  redirect(`/cases${qs ? `?${qs}` : ''}`);
}
