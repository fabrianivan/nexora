'use client';

import React, { useMemo, useState } from 'react';
import { ArrowRight, Check, MailPlus, RefreshCw, ShieldCheck, UserCheck, UserPlus, Users } from 'lucide-react';
import { useWorkspace } from '@/state/workspace';
import { useUi } from '@/state/ui';
import {
  ROLE_DEFS,
  assignMemberRole,
  canRemoveMember,
  inviteMember,
  resendInvite,
  revokeInvite,
  roleDefFor,
  transferOwnership,
  type TeamMember,
  type WorkspaceRoleId,
} from '@/lib/account';
import {
  Avatar,
  Badge,
  Button,
  Callout,
  Card,
  CardBody,
  CardHeader,
  Dialog,
  EmptyState,
  MetricBand,
  PageHeader,
  SelectField,
  Table,
  TD,
  TH,
  THead,
  TR,
  TextField,
  cn,
} from '@/ui';

function RoleRadioList({
  value,
  onChange,
}: {
  value: WorkspaceRoleId;
  onChange: (role: WorkspaceRoleId) => void;
}) {
  return (
    <div className="space-y-2" role="radiogroup" aria-label="Pilih peran">
      {ROLE_DEFS.map((r) => {
        const selected = value === r.id;
        return (
          <button
            key={r.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(r.id)}
            className={cn(
              'w-full flex items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5 text-left transition cursor-pointer',
              selected ? 'border-brand-600 bg-brand-50/45' : 'border-line bg-surface hover:border-line-strong',
            )}
          >
            <span className="flex items-start gap-3 min-w-0">
              <span
                className={cn(
                  'mt-0.5 size-4 rounded-full border flex items-center justify-center shrink-0',
                  selected ? 'border-brand-600' : 'border-line-strong',
                )}
              >
                {selected && <span className="size-2 rounded-full bg-brand-600" />}
              </span>
              <span className="min-w-0">
                <span className="block text-[13.5px] font-medium text-ink">{r.label}</span>
                <span className="block text-xs text-ink-3 truncate">{r.scopeLabel}</span>
              </span>
            </span>
            <span className="flex items-center gap-1 shrink-0">
              {r.maker && <Badge tone="brand">Maker</Badge>}
              {r.checker && <Badge tone="success">Checker</Badge>}
              {r.readOnly && <Badge tone="neutral">Baca saja</Badge>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function InviteMemberDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ws = useWorkspace();
  const ui = useUi();
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState<WorkspaceRoleId>('director_my');
  const [err, setErr] = useState('');
  const role = roleDefFor(roleId);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = inviteMember(ws.account, email, roleId, ws.persona.name);
    if (res.error) {
      setErr(res.error);
      return;
    }
    ws.updateAccount(() => res.next);
    ws.logAudit('INVITE_MEMBER', email.trim().toLowerCase(), `Undangan dikirim sebagai ${role.label} (${role.scopeLabel}).`);
    ui.toast(`Undangan dikirim ke ${email.trim().toLowerCase()}.`);
    setEmail('');
    setErr('');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="md"
      title="Undang anggota"
      description="Anggota akan menerima email untuk membuat akun. Perannya langsung aktif saat bergabung."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button variant="primary" type="submit" form="invite-member-form">Kirim undangan</Button>
        </>
      }
    >
      <form id="invite-member-form" onSubmit={submit} className="space-y-4">
        <TextField
          label="Email kerja"
          type="email"
          placeholder="nama@perusahaan.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setErr('');
          }}
          error={err || undefined}
          autoFocus
        />
        <div>
          <div className="text-[13px] font-medium text-ink mb-2">Peran</div>
          <RoleRadioList value={roleId} onChange={setRoleId} />
        </div>
        <Callout tone="neutral">
          <strong>{email.trim() || 'Anggota ini'}</strong> akan melihat <strong>{role.scopeLabel}</strong> — {role.description}
        </Callout>
      </form>
    </Dialog>
  );
}

function AssignRoleDialog({
  member,
  onClose,
}: {
  member: TeamMember | null;
  onClose: () => void;
}) {
  const ws = useWorkspace();
  const ui = useUi();
  const [roleId, setRoleId] = useState<WorkspaceRoleId>('controller_us');
  if (!member) return null;
  const role = roleDefFor(roleId);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    ws.updateAccount((prev) => assignMemberRole(prev, member.id, roleId));
    ws.logAudit('ASSIGN_ROLE', member.name, `Peran ditetapkan: ${role.label} (${role.scopeLabel}).`);
    ui.toast(`Peran ${role.label} ditetapkan untuk ${member.name}.`);
    onClose();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      size="md"
      title={`Tetapkan peran untuk ${member.name}`}
      description="Anggota ini bergabung dengan akses baca-saja. Email pemberitahuan dikirim setelah peran ditetapkan."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button variant="primary" type="submit" form="assign-role-form">Tetapkan peran</Button>
        </>
      }
    >
      <form id="assign-role-form" onSubmit={submit} className="space-y-4">
        <RoleRadioList value={roleId} onChange={setRoleId} />
        <Callout tone="neutral">
          <strong>{member.name}</strong> akan melihat <strong>{role.scopeLabel}</strong> — {role.description}
        </Callout>
      </form>
    </Dialog>
  );
}

function TransferOwnershipDialog({
  open,
  onClose,
  candidates,
}: {
  open: boolean;
  onClose: () => void;
  candidates: TeamMember[];
}) {
  const ws = useWorkspace();
  const ui = useUi();
  const [targetId, setTargetId] = useState(candidates[0]?.id ?? '');

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title="Alihkan kepemilikan ruang kerja"
      description="Ruang kerja harus selalu memiliki satu pemilik. Pilih anggota aktif untuk menerima kepemilikan sebelum Anda keluar."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button
            variant="primary"
            disabled={!targetId}
            onClick={() => {
              const target = candidates.find((c) => c.id === targetId);
              if (!target) return;
              ws.updateAccount((prev) => transferOwnership(prev, target.id));
              ws.logAudit('TRANSFER_OWNERSHIP', target.name, `Kepemilikan ruang kerja dialihkan ke ${target.name}.`);
              ui.toast(`Kepemilikan dialihkan ke ${target.name}.`);
              onClose();
            }}
          >
            Alihkan kepemilikan
          </Button>
        </>
      }
    >
      <SelectField label="Pemilik baru" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
        {candidates.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} ({roleDefFor(c.roleId).label})
          </option>
        ))}
      </SelectField>
    </Dialog>
  );
}

export function TeamPage() {
  const ws = useWorkspace();
  const ui = useUi();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<TeamMember | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [matrixOpen, setMatrixOpen] = useState(false);
  const [ownerWarning, setOwnerWarning] = useState<string | null>(null);

  const { members, invites } = ws.account;
  const waitingMembers = useMemo(() => members.filter((m) => m.status === 'waiting' || m.roleId === 'view_only'), [members]);
  const groupWideCount = useMemo(
    () => members.filter((m) => m.roleId === 'group_ceo' || m.roleId === 'group_cfo').length,
    [members],
  );
  const owner = members.find((m) => m.isOwner) ?? members[0];
  const transferCandidates = members.filter((m) => !m.isOwner && m.status === 'active');

  const canManageTeam = ws.isParentExec;

  const handleRoleChange = (member: TeamMember, nextRole: WorkspaceRoleId) => {
    ws.updateAccount((prev) => assignMemberRole(prev, member.id, nextRole));
    ws.logAudit('UPDATE_MEMBER_ROLE', member.name, `Peran diubah menjadi ${roleDefFor(nextRole).label}.`);
    ui.toast(`Peran ${member.name} diperbarui.`);
  };

  const handleRemove = (member: TeamMember) => {
    const check = canRemoveMember(members, member.id);
    if (!check.ok) {
      setOwnerWarning(check.reason);
      return;
    }
    ws.updateAccount((prev) => ({
      ...prev,
      members: prev.members.filter((m) => m.id !== member.id),
    }));
    ws.logAudit('REMOVE_MEMBER', member.name, `Anggota dihapus dari ruang kerja.`);
    ui.toast(`${member.name} dihapus dari ruang kerja.`, 'info');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={<span>Pengaturan · Tim & peran</span>}
        title="Tim & peran"
        description="Siapa yang dapat membuka ruang kerja ini dan entitas apa yang dapat dilihat tiap orang. Hanya eksekutif induk / pemilik yang dapat mengubah peran."
        actions={
          <Button
            variant="primary"
            icon={<UserPlus />}
            disabled={!canManageTeam}
            onClick={() => setInviteOpen(true)}
            title={canManageTeam ? undefined : 'Hanya pemilik atau eksekutif induk yang dapat mengundang anggota'}
          >
            Undang anggota
          </Button>
        }
      />

      <MetricBand
        label="Ringkasan tim dan akses"
        metrics={[
          {
            label: 'Anggota',
            value: members.length,
            detail: `${members.length - waitingMembers.length} dengan peran, ${waitingMembers.length} menunggu`,
            icon: <Users />,
          },
          {
            label: 'Menunggu peran',
            value: waitingMembers.length,
            detail: waitingMembers[0] ? `${waitingMembers[0].name} bergabung hari ini` : 'Semua anggota sudah punya peran',
            tone: waitingMembers.length ? 'warning' : 'success',
            icon: <UserCheck />,
          },
          {
            label: 'Undangan tertunda',
            value: invites.length,
            detail: invites[0] ? `${invites[0].email}` : 'Tidak ada undangan tertunda',
            icon: <MailPlus />,
          },
          {
            label: 'Akses seluruh grup',
            value: groupWideCount,
            detail: 'Group CEO dan Group CFO (Maker & Checker)',
            icon: <ShieldCheck />,
          },
        ]}
      />

      {ownerWarning && (
        <Callout
          tone="warning"
          title="Pemilik ruang kerja tidak dapat keluar sebelum mengalihkan kepemilikan"
          action={
            <Button size="sm" onClick={() => { setOwnerWarning(null); setTransferOpen(true); }}>
              Alihkan kepemilikan
            </Button>
          }
        >
          {ownerWarning}
        </Callout>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          <Card>
            <CardHeader
              title="Anggota"
              description="Peran menentukan cakupan entitas dan hak persetujuan maker-checker."
              actions={<span className="text-xs text-ink-3">{members.length} orang</span>}
            />
            <Table>
              <THead>
                <tr>
                  <TH>Anggota</TH>
                  <TH>Peran</TH>
                  <TH>Dapat melihat</TH>
                  <TH>Aktif terakhir</TH>
                  <TH />
                </tr>
              </THead>
              <tbody>
                {members.map((m) => {
                  const def = roleDefFor(m.roleId);
                  const waiting = m.status === 'waiting' || m.roleId === 'view_only';
                  return (
                    <TR key={m.id} className={waiting ? 'bg-mark-soft/45' : undefined}>
                      <TD>
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar initials={m.avatarInitials} className={m.avatarBg} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-ink font-medium truncate">{m.name}</span>
                              {m.isOwner && <Badge tone="dark">Pemilik</Badge>}
                            </div>
                            <div className="text-xs text-ink-3 truncate">{m.email}</div>
                          </div>
                        </div>
                      </TD>
                      <TD>
                        {waiting ? (
                          <Badge tone="warning" dot>Belum punya peran</Badge>
                        ) : m.isOwner || !canManageTeam ? (
                          <Badge tone="neutral">{def.label}</Badge>
                        ) : (
                          <select
                            aria-label={`Ubah peran ${m.name}`}
                            value={m.roleId}
                            onChange={(e) => handleRoleChange(m, e.target.value as WorkspaceRoleId)}
                            className="h-8 rounded-md border border-line-strong bg-surface px-2 text-xs text-ink cursor-pointer"
                          >
                            {ROLE_DEFS.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </TD>
                      <TD className="text-ink-2 text-[13px]">{def.scopeLabel}</TD>
                      <TD className="text-xs text-ink-3 whitespace-nowrap">{m.lastActiveLabel}</TD>
                      <TD align="right">
                        {waiting ? (
                          <Button
                            size="sm"
                            variant="primary"
                            disabled={!canManageTeam}
                            onClick={() => setAssignTarget(m)}
                          >
                            Tetapkan peran
                          </Button>
                        ) : (
                          <button
                            type="button"
                            disabled={!canManageTeam}
                            onClick={() => handleRemove(m)}
                            className="text-xs font-medium text-ink-3 hover:text-danger-700 disabled:opacity-40 cursor-pointer"
                          >
                            {m.isOwner ? 'Keluar' : 'Hapus'}
                          </button>
                        )}
                      </TD>
                    </TR>
                  );
                })}
              </tbody>
            </Table>
          </Card>

          <Card>
            <CardHeader
              title="Undangan tertunda"
              description="Undangan berlaku selama 7 hari sejak dikirim."
            />
            {invites.length === 0 ? (
              <EmptyState icon={<MailPlus />} title="Tidak ada undangan tertunda" description="Semua undangan telah diterima atau dicabut." />
            ) : (
              <Table>
                <THead>
                  <tr>
                    <TH>Email</TH>
                    <TH>Peran</TH>
                    <TH>Cakupan</TH>
                    <TH>Status</TH>
                    <TH />
                  </tr>
                </THead>
                <tbody>
                  {invites.map((inv) => {
                    const def = roleDefFor(inv.roleId);
                    return (
                      <TR key={inv.id}>
                        <TD>
                          <div className="text-ink font-medium">{inv.email}</div>
                          <div className="text-xs text-ink-3">Dikirim {inv.sentAt} oleh {inv.invitedBy}</div>
                        </TD>
                        <TD><Badge>{def.label}</Badge></TD>
                        <TD className="text-xs text-ink-3">{def.scopeLabel}</TD>
                        <TD>
                          {inv.expired ? (
                            <Badge tone="danger" dot>Kedaluwarsa · hubungi {owner.name}</Badge>
                          ) : (
                            <span className="text-xs text-ink-3">Berlaku {inv.expiresAt}</span>
                          )}
                        </TD>
                        <TD align="right">
                          <div className="inline-flex items-center gap-3">
                            <button
                              type="button"
                              disabled={!canManageTeam}
                              onClick={() => {
                                ws.updateAccount((prev) => resendInvite(prev, inv.id));
                                ws.logAudit('RESEND_INVITE', inv.email, 'Undangan dikirim ulang (berlaku 7 hari).');
                                ui.toast(`Undangan dikirim ulang ke ${inv.email}.`);
                              }}
                              className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline disabled:opacity-40 cursor-pointer"
                            >
                              <RefreshCw className="size-3" /> Kirim ulang
                            </button>
                            <button
                              type="button"
                              disabled={!canManageTeam}
                              onClick={() => {
                                ws.updateAccount((prev) => revokeInvite(prev, inv.id));
                                ws.logAudit('REVOKE_INVITE', inv.email, 'Undangan dicabut.');
                                ui.toast('Undangan dicabut.', 'info');
                              }}
                              className="text-xs font-medium text-danger-600 hover:underline disabled:opacity-40 cursor-pointer"
                            >
                              Cabut
                            </button>
                          </div>
                        </TD>
                      </TR>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </Card>
        </div>

        <Card>
          <CardHeader
            title="Yang dapat dilihat tiap peran"
            description="Maker menyusun draf. Checker menyetujui draf milik orang lain."
          />
          <CardBody className="space-y-4">
            <ul className="divide-y divide-line border-t border-line">
              {ROLE_DEFS.map((r) => (
                <li key={r.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-medium text-ink">{r.label}</div>
                    <div className="text-xs text-ink-3">{r.scopeLabel}</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {r.maker && <Badge tone="brand">Maker</Badge>}
                    {r.checker && <Badge tone="success">Checker</Badge>}
                    {r.readOnly && <Badge tone="neutral">Baca saja</Badge>}
                  </div>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setMatrixOpen(true)}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-700 hover:underline cursor-pointer"
            >
              <span>Buka matriks hak akses lengkap</span>
              <ArrowRight className="size-3.5" />
            </button>
          </CardBody>
        </Card>
      </div>

      <InviteMemberDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <AssignRoleDialog member={assignTarget} onClose={() => setAssignTarget(null)} />
      <TransferOwnershipDialog open={transferOpen} onClose={() => setTransferOpen(false)} candidates={transferCandidates} />

      <Dialog
        open={matrixOpen}
        onClose={() => setMatrixOpen(false)}
        size="lg"
        title="Matriks hak akses (RBAC)"
        description="Eksekutif induk melihat seluruh entitas; staf anak usaha dibatasi pada yurisdiksinya. Maker tidak boleh menyetujui usulannya sendiri."
        footer={<Button onClick={() => setMatrixOpen(false)}>Tutup</Button>}
      >
        <Table className="-mx-6">
          <THead>
            <tr>
              <TH>Peran</TH>
              {ws.entities.map((e) => (
                <TH key={e.id} align="center">{e.flag}</TH>
              ))}
              <TH align="center">Checker</TH>
            </tr>
          </THead>
          <tbody>
            {ws.personas.map((x) => {
              const parent = x.canViewAll && x.entityRole === 'PARENT';
              return (
                <TR key={x.id}>
                  <TD>
                    <div className="text-ink font-medium">{x.name}</div>
                    <div className="text-xs text-ink-3">{x.title}</div>
                  </TD>
                  {ws.entities.map((e) => (
                    <TD key={e.id} align="center">
                      {parent || x.accessibleEntityIds.includes(e.id) ? <Check className="size-4 text-success-600 inline" /> : <span className="text-ink-4">—</span>}
                    </TD>
                  ))}
                  <TD align="center">{parent ? <Check className="size-4 text-success-600 inline" /> : <span className="text-ink-4">—</span>}</TD>
                </TR>
              );
            })}
          </tbody>
        </Table>
      </Dialog>
    </div>
  );
}
