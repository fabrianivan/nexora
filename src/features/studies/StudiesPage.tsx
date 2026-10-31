'use client';

import React, { useMemo, useState } from 'react';
import { BookOpen, Globe2, Scale, Search, Sparkles, SplitSquareHorizontal } from 'lucide-react';
import { useWorkspace } from '@/state/workspace';
import { useUi } from '@/state/ui';
import { money, pct } from '@/lib/format';
import type { CountryCode } from '@/data/multiCountryTaxData';
import type { StudyCategory, StudyItem } from '@/state/types';
import { Badge, Button, Callout, Card, CardBody, CardHeader, EmptyState, Input, PageHeader, Segmented, SelectField, Switch, TextField, cn } from '@/ui';

type Income = 'dividend' | 'interest' | 'royalty';
type Sim = 'treaty' | 'pillar2' | 'tp';
const NAMES: Record<CountryCode, string> = { ID: '🇮🇩 Indonesia', SG: '🇸🇬 Singapura', MY: '🇲🇾 Malaysia', US: '🇺🇸 Amerika Serikat' };
const INCOME_LABEL: Record<Income, string> = { dividend: 'Dividen', interest: 'Bunga', royalty: 'Royalti' };

/** Domestic withholding by source country (indicative). */
const DOMESTIC: Record<CountryCode, Record<Income, number>> = {
  ID: { dividend: 0.2, interest: 0.2, royalty: 0.2 },
  SG: { dividend: 0, interest: 0.15, royalty: 0.1 },
  MY: { dividend: 0, interest: 0.15, royalty: 0.1 },
  US: { dividend: 0.3, interest: 0.3, royalty: 0.3 },
};
/** Treaty caps (indicative; substantial-holding dividend rate). */
const TREATY: Record<string, { rates: Record<Income, number>; ref: string }> = {
  'ID-SG': { rates: { dividend: 0.1, interest: 0.1, royalty: 0.1 }, ref: 'P3B RI–Singapura (2020) Pasal 10–12' },
  'ID-MY': { rates: { dividend: 0.1, interest: 0.1, royalty: 0.1 }, ref: 'P3B RI–Malaysia (1991, Protokol 2006)' },
  'ID-US': { rates: { dividend: 0.1, interest: 0.1, royalty: 0.1 }, ref: 'P3B RI–AS (1988, Protokol 1996)' },
  'SG-MY': { rates: { dividend: 0, interest: 0.1, royalty: 0.08 }, ref: 'DTA Singapore–Malaysia (2004)' },
};
const treatyFor = (a: CountryCode, b: CountryCode) => TREATY[`${a}-${b}`] ?? TREATY[`${b}-${a}`];

function TreatySim() {
  const ui = useUi();
  const [source, setSource] = useState<CountryCode>('ID');
  const [residence, setResidence] = useState<CountryCode>('SG');
  const [income, setIncome] = useState<Income>('royalty');
  const [gross, setGross] = useState(500_000_000);
  const [docs, setDocs] = useState(true);
  const t = source !== residence ? treatyFor(source, residence) : undefined;
  const domestic = DOMESTIC[source][income];
  const treaty = t ? Math.min(domestic, t.rates[income]) : domestic;
  const applied = docs && t ? treaty : domestic;
  const saving = gross * (domestic - applied);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <SelectField label="Negara sumber (pembayar)" value={source} onChange={(e) => setSource(e.target.value as CountryCode)}>
            {(Object.keys(NAMES) as CountryCode[]).map((c) => <option key={c} value={c}>{NAMES[c]}</option>)}
          </SelectField>
          <SelectField label="Residensi penerima" value={residence} onChange={(e) => setResidence(e.target.value as CountryCode)}>
            {(Object.keys(NAMES) as CountryCode[]).map((c) => <option key={c} value={c}>{NAMES[c]}</option>)}
          </SelectField>
        </div>
        <Segmented<Income> value={income} onChange={setIncome} items={(Object.keys(INCOME_LABEL) as Income[]).map((k) => ({ id: k, label: INCOME_LABEL[k] }))} />
        <TextField label="Pembayaran bruto (mata uang sumber)" type="number" min={0} value={gross} onChange={(e) => setGross(Number(e.target.value) || 0)} />
        <Switch checked={docs} onChange={setDocs} label="Dokumen residensi valid (DGT / COR / W-8BEN-E)" />
      </div>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-line px-3.5 py-3"><div className="text-xs text-ink-3">Tarif domestik</div><div className="text-lg font-semibold text-ink num">{pct(domestic, 0)}</div></div>
          <div className="rounded-xl border border-line px-3.5 py-3"><div className="text-xs text-ink-3">Tarif diterapkan</div><div className="text-lg font-semibold text-ink num">{pct(applied, 0)}</div></div>
          <div className="rounded-xl border border-success-100 bg-success-50 px-3.5 py-3"><div className="text-xs text-success-700">Penghematan</div><div className="text-lg font-semibold text-success-700 num">{money(saving, source)}</div></div>
        </div>
        <div className="rounded-xl bg-subtle border border-line px-4 py-3 text-[13px] space-y-1">
          <div className="flex justify-between"><span className="text-ink-3">Pajak dipotong</span><span className="text-ink font-medium num">{money(gross * applied, source)}</span></div>
          <div className="flex justify-between"><span className="text-ink-3">Diterima bersih</span><span className="text-ink font-medium num">{money(gross * (1 - applied), source)}</span></div>
        </div>
        <Callout tone={t ? 'brand' : 'warning'} icon={<Globe2 />}>
          {source === residence ? 'Transaksi domestik — P3B tidak berlaku.' : t ? `${t.ref}${docs ? '' : ' — tarif treaty tidak dapat dipakai tanpa dokumen residensi.'}` : 'Tidak ada P3B komprehensif untuk pasangan ini; berlaku tarif domestik.'}
        </Callout>
        <Button size="sm" icon={<Sparkles className="text-brand-600" />} onClick={() => ui.askCopilot(`Jelaskan perlakuan pajak atas ${INCOME_LABEL[income].toLowerCase()} ${money(gross, source)} dari ${NAMES[source]} ke residen ${NAMES[residence]}, termasuk syarat P3B, anti-treaty shopping (PPT), dan dokumen yang diperlukan.`)}>Tanya Copilot</Button>
        <p className="text-xs text-ink-4">Tarif indikatif untuk simulasi; verifikasi dengan teks P3B dan aturan domestik terbaru.</p>
      </div>
    </div>
  );
}

function PillarTwoSim() {
  const [revenue, setRevenue] = useState(820);
  const [etr, setEtr] = useState(11.5);
  const [income, setIncome] = useState(50);
  const [sbie, setSbie] = useState(6);
  const applies = revenue >= 750;
  const excess = Math.max(0, income - sbie);
  const topUpPct = Math.max(0, 15 - etr);
  const topUp = applies ? (excess * topUpPct) / 100 : 0;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="grid grid-cols-2 gap-3 content-start">
        <TextField label="Omzet konsolidasi grup (€ juta)" type="number" min={0} value={revenue} onChange={(e) => setRevenue(Number(e.target.value) || 0)} className="col-span-2" />
        <TextField label="ETR yurisdiksi (%)" type="number" step={0.1} min={0} value={etr} onChange={(e) => setEtr(Number(e.target.value) || 0)} />
        <TextField label="Laba GloBE (€ juta)" type="number" min={0} value={income} onChange={(e) => setIncome(Number(e.target.value) || 0)} />
        <TextField label="Pengecualian substansi / SBIE (€ juta)" type="number" min={0} value={sbie} onChange={(e) => setSbie(Number(e.target.value) || 0)} className="col-span-2" hint="Persentase dari biaya gaji & aset berwujud" />
      </div>
      <div className="space-y-3">
        <Callout tone={applies ? 'warning' : 'success'} title={applies ? 'Grup masuk cakupan GloBE' : 'Di bawah ambang €750 juta'}>
          {applies ? 'Minimum ETR 15% per yurisdiksi berlaku (IIR/QDMTT).' : 'Aturan Pillar Two belum mewajibkan top-up tax.'}
        </Callout>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-line px-3.5 py-3"><div className="text-xs text-ink-3">Kekurangan ETR</div><div className="text-lg font-semibold text-ink num">{topUpPct.toFixed(1)}%</div></div>
          <div className="rounded-xl border border-line px-3.5 py-3"><div className="text-xs text-ink-3">Laba lebih</div><div className="text-lg font-semibold text-ink num">€{excess.toFixed(1)} jt</div></div>
          <div className={cn('rounded-xl border px-3.5 py-3', topUp ? 'border-danger-100 bg-danger-50' : 'border-line')}><div className={cn('text-xs', topUp ? 'text-danger-700' : 'text-ink-3')}>Top-up tax</div><div className={cn('text-lg font-semibold num', topUp ? 'text-danger-700' : 'text-ink')}>€{topUp.toFixed(2)} jt</div></div>
        </div>
        <p className="text-xs text-ink-3 font-mono">top-up = max(0; 15% − ETR) × (laba GloBE − SBIE)</p>
      </div>
    </div>
  );
}

function TpSim() {
  const [cost, setCost] = useState(2_000_000_000);
  const [markup, setMarkup] = useState(4);
  const q1 = 5.2;
  const med = 6.5;
  const q3 = 7.9;
  const inRange = markup >= q1 && markup <= q3;
  const adjustment = inRange ? 0 : ((med - markup) / 100) * cost;
  const pos = (v: number) => `${Math.min(100, Math.max(0, ((v - 0) / 12) * 100))}%`;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <TextField label="Total biaya jasa intra-grup (Rp)" type="number" min={0} value={cost} onChange={(e) => setCost(Number(e.target.value) || 0)} />
        <TextField label="Markup yang dibebankan (%)" type="number" step={0.1} min={0} value={markup} onChange={(e) => setMarkup(Number(e.target.value) || 0)} />
        <p className="text-xs text-ink-3">Pembanding: 14 penyedia jasa independen (Orbis), rentang interkuartil {q1}% – {q3}%, median {med}%.</p>
      </div>
      <div className="space-y-4">
        <div>
          <div className="relative h-10">
            <div className="absolute top-4 inset-x-0 h-2 rounded-full bg-muted" />
            <div className="absolute top-4 h-2 rounded-full bg-success-100" style={{ left: pos(q1), width: `calc(${pos(q3)} - ${pos(q1)})` }} />
            <div className="absolute top-3 h-4 w-0.5 bg-success-600" style={{ left: pos(med) }} title="Median" />
            <div className={cn('absolute top-2.5 size-5 -ml-2.5 rounded-full ring-4 ring-surface', inRange ? 'bg-success-500' : 'bg-danger-500')} style={{ left: pos(markup) }} title={`Markup ${markup}%`} />
          </div>
          <div className="flex justify-between text-[11px] text-ink-3 num"><span>0%</span><span>IQR {q1}–{q3}%</span><span>12%</span></div>
        </div>
        <Callout tone={inRange ? 'success' : 'danger'} icon={<Scale />} title={inRange ? 'Dalam rentang wajar' : 'Di luar rentang wajar'}>
          {inRange ? 'Markup memenuhi prinsip kewajaran (PMK 172/2023).' : `Risiko penyesuaian ke median: ${money(adjustment, 'ID')} ${adjustment > 0 ? 'tambahan penghasilan' : 'pengurangan'} untuk pihak yang diuji.`}
        </Callout>
      </div>
    </div>
  );
}

const CATS: (StudyCategory | 'all')[] = ['all', 'P3B / Tax Treaty', 'BEPS 2.0 / Pillar Two', 'Transfer Pricing', 'PPN / VAT', 'Fraud Case Study'];

export function StudiesPage() {
  const ws = useWorkspace();
  const ui = useUi();
  const [sim, setSim] = useState<Sim>('treaty');
  const [cat, setCat] = useState<StudyCategory | 'all'>('all');
  const [q, setQ] = useState('');
  const list = useMemo(
    () =>
      ws.studies.filter(
        (s) => (cat === 'all' || s.category === cat) && (!q.trim() || `${s.title} ${s.summary} ${s.tags.join(' ')}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [ws.studies, cat, q],
  );
  const openSim = (s: StudyItem) => {
    setSim(s.simulationType === 'pillar_two_etr' ? 'pillar2' : s.simulationType === 'tp_markup' ? 'tp' : 'treaty');
    document.getElementById('simulator')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div>
      <PageHeader title="Studi & simulator" description="Simulasi P3B, Pillar Two, dan transfer pricing, plus perpustakaan kajian dan kasus fraud." />

      <Card id="simulator" className="mb-6 scroll-mt-20">
        <CardHeader
          title="Simulator"
          actions={
            <Segmented<Sim>
              size="sm"
              value={sim}
              onChange={setSim}
              items={[
                { id: 'treaty', label: 'Tax treaty', icon: <Globe2 /> },
                { id: 'pillar2', label: 'Pillar Two', icon: <SplitSquareHorizontal /> },
                { id: 'tp', label: 'Transfer pricing', icon: <Scale /> },
              ]}
            />
          }
        />
        <CardBody>
          {sim === 'treaty' && <TreatySim />}
          {sim === 'pillar2' && <PillarTwoSim />}
          {sim === 'tp' && <TpSim />}
        </CardBody>
      </Card>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex flex-wrap gap-2">
          {CATS.map((c) => (
            <button key={c} type="button" onClick={() => setCat(c)} className={cn('h-8 px-3 rounded-full border text-[13px] cursor-pointer', cat === c ? 'bg-ink text-white border-ink' : 'bg-surface border-line text-ink-2 hover:border-line-strong')}>
              {c === 'all' ? 'Semua' : c}
            </button>
          ))}
        </div>
        <div className="w-full sm:w-72 sm:ml-auto">
          <Input leading={<Search />} placeholder="Cari kajian…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari kajian" />
        </div>
      </div>

      {list.length === 0 ? (
        <Card><EmptyState icon={<BookOpen />} title="Tidak ada kajian" /></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {list.map((s) => (
            <Card key={s.id} as="article" className="flex flex-col">
              <div className="px-5 pt-4 flex-1">
                <div className="flex items-center gap-2"><Badge tone={s.category === 'Fraud Case Study' ? 'danger' : 'brand'}>{s.category}</Badge><span className="text-xs text-ink-3">{s.applicableJurisdictions.map((j) => j.split(' ')[0]).join(' ')}</span></div>
                <h3 className="mt-2.5 text-[15px] font-semibold text-ink leading-snug">{s.title}</h3>
                <p className="mt-1.5 text-[13px] text-ink-2 leading-relaxed">{s.summary}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">{s.tags.map((t) => <span key={t} className="text-xs text-ink-3 bg-muted rounded px-1.5 py-0.5">#{t}</span>)}</div>
              </div>
              <div className="px-5 py-3 mt-4 border-t border-line flex items-center justify-between gap-2">
                <span className="text-xs text-ink-4 truncate">{s.source}</span>
                <div className="flex gap-1.5 shrink-0">
                  {s.simulationType !== 'none' && <Button size="sm" variant="ghost" onClick={() => openSim(s)}>Simulasikan</Button>}
                  <Button size="sm" icon={<Sparkles className="text-brand-600" />} onClick={() => ui.askCopilot(`Ringkas kajian "${s.title}" dan dampaknya bagi grup kami (${ws.activeEntity.legalName}).`)}>Tanya</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
