'use client';

import React, { useMemo, useState } from 'react';
import { Eye, EyeOff, Plus, Search, ShieldAlert, Sparkles, UserCheck, Users, Globe2 } from 'lucide-react';
import type { CorporateEntity, IndividualShareholder } from '@/data/entities';
import { useWorkspace } from '@/state/workspace';
import { useUi } from '@/state/ui';
import { TAX_CONFIG } from '@/lib/tax';
import { money, pct } from '@/lib/format';
import {
  Badge,
  Button,
  Callout,
  Card,
  Checkbox,
  DescriptionList,
  Dialog,
  EmptyState,
  Input,
  PageHeader,
  SelectField,
  Sheet,
  Stat,
  Table,
  TD,
  TextField,
  TH,
  THead,
  TR,
} from '@/ui';
import { IndividualDialog } from '../entities/dialogs';

interface Row {
  p: IndividualShareholder;
  entity: CorporateEntity;
}

/** Masks identity numbers: keep the first 4 and last 2 characters. */
export function mask(value: string): string {
  const m = /^(.*?:\s*)?(.+)$/.exec(value);
  const prefix = m?.[1] ?? '';
  const raw = (m?.[2] ?? value).trim();
  if (raw.length <= 6) return value;
  return `${prefix}${raw.slice(0, 4)}${'•'.repeat(Math.min(6, Math.max(3, raw.length - 6)))}${raw.slice(-2)}`;
}

const isResident = (p: IndividualShareholder, entity: CorporateEntity) => p.taxResidency.includes(entity.jurisdictionName === 'Indonesia' ? 'Indonesia' : entity.jurisdictionName);

function DividendSimulator({ row }: { row: Row }) {
  const ui = useUi();
  const { p, entity } = row;
  const cfg = TAX_CONFIG[entity.countryCode];
  const resident = isResident(p, entity);
  const [amount, setAmount] = useState(100_000_000);
  const [reinvest, setReinvest] = useState(true);
  const [treaty, setTreaty] = useState(true);

  let rate = 0;
  let basis = '';
  if (entity.countryCode === 'ID') {
    if (resident) {
      rate = reinvest ? 0 : 0.1;
      basis = reinvest ? 'Dikecualikan — diinvestasikan kembali di Indonesia (UU HPP Pasal 4 ayat 3 huruf f)' : 'PPh final 10% (PP 9/2021)';
    } else {
      rate = treaty ? cfg.treatyWht : cfg.domesticWht;
      basis = treaty ? 'PPh 26 tarif P3B — DGT/e-SKD & COR valid' : 'PPh 26 tarif domestik 20%';
    }
  } else {
    rate = resident ? 0 : treaty ? cfg.treatyWht : cfg.domesticWht;
    basis = resident ? 'Dividen domestik — umumnya tidak dipotong' : treaty ? 'Tarif treaty dengan formulir residensi valid' : 'Tarif WHT domestik';
  }
  const tax = amount * rate;

  return (
    <div className="rounded-xl border border-line p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Simulasi pajak dividen</h3>
        <Badge tone={resident ? 'neutral' : 'brand'}>{resident ? 'Subjek pajak dalam negeri' : 'Subjek pajak luar negeri'}</Badge>
      </div>
      <TextField label={`Dividen bruto (${entity.functionalCurrency.split(' ')[0]})`} type="number" min={0} value={amount} onChange={(e) => setAmount(Number(e.target.value) || 0)} />
      {entity.countryCode === 'ID' && resident ? (
        <Checkbox label="Diinvestasikan kembali di Indonesia ≥ 3 tahun" checked={reinvest} onChange={(e) => setReinvest(e.target.checked)} />
      ) : !resident ? (
        <Checkbox label="Formulir treaty (DGT / COR / W-8BEN) valid" checked={treaty} onChange={(e) => setTreaty(e.target.checked)} />
      ) : null}
      <div className="grid grid-cols-3 gap-3 rounded-lg bg-subtle px-4 py-3">
        <div>
          <div className="text-xs text-ink-3">Tarif</div>
          <div className="text-base font-semibold text-ink num">{pct(rate, 2)}</div>
        </div>
        <div>
          <div className="text-xs text-ink-3">Pajak dipotong</div>
          <div className="text-base font-semibold text-ink num">{money(tax, entity.countryCode)}</div>
        </div>
        <div>
          <div className="text-xs text-ink-3">Diterima bersih</div>
          <div className="text-base font-semibold text-ink num">{money(amount - tax, entity.countryCode)}</div>
        </div>
      </div>
      <p className="text-xs text-ink-3">{basis}</p>
      <Button size="sm" icon={<Sparkles className="text-brand-600" />} onClick={() => ui.askCopilot(`Hitung dan jelaskan pajak atas dividen ${money(amount, entity.countryCode)} dari ${entity.legalName} kepada ${p.fullName} (residen ${p.taxResidency}). Sebutkan dasar hukum dan dokumen yang diperlukan.`)}>
        Jelaskan dengan Copilot
      </Button>
    </div>
  );
}

export function ShareholdersPage() {
  const ws = useWorkspace();
  const [q, setQ] = useState('');
  const [reveal, setReveal] = useState(false);
  const [selected, setSelected] = useState<Row | null>(null);
  const [addFor, setAddFor] = useState<string>('');
  const [adding, setAdding] = useState(false);

  const rows: Row[] = useMemo(
    () => ws.accessibleEntities.flatMap((entity) => entity.individualShareholders.map((p) => ({ p, entity }))),
    [ws.accessibleEntities],
  );
  const filtered = rows.filter(({ p, entity }) => !q.trim() || `${p.fullName} ${p.taxResidency} ${entity.legalName}`.toLowerCase().includes(q.toLowerCase()));
  const ubo = rows.filter(({ p }) => p.effectiveSharePercent >= 25 || p.type === 'Individual Shareholder (UBO)');
  const pep = rows.filter(({ p }) => !p.pepAndSanctionStatus.startsWith('Verified'));
  const kyc = rows.filter(({ p }) => !p.kycDocStatus.startsWith('Verified'));
  const foreign = rows.filter(({ p, entity }) => !isResident(p, entity));
  const addEntity = ws.entityById(addFor || ws.activeEntityId) ?? ws.activeEntity;
  const live = selected ? rows.find((r) => r.p.id === selected.p.id && r.entity.id === selected.entity.id) ?? selected : null;

  return (
    <div>
      <PageHeader
        title="Pemegang saham & pemilik manfaat"
        description="Register perorangan di seluruh entitas: kepemilikan efektif, status PEP/KYC, dan perlakuan pajak dividen. Identitas disamarkan secara default."
        actions={
          <>
            <Button icon={reveal ? <EyeOff /> : <Eye />} onClick={() => { setReveal((v) => !v); if (!reveal) ws.logAudit('REVEAL_PII', 'Register pemegang saham', 'Identitas pribadi ditampilkan tanpa masking.'); }}>
              {reveal ? 'Samarkan identitas' : 'Tampilkan identitas'}
            </Button>
            <Button variant="primary" icon={<Plus />} onClick={() => setAdding(true)}>Tambah</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <Stat label="Pemilik manfaat (≥ 25%)" value={ubo.length} hint={`dari ${rows.length} perorangan`} icon={<UserCheck />} />
        <Stat label="PEP — perlu EDD" value={pep.length} hint="Enhanced due diligence" icon={<ShieldAlert />} tone={pep.length ? 'warning' : undefined} />
        <Stat label="KYC belum lengkap" value={kyc.length} hint="Dokumen identitas belum diverifikasi" icon={<Users />} tone={kyc.length ? 'warning' : undefined} />
        <Stat label="Non-residen" value={foreign.length} hint="Dividen kena WHT / treaty" icon={<Globe2 />} />
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 px-5 py-3.5">
          <div className="w-full sm:w-80">
            <Input leading={<Search />} placeholder="Cari nama, residensi, entitas…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari pemegang saham" />
          </div>
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon={<Users />} title="Tidak ada pemegang saham" />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Nama</TH>
                <TH>Identitas</TH>
                <TH>Residensi pajak</TH>
                <TH align="right">Kepemilikan efektif</TH>
                <TH>Kepatuhan</TH>
              </tr>
            </THead>
            <tbody>
              {filtered.map((r) => (
                <TR key={`${r.entity.id}-${r.p.id}`} onClick={() => setSelected(r)}>
                  <TD>
                    <div className="flex items-center gap-2">
                      <span className="text-ink font-medium">{r.p.fullName}</span>
                      {r.p.effectiveSharePercent >= 25 && <Badge tone="brand">UBO</Badge>}
                    </div>
                    <div className="text-xs text-ink-3 truncate max-w-[340px]">{r.entity.flag} {r.entity.legalName} · {r.p.roleTitle}</div>
                  </TD>
                  <TD className="font-mono text-xs whitespace-nowrap">{reveal ? r.p.nationalIdOrPassport : mask(r.p.nationalIdOrPassport)}</TD>
                  <TD className="whitespace-nowrap">{r.p.taxResidency.split('(')[0]}</TD>
                  <TD align="right">
                    <div className="text-ink font-medium">{r.p.effectiveSharePercent}%</div>
                    <div className="text-xs text-ink-3">langsung {r.p.directSharePercent}%</div>
                  </TD>
                  <TD>
                    <div className="flex gap-1">
                      <Badge tone={r.p.pepAndSanctionStatus.startsWith('Verified') ? 'success' : 'warning'} dot>{r.p.pepAndSanctionStatus.startsWith('Verified') ? 'Non-PEP' : 'PEP'}</Badge>
                      <Badge tone={r.p.kycDocStatus.startsWith('Verified') ? 'success' : 'warning'} dot>{r.p.kycDocStatus.startsWith('Verified') ? 'KYC' : 'KYC pending'}</Badge>
                    </div>
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Sheet open={Boolean(live)} onClose={() => setSelected(null)} width="max-w-xl" title={live?.p.fullName} description={live ? `${live.entity.flag} ${live.entity.legalName}` : undefined}>
        {live && (
          <div className="p-6 space-y-6">
            {!live.p.pepAndSanctionStatus.startsWith('Verified') && (
              <Callout tone="warning" icon={<ShieldAlert />} title="Politically exposed person">Lakukan enhanced due diligence dan dokumentasikan sumber dana sebelum distribusi dividen.</Callout>
            )}
            <DescriptionList
              columns={2}
              items={[
                { label: 'Peran', value: live.p.roleTitle || '—' },
                { label: 'Jenis', value: live.p.type },
                { label: 'Kewarganegaraan', value: live.p.nationality },
                { label: 'Residensi pajak', value: live.p.taxResidency },
                { label: 'NIK / paspor', value: reveal ? live.p.nationalIdOrPassport : mask(live.p.nationalIdOrPassport), mono: true },
                { label: 'NPWP / TIN', value: reveal ? live.p.personalTaxId : mask(live.p.personalTaxId), mono: true },
                { label: 'Kepemilikan langsung', value: `${live.p.directSharePercent}%` },
                { label: 'Kepemilikan efektif', value: `${live.p.effectiveSharePercent}%` },
                { label: 'Hak suara', value: `${live.p.votingRightPercent}%` },
                { label: 'Rezim pajak dividen', value: live.p.dividendTaxRegime },
              ]}
            />
            <DividendSimulator row={live} />
          </div>
        )}
      </Sheet>

      {adding && !addFor && (
        <AddPicker
          onPick={(id) => setAddFor(id)}
          onClose={() => setAdding(false)}
        />
      )}
      <IndividualDialog
        open={adding && Boolean(addFor)}
        onClose={() => {
          setAdding(false);
          setAddFor('');
        }}
        entity={addEntity}
      />
    </div>
  );
}

function AddPicker({ onPick, onClose }: { onPick: (id: string) => void; onClose: () => void }) {
  const ws = useWorkspace();
  const [id, setId] = useState(ws.activeEntityId);
  return (
    <Dialog open onClose={onClose} size="sm" title="Tambah pemegang saham perorangan" description="Pilih entitas penerbit saham" footer={<><Button variant="ghost" onClick={onClose}>Batal</Button><Button variant="primary" onClick={() => onPick(id)}>Lanjut</Button></>}>
      <div>
        <SelectField label="Entitas" value={id} onChange={(e) => setId(e.target.value)}>
          {ws.accessibleEntities.map((e) => (
            <option key={e.id} value={e.id}>{e.flag} {e.legalName}</option>
          ))}
        </SelectField>
      </div>
    </Dialog>
  );
}
