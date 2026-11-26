import { redirect } from 'next/navigation';

/** Risiko & fraud and Review temuan merged into Kasus; old links keep working. */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  if (typeof sp.f === 'string') q.set('f', sp.f);
  const qs = q.toString();
  redirect(`/cases${qs ? `?${qs}` : ''}`);
}
