'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Building2, Check, Search, UserRound } from 'lucide-react';
import { useWorkspace } from '@/state/workspace';
import { useUi } from '@/state/ui';
import {
  computeOwnershipChain,
  remainingOwnership,
  wouldCreateCycle,
  type OwnershipLink,
  type PartyProfile,
} from '@/lib/ownershipChain';
import { Badge, Button, Callout, Dialog, Input, SelectField, Tabs, TextField, cn } from '@/ui';

type FlowTab = 'search' | 'new_individual' | 'new_corporate';

export interface ShareholderFlowModalProps {
  open: boolean;
  onClose: () => void;
  /** Target entity (CorporateEntity.id or corporate PartyProfile.id) receiving the owner link. */
  targetId: string;
  targetName: string;
  /** Context label for relationship preview, e.g. root company name. */
  rootCompanyId: string;
  rootCompanyName: string;
  /** 'direct' = adding to target company (03/03b/03c); 'intermediate' = adding to corporate/intermediate (05/06); 'trace' = tracing untraced leaf (06b). */
  mode: 'direct' | 'intermediate' | 'trace';
  /** Multiplier ratio from targetId down to rootCompany (1 for direct, 0.2 for 20% corp shareholder, etc.). */
  parentEffectiveRatio?: number;
  issuedShares?: number;
  onOpenNewCorporateWorkspace?: () => void;
  onLinked?: (ownerProfile: PartyProfile, link: OwnershipLink) => void;
}

export function ShareholderFlowModal({
  open,
  onClose,
  targetId,
  targetName,
  rootCompanyId,
  rootCompanyName,
  mode,
  parentEffectiveRatio = 1,
  issuedShares = 20_000,
  onOpenNewCorporateWorkspace,
  onLinked,
}: ShareholderFlowModalProps) {
  const ws = useWorkspace();
  const ui = useUi();

  const [tab, setTab] = useState<FlowTab>('search');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>('');
  const [percentStr, setPercentStr] = useState<string>('');
  const [sharesStr, setSharesStr] = useState<string>('');
  const [shareClass, setShareClass] = useState('Ordinary');

  // New individual fields
  const [indName, setIndName] = useState('');
  const [indDob, setIndDob] = useState('');
  const [indNationality, setIndNationality] = useState('Indonesia');
  const [indIdType, setIndIdType] = useState('NIK / KTP');
  const [indIdNum, setIndIdNum] = useState('');
  const [indEmail, setIndEmail] = useState('');
  const [indAddress, setIndAddress] = useState('');

  // New corporate intermediate fields
  const [corpName, setCorpName] = useState('');
  const [corpReg, setCorpReg] = useState('');
  const [corpJur, setCorpJur] = useState('Singapore');
  const [corpIncDate, setCorpIncDate] = useState('');
  const [corpAddress, setCorpAddress] = useState('');
  const [corpDirectorId, setCorpDirectorId] = useState('');

  const remainingPct = useMemo(
    () => remainingOwnership(ws.ownership.links, targetId),
    [ws.ownership.links, targetId],
  );

  useEffect(() => {
    if (!open) return;
    setTab('search');
    setQuery('');
    setSelectedId('');
    const defaultPct = remainingPct > 0 ? Math.min(remainingPct, 10) : 0;
    setPercentStr(defaultPct ? String(defaultPct) : '');
    setSharesStr(defaultPct && issuedShares ? String(Math.round((defaultPct / 100) * issuedShares)) : '');
    setShareClass('Ordinary');
    setIndName('');
    setIndDob('');
    setIndNationality('Indonesia');
    setIndIdType('NIK / KTP');
    setIndIdNum('');
    setIndEmail('');
    setIndAddress('');
    setCorpName('');
    setCorpReg('');
    setCorpJur('Singapore');
    setCorpIncDate('');
    setCorpAddress('');
    setCorpDirectorId('');
  }, [open, remainingPct, issuedShares]);

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ws.ownership.profiles.filter((p) => {
      if (mode === 'intermediate' && p.kind !== 'corporate') return false;
      if (!q) return true;
      return `${p.legalName} ${p.registrationOrIdNumber} ${p.jurisdictionOrNationality} ${p.email}`
        .toLowerCase()
        .includes(q);
    });
  }, [ws.ownership.profiles, query, mode]);

  const individualsList = useMemo(
    () => ws.ownership.profiles.filter((p) => p.kind === 'individual'),
    [ws.ownership.profiles],
  );

  const selectedProfile = ws.ownership.profiles.find((p) => p.id === selectedId) ?? null;

  // Numeric sync between % and shares
  const pctNum = Number(percentStr) || 0;
  const effectivePreview = Number((pctNum * parentEffectiveRatio).toFixed(2));
  const exceedsRemaining = pctNum > remainingPct + 0.001;
  const invalidPct = pctNum <= 0 || pctNum > 100 || exceedsRemaining;

  const rootEntity = ws.entityById(rootCompanyId);
  const currentChain = useMemo(
    () => (rootEntity ? computeOwnershipChain(ws.ownership, rootEntity) : null),
    [rootEntity, ws.ownership],
  );
  const existingEffectiveForSelected = useMemo(() => {
    if (!selectedProfile || !currentChain) return 0;
    return currentChain.individuals.find((i) => i.profileId === selectedProfile.id)?.effectivePercent ?? 0;
  }, [selectedProfile, currentChain]);

  const totalEffectiveWithSelected = Number((existingEffectiveForSelected + effectivePreview).toFixed(2));

  const onSharesChange = (val: string) => {
    setSharesStr(val);
    const num = Number(val);
    if (issuedShares > 0 && Number.isFinite(num)) {
      setPercentStr(String(Number(((num / issuedShares) * 100).toFixed(2))));
    }
  };

  const onPercentChange = (val: string) => {
    setPercentStr(val);
    const num = Number(val);
    if (issuedShares > 0 && Number.isFinite(num)) {
      setSharesStr(String(Math.round((num / 100) * issuedShares)));
    }
  };

  const linkOwner = (profile: PartyProfile) => {
    if (invalidPct) return;
    if (wouldCreateCycle(ws.ownership.links, targetId, profile.id)) {
      ui.toast('Tidak dapat ditautkan: entitas akan memiliki dirinya sendiri dalam rantai.', 'danger');
      return;
    }
    const link: OwnershipLink = {
      id: `LNK-${Date.now().toString(36).toUpperCase()}`,
      targetId,
      ownerId: profile.id,
      percent: Number(pctNum.toFixed(2)),
      sharesHeld: Number(sharesStr) || undefined,
      shareClass,
    };
    ws.updateOwnership((prev) => ({
      ...prev,
      links: [...prev.links, link],
    }));
    ws.logAudit('LINK_SHAREHOLDER', `${targetName} ← ${profile.legalName}`, `Kepemilikan ${link.percent}% ditambahkan ke rantai kepemilikan.`);
    ui.toast(`${profile.legalName} (${link.percent}%) ditambahkan.`);
    onLinked?.(profile, link);
    onClose();
  };

  const createAndLinkIndividual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!indName.trim() || !indIdNum.trim() || !indAddress.trim() || invalidPct) return;
    const profile: PartyProfile = {
      id: `PTY-IND-${Date.now().toString(36).toUpperCase()}`,
      kind: 'individual',
      legalName: indName.trim(),
      registrationOrIdNumber: indIdNum.trim(),
      idType: indIdType,
      jurisdictionOrNationality: indNationality,
      dateOfBirthOrIncorporation: indDob || '1985-01-01',
      email: indEmail.trim() || '-',
      address: indAddress.trim(),
      status: 'Active',
      directorIds: [],
    };
    const link: OwnershipLink = {
      id: `LNK-${Date.now().toString(36).toUpperCase()}`,
      targetId,
      ownerId: profile.id,
      percent: Number(pctNum.toFixed(2)),
      sharesHeld: Number(sharesStr) || undefined,
      shareClass,
    };
    ws.updateOwnership((prev) => ({
      ...prev,
      profiles: [...prev.profiles, profile],
      links: [...prev.links, link],
    }));
    ws.logAudit('CREATE_INDIVIDUAL_SHAREHOLDER', profile.legalName, `Profil baru dibuat dan ditautkan ke ${targetName} (${link.percent}%).`);
    ui.toast(`${profile.legalName} dibuat dan ditautkan.`);
    onLinked?.(profile, link);
    onClose();
  };

  const createAndLinkCorporate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!corpName.trim() || !corpReg.trim() || invalidPct) return;
    const profile: PartyProfile = {
      id: `PTY-CORP-${Date.now().toString(36).toUpperCase()}`,
      kind: 'corporate',
      legalName: corpName.trim(),
      registrationOrIdNumber: corpReg.trim(),
      idType: 'Nomor registrasi badan',
      jurisdictionOrNationality: corpJur,
      dateOfBirthOrIncorporation: corpIncDate || new Date().toISOString().slice(0, 10),
      email: '',
      address: corpAddress.trim() || corpJur,
      status: 'Active',
      directorIds: corpDirectorId ? [corpDirectorId] : [],
    };
    const link: OwnershipLink = {
      id: `LNK-${Date.now().toString(36).toUpperCase()}`,
      targetId,
      ownerId: profile.id,
      percent: Number(pctNum.toFixed(2)),
      sharesHeld: Number(sharesStr) || undefined,
      shareClass,
    };
    ws.updateOwnership((prev) => ({
      ...prev,
      profiles: [...prev.profiles, profile],
      links: [...prev.links, link],
    }));
    ws.logAudit('CREATE_INTERMEDIATE_ENTITY', profile.legalName, `Entitas korporasi baru dibuat dan ditautkan ke ${targetName} (${link.percent}%).`);
    ui.toast(`${profile.legalName} dibuat dan ditautkan.`);
    onLinked?.(profile, link);
    onClose();
  };

  const title =
    mode === 'trace'
      ? `Siapa pemilik ${targetName}?`
      : mode === 'intermediate'
        ? 'Tautkan pemegang saham perantara'
        : 'Tambah pemegang saham';

  const description =
    mode === 'trace'
      ? `Sisa ${remainingPct}% kepemilikan ${targetName} belum tercatat. Telusuri hingga perorangan untuk melengkapi UBO.`
      : mode === 'intermediate'
        ? `Tambahkan pemilik badan usaha ke ${targetName}. Sisa ${remainingPct}% belum tercatat.`
        : `${targetName} · sisa ${remainingPct}% kepemilikan belum dialokasikan.`;

  const tabItems: { id: FlowTab; label: string }[] = [
    { id: 'search', label: 'Cari yang ada' },
    ...(mode !== 'intermediate' ? [{ id: 'new_individual' as const, label: 'Perorangan baru' }] : []),
    { id: 'new_corporate', label: mode === 'direct' ? 'Pemegang saham korporasi baru' : 'Entitas korporasi baru' },
  ];

  const renderPercentControls = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <TextField
          label={`Kepemilikan di ${targetName} (%) *`}
          type="number"
          min={0.1}
          max={100}
          step={0.1}
          value={percentStr}
          onChange={(e) => onPercentChange(e.target.value)}
          error={
            exceedsRemaining
              ? `Hanya ${remainingPct}% yang belum tercatat. Turunkan nilai ini atau ubah pemilik lain.`
              : pctNum <= 0 && percentStr !== ''
                ? 'Masukkan persentase lebih dari 0%'
                : undefined
          }
        />
        {mode === 'direct' && (
          <>
            <TextField
              label="Jumlah saham"
              type="number"
              min={0}
              value={sharesStr}
              onChange={(e) => onSharesChange(e.target.value)}
              hint={`Dari ${issuedShares.toLocaleString('id-ID')} saham`}
            />
            <SelectField label="Kelas saham" value={shareClass} onChange={(e) => setShareClass(e.target.value)}>
              <option value="Ordinary">Saham Biasa (Ordinary)</option>
              <option value="Preference">Saham Preferen</option>
              <option value="Common Stock">Common Stock</option>
            </SelectField>
          </>
        )}
      </div>

      {pctNum > 0 && !exceedsRemaining && (
        <div className="rounded-lg border border-line bg-subtle px-4 py-3 text-xs space-y-1">
          <div className="eyebrow !text-[10px]">Pratinjau kepemilikan efektif di {rootCompanyName}</div>
          <div className="font-serif text-[20px] text-ink">
            {pctNum}%{parentEffectiveRatio < 1 ? ` × ${Number((parentEffectiveRatio * 100).toFixed(2))}%` : ''} ={' '}
            <strong>{effectivePreview}%</strong> efektif
          </div>
          {selectedProfile?.kind === 'individual' && (
            <div className="text-ink-3">
              Total kepemilikan {selectedProfile.legalName} (termasuk jalur lain):{' '}
              <strong className="text-ink">{totalEffectiveWithSelected}%</strong>{' '}
              {totalEffectiveWithSelected > 25 ? '(Terklasifikasi UBO > 25%)' : '(Di bawah ambang UBO 25%)'}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={open} onClose={onClose} size="lg" title={title} description={description}>
      <div className="space-y-5">
        <Tabs<FlowTab> value={tab} onChange={setTab} items={tabItems} />

        {tab === 'search' && (
          <div className="space-y-4">
            <Input
              leading={<Search />}
              placeholder="Cari nama badan, nama perorangan, atau nomor registrasi…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />

            {candidates.length === 0 ? (
              <div className="rounded-lg border border-dashed border-line-strong bg-subtle p-5 text-center space-y-3">
                <div className="text-sm font-medium text-ink">
                  Tidak ada profil cocok dengan “{query}”
                </div>
                <p className="text-xs text-ink-3">
                  Profil dibuat sekali dan dapat dipakai ulang oleh seluruh perusahaan di ruang kerja.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {mode !== 'intermediate' && (
                    <Button size="sm" icon={<UserRound />} onClick={() => setTab('new_individual')}>
                      Perorangan baru
                    </Button>
                  )}
                  <Button size="sm" variant="primary" icon={<Building2 />} onClick={() => setTab('new_corporate')}>
                    {mode === 'direct' ? 'Pemegang saham korporasi baru' : 'Entitas korporasi baru'}
                  </Button>
                </div>
              </div>
            ) : (
              <ul className="max-h-64 overflow-y-auto divide-y divide-line rounded-lg border border-line">
                {candidates.map((p) => {
                  const cycle = wouldCreateCycle(ws.ownership.links, targetId, p.id);
                  const alreadyDirect = ws.ownership.links.some((l) => l.targetId === targetId && l.ownerId === p.id);
                  const blocked = cycle || alreadyDirect;
                  const active = selectedId === p.id;
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        disabled={blocked}
                        onClick={() => setSelectedId(p.id)}
                        className={cn(
                          'w-full px-4 py-3 text-left flex items-center justify-between gap-3 transition',
                          blocked ? 'opacity-65 bg-subtle cursor-not-allowed' : 'hover:bg-subtle cursor-pointer',
                          active && 'bg-brand-50/50',
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="size-8 rounded-md bg-muted text-ink-2 flex items-center justify-center shrink-0">
                            {p.kind === 'corporate' ? <Building2 className="size-4" /> : <UserRound className="size-4" />}
                          </span>
                          <div className="min-w-0">
                            <div className="text-[13.5px] font-medium text-ink truncate">{p.legalName}</div>
                            <div className="text-xs text-ink-3 truncate">
                              <span className="font-mono">{p.registrationOrIdNumber}</span> · {p.jurisdictionOrNationality} ·{' '}
                              {p.kind === 'corporate' ? 'Entitas korporasi' : 'Perorangan'}
                            </div>
                            {cycle && (
                              <div className="mt-1 inline-flex items-center gap-1 text-[11.5px] text-danger-600">
                                <AlertCircle className="size-3" />
                                Tidak dapat ditautkan: {p.legalName} sudah berada di rantai kepemilikan ini (mencegah loop).
                              </div>
                            )}
                            {!cycle && alreadyDirect && (
                              <div className="mt-1 text-[11.5px] text-ink-3">Sudah tercatat sebagai pemilik langsung.</div>
                            )}
                          </div>
                        </div>
                        {cycle ? (
                          <Badge tone="danger">Dalam rantai ini</Badge>
                        ) : active ? (
                          <Badge tone="brand">
                            <Check className="size-3" /> Dipilih
                          </Badge>
                        ) : (
                          <span className="text-xs font-medium text-brand-700 shrink-0">Pilih</span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {selectedProfile && (
              <>
                {renderPercentControls()}
                <Callout tone={selectedProfile.kind === 'corporate' ? 'warning' : 'success'} title={selectedProfile.kind === 'corporate' ? 'Lanjutkan penelusuran rantai' : 'Rantai berakhir pada perorangan'}>
                  {selectedProfile.kind === 'corporate'
                    ? `Profil ${selectedProfile.legalName} akan dipakai ulang. Karena berbentuk korporasi, Nexora menelusuri pemiliknya hingga ke perorangan.`
                    : `Profil ${selectedProfile.legalName} akan dipakai ulang dan menyelesaikan jalur kepemilikan sebesar ${effectivePreview}%.`}
                </Callout>
              </>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
              <Button variant="ghost" onClick={onClose}>Batal</Button>
              <Button
                variant="primary"
                disabled={!selectedProfile || invalidPct}
                onClick={() => selectedProfile && linkOwner(selectedProfile)}
              >
                Simpan pemilik
              </Button>
            </div>
          </div>
        )}

        {tab === 'new_individual' && (
          <form onSubmit={createAndLinkIndividual} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <TextField label="Nama legal lengkap *" placeholder="Sesuai KTP atau paspor" value={indName} onChange={(e) => setIndName(e.target.value)} className="sm:col-span-2" required />
              <TextField label="Tanggal lahir *" type="date" value={indDob} onChange={(e) => setIndDob(e.target.value)} />
              <SelectField label="Kewarganegaraan *" value={indNationality} onChange={(e) => setIndNationality(e.target.value)}>
                <option value="Indonesia">Indonesia</option>
                <option value="Singapore">Singapura</option>
                <option value="Malaysia">Malaysia</option>
                <option value="United States">Amerika Serikat</option>
              </SelectField>
              <SelectField label="Jenis dokumen ID *" value={indIdType} onChange={(e) => setIndIdType(e.target.value)}>
                <option value="NIK / KTP">NIK / KTP</option>
                <option value="Paspor">Paspor</option>
                <option value="Singapore NRIC">Singapore NRIC</option>
                <option value="MyKad">MyKad</option>
              </SelectField>
              <TextField label="Nomor identitas *" mono placeholder="317401..." value={indIdNum} onChange={(e) => setIndIdNum(e.target.value)} required />
              <TextField label="Email" type="email" placeholder="nama@perusahaan.com" value={indEmail} onChange={(e) => setIndEmail(e.target.value)} />
              <TextField label="Alamat domisili *" placeholder="Alamat lengkap sesuai dokumen" value={indAddress} onChange={(e) => setIndAddress(e.target.value)} required />
            </div>

            {renderPercentControls()}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
              <Button variant="ghost" onClick={onClose}>Batal</Button>
              <Button
                type="submit"
                variant="primary"
                disabled={!indName.trim() || !indIdNum.trim() || !indAddress.trim() || invalidPct}
              >
                Buat & tambahkan
              </Button>
            </div>
          </form>
        )}

        {tab === 'new_corporate' && (
          <div className="space-y-4">
            {mode === 'direct' && onOpenNewCorporateWorkspace && (
              <Callout
                tone="brand"
                title="Butuh ruang kerja penuh 5 langkah untuk pemegang saham korporasi?"
                action={
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      onClose();
                      onOpenNewCorporateWorkspace();
                    }}
                  >
                    Buka formulir korporasi penuh
                  </Button>
                }
              >
                Gunakan formulir korporasi penuh untuk mencatat detail legal, pemegang saham perantara, direksi penanda tangan D9/D100, dan dokumen pendukung sekaligus.
              </Callout>
            )}

            <form onSubmit={createAndLinkCorporate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <TextField label="Nama legal badan *" placeholder="Lotus Holdings Ltd." value={corpName} onChange={(e) => setCorpName(e.target.value)} required />
                <TextField label="Nomor registrasi *" mono placeholder="mis. 2019-04471" value={corpReg} onChange={(e) => setCorpReg(e.target.value)} required />
                <SelectField label="Yurisdiksi *" value={corpJur} onChange={(e) => setCorpJur(e.target.value)}>
                  <option value="Indonesia">Indonesia</option>
                  <option value="Singapore">Singapura</option>
                  <option value="Malaysia">Malaysia</option>
                  <option value="United States">Amerika Serikat</option>
                  <option value="British Virgin Islands">British Virgin Islands</option>
                  <option value="Netherlands">Belanda</option>
                </SelectField>
                <TextField label="Tanggal pendirian" type="date" value={corpIncDate} onChange={(e) => setCorpIncDate(e.target.value)} />
                <TextField label="Alamat terdaftar" placeholder="Alamat kantor terdaftar" value={corpAddress} onChange={(e) => setCorpAddress(e.target.value)} className="sm:col-span-2" />
                <SelectField label="Direktur penanda tangan D9 (opsional)" value={corpDirectorId} onChange={(e) => setCorpDirectorId(e.target.value)} className="sm:col-span-2">
                  <option value="">— Tambahkan nanti (D9 menunggu hingga direktur diisi) —</option>
                  {individualsList.map((ind) => (
                    <option key={ind.id} value={ind.id}>
                      {ind.legalName}
                    </option>
                  ))}
                </SelectField>
              </div>

              {renderPercentControls()}

              <Callout tone="neutral">
                <strong>{corpName.trim() || 'Entitas korporasi baru'}</strong> akan ditautkan ke <strong>{targetName}</strong>. Karena berbentuk korporasi, Nexora menandai jalurnya sebagai belum tertelusur sampai pemilik akhirnya dicatat.
              </Callout>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
                <Button variant="ghost" onClick={onClose}>Batal</Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={!corpName.trim() || !corpReg.trim() || invalidPct}
                >
                  Buat & tautkan entitas
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </Dialog>
  );
}
