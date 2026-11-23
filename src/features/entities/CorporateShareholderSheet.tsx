'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Building2, Check, FileText, Plus, Trash2, UserPlus, UserRound } from 'lucide-react';
import { useWorkspace } from '@/state/workspace';
import { useUi } from '@/state/ui';
import { remainingOwnership, type PartyProfile } from '@/lib/ownershipChain';
import { Badge, Button, Callout, Card, CardBody, CardHeader, SelectField, Sheet, TextField, cn } from '@/ui';
import { ShareholderFlowModal } from './ShareholderFlowModal';

export function CorporateShareholderSheet({
  open,
  onClose,
  targetCompanyId,
  targetCompanyName,
  issuedShares,
  /** Pass null to create a brand-new corporate shareholder for targetCompanyId; pass profileId to edit an existing one. */
  corporateProfileId,
}: {
  open: boolean;
  onClose: () => void;
  targetCompanyId: string;
  targetCompanyName: string;
  issuedShares: number;
  corporateProfileId: string | null;
}) {
  const ws = useWorkspace();
  const ui = useUi();

  const existingProfile = corporateProfileId
    ? ws.ownership.profiles.find((p) => p.id === corporateProfileId) ?? null
    : null;
  const existingLink = corporateProfileId
    ? ws.ownership.links.find((l) => l.targetId === targetCompanyId && l.ownerId === corporateProfileId) ?? null
    : null;

  const [legalName, setLegalName] = useState('');
  const [regNo, setRegNo] = useState('');
  const [jurisdiction, setJurisdiction] = useState('Singapore');
  const [incDate, setIncDate] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [percentStr, setPercentStr] = useState('10');
  const [shareClass, setShareClass] = useState('Ordinary');
  const [selectedDirectorId, setSelectedDirectorId] = useState('');

  const [subModal, setSubModal] = useState<{ mode: 'intermediate' | 'trace'; targetId: string; targetName: string; ratio: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    if (existingProfile) {
      setLegalName(existingProfile.legalName);
      setRegNo(existingProfile.registrationOrIdNumber);
      setJurisdiction(existingProfile.jurisdictionOrNationality);
      setIncDate(existingProfile.dateOfBirthOrIncorporation);
      setEmail(existingProfile.email);
      setPhone(existingProfile.contactPhone ?? '');
      setAddress(existingProfile.address);
      setPercentStr(existingLink ? String(existingLink.percent) : '10');
      setShareClass(existingLink?.shareClass ?? 'Ordinary');
    } else {
      const rem = remainingOwnership(ws.ownership.links, targetCompanyId);
      setLegalName('');
      setRegNo('');
      setJurisdiction('Singapore');
      setIncDate(new Date().toISOString().slice(0, 10));
      setEmail('');
      setPhone('');
      setAddress('');
      setPercentStr(String(rem > 0 ? Math.min(20, rem) : 10));
      setShareClass('Ordinary');
    }
    setSelectedDirectorId('');
  }, [open, existingProfile, existingLink, targetCompanyId, ws.ownership.links]);

  const currentId = existingProfile?.id ?? '';
  const profileMap = useMemo(() => new Map(ws.ownership.profiles.map((p) => [p.id, p])), [ws.ownership.profiles]);
  const intermediateLinks = useMemo(
    () => (currentId ? ws.ownership.links.filter((l) => l.targetId === currentId) : []),
    [ws.ownership.links, currentId],
  );
  const recordedIntermediatePct = Number(intermediateLinks.reduce((s, l) => s + l.percent, 0).toFixed(2));
  const tracedIntermediatePct = useMemo(() => {
    if (!currentId) return 0;
    return Number(
      intermediateLinks
        .reduce((s, l) => {
          const owner = profileMap.get(l.ownerId);
          if (!owner) return s;
          if (owner.kind === 'individual') return s + l.percent;
          const subTotal = ws.ownership.links.filter((sl) => sl.targetId === owner.id).reduce((x, sl) => x + sl.percent, 0);
          return s + (l.percent * Math.min(100, subTotal)) / 100;
        }, 0)
        .toFixed(1),
    );
  }, [currentId, intermediateLinks, profileMap, ws.ownership.links]);

  const remainingTargetPct = remainingOwnership(ws.ownership.links, targetCompanyId, existingLink?.id);
  const holdingPct = Number(percentStr) || 0;
  const directors = (existingProfile?.directorIds ?? []).map((id) => profileMap.get(id)).filter((p): p is PartyProfile => Boolean(p));
  const availableIndividuals = ws.ownership.profiles.filter(
    (p) => p.kind === 'individual' && !(existingProfile?.directorIds ?? []).includes(p.id),
  );

  const canSave = legalName.trim().length >= 2 && regNo.trim().length >= 2 && holdingPct > 0 && holdingPct <= remainingTargetPct + 0.001;

  const saveCorporate = (asDraft = false) => {
    if (!legalName.trim()) return;
    const pct = Math.max(0.1, Math.min(100, holdingPct || 10));
    const shares = issuedShares > 0 ? Math.round((pct / 100) * issuedShares) : undefined;
    if (existingProfile) {
      ws.updateOwnership((prev) => ({
        ...prev,
        profiles: prev.profiles.map((p) =>
          p.id === existingProfile.id
            ? {
                ...p,
                legalName: legalName.trim(),
                registrationOrIdNumber: regNo.trim(),
                jurisdictionOrNationality: jurisdiction,
                dateOfBirthOrIncorporation: incDate,
                email: email.trim(),
                contactPhone: phone.trim(),
                address: address.trim(),
                status: asDraft ? 'Draft' : 'Active',
              }
            : p,
        ),
        links: existingLink
          ? prev.links.map((l) => (l.id === existingLink.id ? { ...l, percent: pct, sharesHeld: shares, shareClass } : l))
          : [...prev.links, { id: `LNK-${Date.now().toString(36).toUpperCase()}`, targetId: targetCompanyId, ownerId: existingProfile.id, percent: pct, sharesHeld: shares, shareClass }],
      }));
      ws.logAudit('UPDATE_CORPORATE_SHAREHOLDER', legalName.trim(), `Profil pemegang saham korporasi di ${targetCompanyName} diperbarui (${pct}%).`);
      ui.toast(`${legalName.trim()} disimpan.`);
    } else {
      const id = `PTY-CORP-${Date.now().toString(36).toUpperCase()}`;
      const newProfile: PartyProfile = {
        id,
        kind: 'corporate',
        legalName: legalName.trim(),
        registrationOrIdNumber: regNo.trim() || 'DRAFT',
        idType: 'Nomor registrasi badan',
        jurisdictionOrNationality: jurisdiction,
        dateOfBirthOrIncorporation: incDate || new Date().toISOString().slice(0, 10),
        email: email.trim(),
        contactPhone: phone.trim(),
        address: address.trim(),
        status: asDraft ? 'Draft' : 'Active',
        directorIds: [],
      };
      ws.updateOwnership((prev) => ({
        ...prev,
        profiles: [...prev.profiles, newProfile],
        links: [
          ...prev.links,
          { id: `LNK-${Date.now().toString(36).toUpperCase()}`, targetId: targetCompanyId, ownerId: id, percent: pct, sharesHeld: shares, shareClass },
        ],
      }));
      ws.logAudit('CREATE_CORPORATE_SHAREHOLDER', legalName.trim(), `Pemegang saham korporasi ditambahkan ke ${targetCompanyName} (${pct}%).`);
      ui.toast(`${legalName.trim()} disimpan. Tambahkan pemilik perantara atau direksi kapan saja.`);
    }
    onClose();
  };

  const addDirector = () => {
    if (!existingProfile || !selectedDirectorId) return;
    ws.updateOwnership((prev) => ({
      ...prev,
      profiles: prev.profiles.map((p) =>
        p.id === existingProfile.id && !p.directorIds.includes(selectedDirectorId)
          ? { ...p, directorIds: [...p.directorIds, selectedDirectorId] }
          : p,
      ),
    }));
    const dir = profileMap.get(selectedDirectorId);
    ws.logAudit('ADD_CORPORATE_DIRECTOR', existingProfile.legalName, `${dir?.legalName ?? selectedDirectorId} ditambahkan sebagai direktur.`);
    setSelectedDirectorId('');
    ui.toast('Direktur ditambahkan.');
  };

  const removeDirector = (dirId: string) => {
    if (!existingProfile) return;
    ws.updateOwnership((prev) => ({
      ...prev,
      profiles: prev.profiles.map((p) =>
        p.id === existingProfile.id ? { ...p, directorIds: p.directorIds.filter((id) => id !== dirId) } : p,
      ),
    }));
  };

  const removeIntermediateLink = (linkId: string) => {
    ws.updateOwnership((prev) => ({
      ...prev,
      links: prev.links.filter((l) => l.id !== linkId),
    }));
    ui.toast('Tautan pemegang saham perantara dihapus.', 'info');
  };

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        width="max-w-4xl"
        title={legalName.trim() || 'Pemegang saham korporasi baru'}
        description={`Pemegang saham korporasi langsung ${targetCompanyName}. Catat kepemilikannya, lalu telusuri siapa pemiliknya.`}
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>Batal</Button>
            <Button onClick={() => saveCorporate(true)} disabled={!legalName.trim()}>Simpan draf</Button>
            <Button variant="primary" onClick={() => saveCorporate(false)} disabled={!canSave}>
              Simpan entitas
            </Button>
          </>
        }
      >
        <div className="p-6 space-y-6">
          {/* Top 4 KPI strip matching Figma 04 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 border-y border-line divide-y sm:divide-y-0 sm:divide-x divide-line bg-subtle/60 rounded-lg">
            <div className="p-3.5">
              <div className="eyebrow !text-[10px]">Kepemilikan di target</div>
              <div className="figure text-[24px] text-ink mt-0.5">{holdingPct.toFixed(1)}%</div>
              <div className="text-[11.5px] text-ink-3">Sisa tersedia {remainingTargetPct}%</div>
            </div>
            <div className="p-3.5">
              <div className="eyebrow !text-[10px]">Kepemilikan tercatat</div>
              <div className="figure text-[24px] text-ink mt-0.5">{recordedIntermediatePct}%</div>
              <div className="text-[11.5px] text-ink-3">{Math.max(0, 100 - recordedIntermediatePct)}% belum tercatat</div>
            </div>
            <div className="p-3.5">
              <div className="eyebrow !text-[10px]">Tertelusur ke orang</div>
              <div className="figure text-[24px] text-ink mt-0.5">{tracedIntermediatePct}%</div>
              <div className="text-[11.5px] text-ink-3">
                {tracedIntermediatePct >= 99.9 ? 'Semua jalur berakhir di orang' : 'Ada jalur korporasi belum selesai'}
              </div>
            </div>
            <div className="p-3.5">
              <div className="eyebrow !text-[10px]">Direksi</div>
              <div className={cn('figure text-[24px] mt-0.5', directors.length === 0 ? 'text-warning-700' : 'text-ink')}>
                {directors.length}
              </div>
              <div className="text-[11.5px] text-ink-3">Wajib ada sebelum kirim D9 & D100</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] gap-6 items-start">
            <div className="space-y-6">
              {/* 01 Entity details */}
              <Card>
                <CardHeader title="01 Detail entitas" description="Profil perusahaan pemegang saham (dapat dipakai ulang di entitas lain)." />
                <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <TextField label="Nama legal entitas *" value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="Company SH 1" />
                  <TextField label="Nomor registrasi *" mono value={regNo} onChange={(e) => setRegNo(e.target.value)} placeholder="201912345K" />
                  <SelectField label="Yurisdiksi *" value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)}>
                    <option value="Indonesia">Indonesia</option>
                    <option value="Singapore">Singapura</option>
                    <option value="Malaysia">Malaysia</option>
                    <option value="United States">Amerika Serikat</option>
                    <option value="British Virgin Islands">British Virgin Islands</option>
                  </SelectField>
                  <TextField label="Tanggal pendirian" type="date" value={incDate} onChange={(e) => setIncDate(e.target.value)} />
                  <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="corporate@example.com" />
                  <TextField label="Telepon kontak" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+65 ..." />
                  <TextField label="Alamat terdaftar" value={address} onChange={(e) => setAddress(e.target.value)} className="sm:col-span-2" />
                </CardBody>
              </Card>

              {/* 02 Holding in Target */}
              <Card>
                <CardHeader title={`02 Kepemilikan di ${targetCompanyName}`} />
                <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <TextField
                    label="Kepemilikan langsung (%) *"
                    type="number"
                    min={0.1}
                    max={100}
                    step={0.1}
                    value={percentStr}
                    onChange={(e) => setPercentStr(e.target.value)}
                    error={holdingPct > remainingTargetPct + 0.001 ? `Maksimal tersisa ${remainingTargetPct}%` : undefined}
                  />
                  <SelectField label="Kelas saham" value={shareClass} onChange={(e) => setShareClass(e.target.value)}>
                    <option value="Ordinary">Saham Biasa (Ordinary)</option>
                    <option value="Preference">Saham Preferen</option>
                    <option value="Common Stock">Common Stock</option>
                  </SelectField>
                </CardBody>
              </Card>

              {/* 03 Intermediate shareholders */}
              <Card>
                <CardHeader
                  title="03 Pemegang saham perantara & pemilik"
                  description="Catat siapa yang memiliki entitas korporasi ini hingga semua jalur berakhir pada perorangan."
                  actions={
                    existingProfile ? (
                      <Button
                        size="sm"
                        icon={<Plus />}
                        disabled={recordedIntermediatePct >= 99.99}
                        onClick={() =>
                          setSubModal({
                            mode: 'trace',
                            targetId: existingProfile.id,
                            targetName: existingProfile.legalName,
                            ratio: holdingPct / 100,
                          })
                        }
                      >
                        Tambah pemilik
                      </Button>
                    ) : null
                  }
                />
                <CardBody className="space-y-4">
                  {!existingProfile ? (
                    <Callout tone="neutral">
                      Simpan entitas ini terlebih dahulu untuk menautkan atau membuat pemegang saham perantaranya.
                    </Callout>
                  ) : (
                    <>
                      {/* Stacked ownership progress bar */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-ink">Siapa pemilik {existingProfile.legalName}</span>
                          <span className="text-ink-3 num">
                            {recordedIntermediatePct}% tercatat · {tracedIntermediatePct}% tertelusur ke orang
                          </span>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden flex">
                          {intermediateLinks.map((l) => {
                            const owner = profileMap.get(l.ownerId);
                            const isInd = owner?.kind === 'individual';
                            const subOwned = isInd
                              ? 100
                              : ws.ownership.links.filter((sl) => sl.targetId === l.ownerId).reduce((x, sl) => x + sl.percent, 0);
                            return (
                              <div
                                key={l.id}
                                style={{ width: `${l.percent}%` }}
                                title={`${owner?.legalName}: ${l.percent}%`}
                                className={cn(
                                  'h-full border-r border-surface',
                                  isInd || subOwned >= 99.9 ? 'bg-ink' : 'bg-danger-500/80',
                                )}
                              />
                            );
                          })}
                        </div>
                      </div>

                      {intermediateLinks.length === 0 ? (
                        <Callout tone="warning" title="Belum ada pemilik tercatat">
                          100% dari {existingProfile.legalName} belum ditelusuri. Klik “Tambah pemilik” di atas.
                        </Callout>
                      ) : (
                        <ul className="divide-y divide-line border border-line rounded-lg">
                          {intermediateLinks.map((l) => {
                            const owner = profileMap.get(l.ownerId);
                            if (!owner) return null;
                            const subLinks = ws.ownership.links.filter((sl) => sl.targetId === owner.id);
                            const subSum = subLinks.reduce((s, sl) => s + sl.percent, 0);
                            const traced = owner.kind === 'individual' || subSum >= 99.99;
                            return (
                              <li key={l.id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="size-7 rounded-md bg-muted flex items-center justify-center text-ink-2 shrink-0">
                                    {owner.kind === 'individual' ? <UserRound className="size-3.5" /> : <Building2 className="size-3.5" />}
                                  </span>
                                  <div className="min-w-0">
                                    <div className="text-[13.5px] font-medium text-ink truncate">{owner.legalName}</div>
                                    <div className="text-xs text-ink-3">
                                      <span className="font-mono">{owner.registrationOrIdNumber}</span> · {owner.kind === 'individual' ? 'Perorangan' : 'Pemegang saham perantara'}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-serif text-[18px] text-ink num">{l.percent}%</span>
                                  {traced ? (
                                    <Badge tone="success" dot>Tertelusur</Badge>
                                  ) : (
                                    <Button
                                      size="xs"
                                      variant="secondary"
                                      onClick={() =>
                                        setSubModal({
                                          mode: 'trace',
                                          targetId: owner.id,
                                          targetName: owner.legalName,
                                          ratio: (holdingPct / 100) * (l.percent / 100),
                                        })
                                      }
                                    >
                                      Telusuri pemilik
                                    </Button>
                                  )}
                                  <button
                                    type="button"
                                    aria-label={`Hapus ${owner.legalName}`}
                                    onClick={() => removeIntermediateLink(l.id)}
                                    className="size-7 inline-flex items-center justify-center rounded text-ink-4 hover:bg-muted hover:text-danger-600 cursor-pointer"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </button>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}

                      {recordedIntermediatePct < 99.99 && (
                        <div className="rounded-lg border border-warning-100 bg-warning-50 px-4 py-3 flex items-center justify-between gap-3 text-xs">
                          <span className="text-warning-700">
                            <strong>{Number((100 - recordedIntermediatePct).toFixed(2))}%</strong> dari {existingProfile.legalName} belum tercatat. Anda dapat menyimpan sekarang dan melengkapinya nanti.
                          </span>
                          <Button
                            size="xs"
                            onClick={() =>
                              setSubModal({
                                mode: 'trace',
                                targetId: existingProfile.id,
                                targetName: existingProfile.legalName,
                                ratio: holdingPct / 100,
                              })
                            }
                          >
                            + Lengkapi
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </CardBody>
              </Card>

              {/* 04 Directors */}
              <Card>
                <CardHeader
                  title="04 Direksi (penanda tangan D9 & D100)"
                  description="Direktur korporasi ini menandatangani dokumen D9 dan D100."
                />
                <CardBody className="space-y-3">
                  {directors.length === 0 && (
                    <Callout tone="warning" icon={<AlertTriangle />} title="Belum ada direktur tercatat">
                      Entitas tetap dapat disimpan sekarang, tetapi dokumen D9 dan D100 terblokir di tab Penanda tangan hingga minimal satu direktur ditambahkan.
                    </Callout>
                  )}
                  {directors.length > 0 && (
                    <ul className="divide-y divide-line border border-line rounded-lg">
                      {directors.map((d) => (
                        <li key={d.id} className="px-4 py-2.5 flex items-center justify-between gap-3 text-[13px]">
                          <div>
                            <div className="font-medium text-ink">{d.legalName}</div>
                            <div className="text-xs text-ink-3">{d.jurisdictionOrNationality} · {d.email || d.registrationOrIdNumber}</div>
                          </div>
                          {existingProfile && (
                            <Button size="xs" variant="ghost" onClick={() => removeDirector(d.id)}>Hapus</Button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  {existingProfile && availableIndividuals.length > 0 && (
                    <div className="flex flex-wrap items-end gap-2">
                      <div className="flex-1 min-w-[200px]">
                        <SelectField
                          label="Tambah direktur dari direktori"
                          value={selectedDirectorId}
                          onChange={(e) => setSelectedDirectorId(e.target.value)}
                        >
                          <option value="">Pilih perorangan…</option>
                          {availableIndividuals.map((ind) => (
                            <option key={ind.id} value={ind.id}>
                              {ind.legalName}
                            </option>
                          ))}
                        </SelectField>
                      </div>
                      <Button icon={<UserPlus />} disabled={!selectedDirectorId} onClick={addDirector}>
                        Tambah direktur
                      </Button>
                    </div>
                  )}
                </CardBody>
              </Card>

              {/* 05 Supporting documents */}
              <Card>
                <CardHeader title="05 Dokumen pendukung" icon={<FileText />} />
                <CardBody>
                  <p className="text-xs text-ink-3">
                    Unggah register pemegang saham atau akta pendirian di modul <strong>Dokumen</strong> atau tab <strong>Dokumen legal</strong> untuk validasi otomatis oleh mesin aturan.
                  </p>
                </CardBody>
              </Card>
            </div>

            {/* Right summary sidebar */}
            <div className="space-y-4 lg:sticky lg:top-6">
              <Card>
                <CardHeader title="Sebelum menyimpan" />
                <CardBody className="space-y-2.5 text-xs">
                  {[
                    { label: '01 Detail entitas', ok: Boolean(legalName.trim() && regNo.trim()) },
                    { label: `02 Kepemilikan di target`, ok: holdingPct > 0 && holdingPct <= remainingTargetPct + 0.001 },
                    { label: '03 Pemegang saham perantara', ok: recordedIntermediatePct >= 99.99, hint: recordedIntermediatePct < 99.99 ? `${Number((100 - recordedIntermediatePct).toFixed(1))}% sisa` : 'Lengkap' },
                    { label: '04 Direksi penanda tangan', ok: directors.length > 0, hint: directors.length ? `${directors.length} direktur` : 'Belum ada' },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-2 py-1 border-b border-line last:border-b-0">
                      <span className="text-ink-2">{row.label}</span>
                      <span className={cn('inline-flex items-center gap-1 font-medium', row.ok ? 'text-success-700' : 'text-warning-700')}>
                        {row.ok ? <Check className="size-3.5" /> : null}
                        {row.hint ?? (row.ok ? 'Lengkap' : 'Periksa')}
                      </span>
                    </div>
                  ))}
                  <p className="text-[11.5px] text-ink-3 pt-1">
                    Item yang belum lengkap tetap bisa disimpan sebagai draf, dan akan ditandai di bagan rantai kepemilikan.
                  </p>
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="Posisi entitas ini" />
                <CardBody className="space-y-2 text-xs">
                  <div className="rounded-md border border-line px-3 py-2 bg-subtle">
                    <div className="eyebrow !text-[9.5px]">1 · Perusahaan target</div>
                    <div className="font-medium text-ink mt-0.5">{targetCompanyName}</div>
                  </div>
                  <div className="rounded-md border border-brand-200 px-3 py-2 bg-brand-50/40">
                    <div className="eyebrow !text-[9.5px]">2 · Pemegang saham korporasi</div>
                    <div className="font-medium text-ink mt-0.5">{legalName.trim() || 'Entitas ini'} ({holdingPct}%)</div>
                  </div>
                  <div className="rounded-md border border-line px-3 py-2">
                    <div className="eyebrow !text-[9.5px]">3 · Pemegang saham perantara</div>
                    <div className="text-ink-2 mt-0.5">{intermediateLinks.length} pemilik tercatat ({recordedIntermediatePct}%)</div>
                  </div>
                  <div className="rounded-md border border-line px-3 py-2">
                    <div className="eyebrow !text-[9.5px]">4 · Pemilik manfaat (perorangan)</div>
                    <div className="text-ink-2 mt-0.5">{tracedIntermediatePct}% tertelusur ke perorangan</div>
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        </div>
      </Sheet>

      {subModal && (
        <ShareholderFlowModal
          open
          onClose={() => setSubModal(null)}
          targetId={subModal.targetId}
          targetName={subModal.targetName}
          rootCompanyId={targetCompanyId}
          rootCompanyName={targetCompanyName}
          mode={subModal.mode}
          parentEffectiveRatio={subModal.ratio}
        />
      )}
    </>
  );
}
