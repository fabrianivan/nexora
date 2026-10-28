'use client';

import React, { useEffect, useState } from 'react';
import type { CorporateEntity, IndividualShareholder, IntermediateShareholder } from '@/data/entities';
import { MULTI_COUNTRY_DATA, type CountryCode } from '@/data/multiCountryTaxData';
import { useWorkspace } from '@/state/workspace';
import { useUi } from '@/state/ui';
import { money, moneyCompact, pct } from '@/lib/format';
import { toIdr, FX_NOTE } from '@/lib/fx';
import {
  Badge,
  Button,
  Callout,
  Dialog,
  SelectField,
  Table,
  TD,
  TextField,
  TH,
  THead,
  TR,
  TextareaField,
} from '@/ui';
import {
  COUNTRIES,
  TAX_ID_LABEL,
  TAX_ID_PLACEHOLDER,
  createEntity,
  emptyCorporateShareholder,
  emptyIndividual,
  subsidiaryNodeFor,
  validTaxId,
} from './helpers';
import { Lock } from 'lucide-react';

// ── Add entity / subsidiary ──────────────────────────────────────────────
export function AddEntityDialog({
  open,
  onClose,
  defaultParentId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  defaultParentId?: string | null;
  onCreated?: (e: CorporateEntity) => void;
}) {
  const ws = useWorkspace();
  const ui = useUi();
  const [form, setForm] = useState({
    legalName: '',
    tradeName: '',
    country: 'SG' as CountryCode,
    taxId: '',
    registrationNumber: '',
    address: '',
    parentId: (defaultParentId ?? 'ENT-ID-001') as string,
    ownership: '100',
    tpMethod: 'TNMM (Transactional Net Margin)',
    flow: 'Jasa manajemen & lisensi software',
  });
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setTouched(false);
      setForm((f) => ({ ...f, legalName: '', tradeName: '', taxId: '', registrationNumber: '', address: '', parentId: defaultParentId ?? 'ENT-ID-001' }));
    }
  }, [open, defaultParentId]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const errors = {
    legalName: form.legalName.trim().length < 3 ? 'Nama legal minimal 3 karakter' : '',
    taxId: !validTaxId(form.country, form.taxId) ? `Format ${TAX_ID_LABEL[form.country]} tidak valid` : '',
    address: form.address.trim().length < 5 ? 'Alamat wajib diisi' : '',
    ownership: form.parentId !== 'none' && (Number(form.ownership) <= 0 || Number(form.ownership) > 100) ? 'Kepemilikan 1–100%' : '',
  };
  const valid = !Object.values(errors).some(Boolean);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    const parent = form.parentId === 'none' ? undefined : ws.entityById(form.parentId);
    const entity = createEntity(
      {
        legalName: form.legalName,
        tradeName: form.tradeName,
        country: form.country,
        taxId: form.taxId,
        registrationNumber: form.registrationNumber,
        address: form.address,
        parentId: parent?.id ?? null,
        ownership: Number(form.ownership),
      },
      parent,
    );
    ws.saveEntity(entity);
    if (parent) {
      ws.saveEntity({
        ...parent,
        structureNodes: [
          ...parent.structureNodes,
          subsidiaryNodeFor(entity, parent, { transferPricingMethod: form.tpMethod as never, intercompanyTransaction: form.flow }),
        ],
      });
    }
    ws.logAudit('CREATE_ENTITY', entity.legalName, `Entitas ${entity.flag} ${entity.jurisdictionName} ditambahkan${parent ? ` sebagai anak usaha ${form.ownership}% ${parent.legalName}` : ''}.`);
    ui.toast(`${entity.legalName} ditambahkan. Lengkapi dokumen legalnya.`);
    onClose();
    onCreated?.(entity);
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title="Tambah entitas"
      description="Daftarkan induk atau anak usaha baru. Dokumen wajib akan dibuat sebagai daftar periksa."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button variant="primary" type="submit" form="add-entity-form">Simpan entitas</Button>
        </>
      }
    >
      <form id="add-entity-form" onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4" noValidate>
        <TextField label="Nama legal" value={form.legalName} onChange={set('legalName')} placeholder="Nusantara Pacific Pte. Ltd." error={touched && errors.legalName} className="sm:col-span-2" autoFocus />
        <TextField label="Nama dagang" value={form.tradeName} onChange={set('tradeName')} placeholder="Opsional" />
        <SelectField label="Yurisdiksi" value={form.country} onChange={set('country')}>
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {MULTI_COUNTRY_DATA[c].flag} {MULTI_COUNTRY_DATA[c].name} — {MULTI_COUNTRY_DATA[c].authorityShort}
            </option>
          ))}
        </SelectField>
        <TextField label={TAX_ID_LABEL[form.country]} value={form.taxId} onChange={set('taxId')} placeholder={TAX_ID_PLACEHOLDER[form.country]} mono error={touched && errors.taxId} />
        <TextField label="Nomor registrasi" value={form.registrationNumber} onChange={set('registrationNumber')} placeholder="NIB / ACRA / SSM / State file no." mono />
        <TextareaField label="Alamat terdaftar" value={form.address} onChange={set('address')} className="sm:col-span-2" rows={2} />
        {touched && errors.address && <p className="sm:col-span-2 -mt-3 text-xs text-danger-600">{errors.address}</p>}
        <SelectField label="Induk" value={form.parentId} onChange={set('parentId')}>
          <option value="none">— Tidak ada (induk grup baru)</option>
          {ws.entities.map((e) => (
            <option key={e.id} value={e.id}>
              {e.flag} {e.legalName}
            </option>
          ))}
        </SelectField>
        <TextField label="Kepemilikan induk (%)" type="number" min={1} max={100} value={form.ownership} onChange={set('ownership')} disabled={form.parentId === 'none'} error={touched && errors.ownership} />
        {form.parentId !== 'none' && (
          <>
            <SelectField label="Metode transfer pricing" value={form.tpMethod} onChange={set('tpMethod')}>
              <option>TNMM (Transactional Net Margin)</option>
              <option>CUP (Comparable Uncontrolled Price)</option>
              <option>Cost Plus 8% Markup</option>
              <option>Profit Split Method</option>
            </SelectField>
            <TextField label="Transaksi afiliasi utama" value={form.flow} onChange={set('flow')} />
          </>
        )}
      </form>
    </Dialog>
  );
}

// ── Corporate shareholder (add / edit) ───────────────────────────────────
export function CorporateShareholderDialog({
  open,
  onClose,
  entity,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  entity: CorporateEntity;
  initial?: IntermediateShareholder | null;
}) {
  const ws = useWorkspace();
  const ui = useUi();
  const [sh, setSh] = useState<IntermediateShareholder>(initial ?? emptyCorporateShareholder());
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (open) {
      setSh(initial ?? emptyCorporateShareholder());
      setTouched(false);
    }
  }, [open, initial]);

  const others = entity.intermediateShareholders.filter((x) => x.id !== sh.id).reduce((s, x) => s + x.sharePercent, 0);
  const total = others + Number(sh.sharePercent || 0);
  const nameErr = sh.name.trim().length < 3 ? 'Nama wajib diisi' : '';
  const pctErr = sh.sharePercent <= 0 || sh.sharePercent > 100 ? 'Persentase 0–100%' : '';

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (nameErr || pctErr) return;
    const exists = entity.intermediateShareholders.some((x) => x.id === sh.id);
    const list = exists ? entity.intermediateShareholders.map((x) => (x.id === sh.id ? sh : x)) : [...entity.intermediateShareholders, sh];
    ws.saveEntity({ ...entity, intermediateShareholders: list });
    ws.logAudit(exists ? 'UPDATE_SHAREHOLDER' : 'ADD_SHAREHOLDER', `${entity.legalName} · ${sh.name}`, `Kepemilikan ${sh.sharePercent}% (${sh.jurisdiction}).`);
    ui.toast(exists ? 'Pemegang saham diperbarui.' : 'Pemegang saham ditambahkan.');
    onClose();
  }

  const upd = (k: keyof IntermediateShareholder) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const v = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
    setSh((x) => ({ ...x, [k]: v, ...(k === 'sharePercent' ? { votingRightPercent: Number(v) } : {}) }));
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={initial ? 'Ubah pemegang saham korporasi' : 'Tambah pemegang saham korporasi'}
      description={`Pemegang saham langsung ${entity.legalName}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button variant="primary" type="submit" form="sh-form">Simpan</Button>
        </>
      }
    >
      <form id="sh-form" onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4" noValidate>
        <TextField label="Nama badan" value={sh.name} onChange={upd('name')} error={touched && nameErr} className="sm:col-span-2" autoFocus />
        <TextField label="Nomor registrasi" value={sh.registrationNo} onChange={upd('registrationNo')} mono />
        <TextField label="Identitas pajak" value={sh.taxId} onChange={upd('taxId')} mono />
        <SelectField label="Yurisdiksi" value={sh.jurisdiction} onChange={upd('jurisdiction')}>
          {['🇮🇩 Indonesia', '🇸🇬 Singapore', '🇲🇾 Malaysia', '🇺🇸 United States', '🇳🇱 Netherlands', '🇭🇰 Hong Kong', '🇻🇬 British Virgin Islands'].map((j) => (
            <option key={j}>{j}</option>
          ))}
        </SelectField>
        <TextField label="Kepemilikan (%)" type="number" min={0} max={100} step={0.1} value={sh.sharePercent} onChange={upd('sharePercent')} error={touched && pctErr} />
        <SelectField label="Risiko BEPS / treaty shopping" value={sh.bepsRisk} onChange={upd('bepsRisk')}>
          <option value="Low (Substantial Activity)">Rendah — aktivitas substantif</option>
          <option value="High (Conduit / Treaty Shopping Risk)">Tinggi — conduit / treaty shopping</option>
        </SelectField>
        <TextField label="Tanggal efektif" type="date" value={sh.effectiveDate} onChange={upd('effectiveDate')} />
        <TextField label="Email kontak" type="email" value={sh.contactEmail} onChange={upd('contactEmail')} className="sm:col-span-2" />
        <div className="sm:col-span-2">
          {Math.abs(total - 100) > 0.01 ? (
            <Callout tone="warning" title={`Total kepemilikan langsung menjadi ${total}%`}>
              Register pemegang saham seharusnya berjumlah 100%. Simpan tetap diizinkan untuk draf, tapi akan ditandai di struktur.
            </Callout>
          ) : (
            <Callout tone="success" title="Total kepemilikan langsung 100%" />
          )}
        </div>
      </form>
    </Dialog>
  );
}

// ── Individual shareholder / UBO ─────────────────────────────────────────
export function IndividualDialog({
  open,
  onClose,
  entity,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  entity: CorporateEntity;
  initial?: IndividualShareholder | null;
}) {
  const ws = useWorkspace();
  const ui = useUi();
  const [p, setP] = useState<IndividualShareholder>(initial ?? emptyIndividual());
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (open) {
      setP(initial ?? emptyIndividual());
      setTouched(false);
    }
  }, [open, initial]);
  const upd = (k: keyof IndividualShareholder) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const v = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
    setP((x) => ({ ...x, [k]: v, ...(k === 'directSharePercent' ? { votingRightPercent: Number(v) } : {}) }));
  };
  const nameErr = p.fullName.trim().length < 3 ? 'Nama wajib diisi' : '';
  const ubo = p.effectiveSharePercent >= 25;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (nameErr) return;
    const exists = entity.individualShareholders.some((x) => x.id === p.id);
    const next = { ...p, type: ubo ? ('Individual Shareholder (UBO)' as const) : p.type };
    const list = exists ? entity.individualShareholders.map((x) => (x.id === p.id ? next : x)) : [...entity.individualShareholders, next];
    ws.saveEntity({ ...entity, individualShareholders: list });
    ws.logAudit(exists ? 'UPDATE_UBO' : 'ADD_UBO', `${entity.legalName} · ${p.fullName}`, `Efektif ${p.effectiveSharePercent}% · ${p.taxResidency}`);
    ui.toast(exists ? 'Data pemilik manfaat diperbarui.' : 'Pemilik manfaat ditambahkan.');
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={initial ? 'Ubah pemegang saham perorangan' : 'Tambah pemegang saham perorangan'}
      description="Perpres 13/2018 — pemilik manfaat adalah individu dengan kepemilikan efektif ≥ 25% atau kendali."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button variant="primary" type="submit" form="ind-form">Simpan</Button>
        </>
      }
    >
      <form id="ind-form" onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4" noValidate>
        <TextField label="Nama lengkap" value={p.fullName} onChange={upd('fullName')} error={touched && nameErr} autoFocus />
        <TextField label="Jabatan / peran" value={p.roleTitle} onChange={upd('roleTitle')} />
        <SelectField label="Kewarganegaraan" value={p.nationality} onChange={upd('nationality')}>
          {['🇮🇩 Indonesia', '🇸🇬 Singapore', '🇲🇾 Malaysia', '🇺🇸 United States'].map((j) => <option key={j}>{j}</option>)}
        </SelectField>
        <SelectField label="Residensi pajak" value={p.taxResidency} onChange={upd('taxResidency')}>
          {['🇮🇩 Indonesia', '🇸🇬 Singapore', '🇲🇾 Malaysia', '🇺🇸 United States'].map((j) => <option key={j}>{j}</option>)}
        </SelectField>
        <TextField label="NIK / paspor" value={p.nationalIdOrPassport} onChange={upd('nationalIdOrPassport')} mono />
        <TextField label="NPWP / TIN pribadi" value={p.personalTaxId} onChange={upd('personalTaxId')} mono />
        <TextField label="Kepemilikan langsung (%)" type="number" min={0} max={100} step={0.1} value={p.directSharePercent} onChange={upd('directSharePercent')} />
        <TextField label="Kepemilikan efektif (%)" type="number" min={0} max={100} step={0.1} value={p.effectiveSharePercent} onChange={upd('effectiveSharePercent')} hint={ubo ? 'Memenuhi ambang pemilik manfaat (≥ 25%).' : 'Di bawah ambang 25%.'} />
        <SelectField label="Status PEP & sanksi" value={p.pepAndSanctionStatus} onChange={upd('pepAndSanctionStatus')}>
          <option value="Verified Clear (Non-PEP / FATF Safe)">Bersih (non-PEP)</option>
          <option value="Enhanced Due Diligence (PEP)">PEP — perlu EDD</option>
        </SelectField>
        <TextField label="Email" type="email" value={p.email} onChange={upd('email')} />
        <TextareaField label="Rezim pajak dividen" value={p.dividendTaxRegime} onChange={upd('dividendTaxRegime')} rows={2} className="sm:col-span-2" />
      </form>
    </Dialog>
  );
}

// ── Group consolidation ──────────────────────────────────────────────────
export function ConsolidationDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ws = useWorkspace();
  const rows = ws.entities.map((e) => {
    const c = MULTI_COUNTRY_DATA[e.countryCode].company;
    return {
      e,
      revenue: c.annualGrossRevenue,
      revenueIdr: toIdr(c.annualGrossRevenue, e.countryCode),
      taxPaid: c.ytdTaxPaid,
      taxPaidIdr: toIdr(c.ytdTaxPaid, e.countryCode),
      rate: MULTI_COUNTRY_DATA[e.countryCode].corporateTaxNormalRate,
      saving: MULTI_COUNTRY_DATA[e.countryCode].crossBorderTreatyNote.annualTreatySaving,
    };
  });
  const totalRevenue = rows.reduce((s, r) => s + r.revenueIdr, 0);
  const totalTax = rows.reduce((s, r) => s + r.taxPaidIdr, 0);
  const eurRevenue = totalRevenue / 17_600;
  const flows = ws.entities.flatMap((e) =>
    e.structureNodes
      .filter((n) => n.role !== 'Ultimate Parent' && n.entityName !== e.legalName)
      .map((n) => ({ from: e, node: n })),
  );

  return (
    <Dialog open={open} onClose={onClose} size="xl" title="Konsolidasi grup" description="Ringkasan fiskal lintas yurisdiksi, ambang Pillar Two, dan arus transaksi afiliasi." footer={<Button onClick={onClose}>Tutup</Button>}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="rounded-xl border border-line px-4 py-3">
          <div className="text-xs text-ink-3">Omzet konsolidasi (≈)</div>
          <div className="mt-1 text-xl font-semibold text-ink">{moneyCompact(totalRevenue)}</div>
        </div>
        <div className="rounded-xl border border-line px-4 py-3">
          <div className="text-xs text-ink-3">Pajak disetor YTD (≈)</div>
          <div className="mt-1 text-xl font-semibold text-ink">{moneyCompact(totalTax)}</div>
        </div>
        <div className="rounded-xl border border-line px-4 py-3">
          <div className="text-xs text-ink-3">Pillar Two (ambang €750 jt)</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xl font-semibold text-ink">€{(eurRevenue / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt</span>
            <Badge tone={eurRevenue >= 750e6 ? 'danger' : 'success'}>{eurRevenue >= 750e6 ? 'Wajib GloBE' : 'Di bawah ambang'}</Badge>
          </div>
        </div>
      </div>
      <Table className="-mx-6">
        <THead>
          <tr>
            <TH>Entitas</TH>
            <TH align="right">Kepemilikan</TH>
            <TH align="right">Omzet tahunan</TH>
            <TH align="right">Pajak disetor YTD</TH>
            <TH align="right">Tarif PPh badan</TH>
          </tr>
        </THead>
        <tbody>
          {rows.map((r) => (
            <TR key={r.e.id}>
              <TD>
                <div className="flex items-center gap-2.5">
                  <span>{r.e.flag}</span>
                  <div>
                    <div className="text-ink font-medium">{r.e.legalName}</div>
                    <div className="text-xs text-ink-3">{r.e.parentCompanyId ? 'Anak usaha' : 'Induk (UPE)'}</div>
                  </div>
                  {!ws.canAccess(r.e.id) && <Lock className="size-3.5 text-ink-4" />}
                </div>
              </TD>
              <TD align="right">{r.e.parentCompanyId ? `${r.e.ownershipByParent}%` : '—'}</TD>
              <TD align="right">
                <div className="text-ink">{money(r.revenue, r.e.countryCode)}</div>
                {r.e.countryCode !== 'ID' && <div className="text-xs text-ink-3">≈ {moneyCompact(r.revenueIdr)}</div>}
              </TD>
              <TD align="right">
                <div className="text-ink">{money(r.taxPaid, r.e.countryCode)}</div>
                {r.e.countryCode !== 'ID' && <div className="text-xs text-ink-3">≈ {moneyCompact(r.taxPaidIdr)}</div>}
              </TD>
              <TD align="right">{pct(r.rate)}</TD>
            </TR>
          ))}
        </tbody>
      </Table>

      <h3 className="mt-6 mb-2 text-sm font-semibold text-ink">Transaksi afiliasi lintas negara</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {flows.map(({ from, node }) => (
          <div key={`${from.id}-${node.id}`} className="rounded-xl border border-line px-4 py-3 text-[13px]">
            <div className="font-medium text-ink">
              {from.flag} → {node.flag} {node.entityName}
            </div>
            <div className="text-ink-3 mt-0.5">{node.intercompanyTransaction}</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge>{node.transferPricingMethod.split(' (')[0]}</Badge>
              <Badge tone={node.treatyFormStatus.startsWith('Verified') ? 'success' : 'warning'}>WHT treaty {node.whtTreatyRate.split(' ')[0]}</Badge>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-ink-4">{FX_NOTE} · €1 ≈ Rp 17.600.</p>
    </Dialog>
  );
}

// ── Restricted access ────────────────────────────────────────────────────
export function RestrictedDialog({ entity, onClose }: { entity: CorporateEntity | null; onClose: () => void }) {
  const ws = useWorkspace();
  return (
    <Dialog
      open={Boolean(entity)}
      onClose={onClose}
      size="sm"
      title="Akses dibatasi"
      footer={<Button onClick={onClose}>Mengerti</Button>}
    >
      <div className="flex items-start gap-3">
        <span className="size-9 rounded-lg bg-warning-50 text-warning-600 flex items-center justify-center shrink-0">
          <Lock className="size-4" />
        </span>
        <p className="text-sm text-ink-2">
          Peran <strong className="text-ink">{ws.persona.title}</strong> hanya dapat membuka entitas dalam yurisdiksinya. Data{' '}
          <strong className="text-ink">{entity?.legalName}</strong> memerlukan otorisasi Group CEO/CFO induk sesuai segregasi ISO 27001.
        </p>
      </div>
    </Dialog>
  );
}
