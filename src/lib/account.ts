import type { CountryCode } from '@/data/multiCountryTaxData';

/**
 * Pure domain model & rules for Nexora's Account journey:
 * onboarding, workspace setup, member invites, RBAC role assignment, and edge states.
 */

export type WorkspaceRoleId =
  | 'group_ceo'
  | 'group_cfo'
  | 'director_sg'
  | 'director_my'
  | 'controller_us'
  | 'view_only';

export interface RoleDefinition {
  id: WorkspaceRoleId;
  label: string;
  scopeLabel: string;
  maker: boolean;
  checker: boolean;
  readOnly: boolean;
  personaId?: string;
  entityIds: string[];
  description: string;
}

export const ALL_ENTITY_IDS = ['ENT-ID-001', 'ENT-SG-002', 'ENT-MY-003', 'ENT-US-004'] as const;

export const ROLE_DEFS: RoleDefinition[] = [
  {
    id: 'group_ceo',
    label: 'Group CEO',
    scopeLabel: 'Semua 4 entitas',
    maker: true,
    checker: true,
    readOnly: false,
    personaId: 'ceo_parent',
    entityIds: [...ALL_ENTITY_IDS],
    description: 'Melihat seluruh entitas grup, menyusun draf, dan menyetujui keputusan sebagai checker independen.',
  },
  {
    id: 'group_cfo',
    label: 'Group CFO',
    scopeLabel: 'Semua 4 entitas',
    maker: true,
    checker: true,
    readOnly: false,
    personaId: 'cfo_parent',
    entityIds: [...ALL_ENTITY_IDS],
    description: 'Melihat seluruh entitas grup, mengelola konsolidasi fiskal, dan bertindak sebagai checker independen.',
  },
  {
    id: 'director_sg',
    label: 'Director SG',
    scopeLabel: 'Nusantara FinTech Pte. Ltd.',
    maker: true,
    checker: false,
    readOnly: false,
    personaId: 'md_sg',
    entityIds: ['ENT-SG-002'],
    description: 'Mengakses entitas Singapura, menyusun SPT & usulan keputusan, tanpa hak menyetujui sendiri.',
  },
  {
    id: 'director_my',
    label: 'Director MY',
    scopeLabel: 'Nusantara Digital Solutions Sdn. Bhd.',
    maker: true,
    checker: false,
    readOnly: false,
    personaId: 'dir_my',
    entityIds: ['ENT-MY-003'],
    description: 'Mengakses entitas Malaysia, menyusun SPT & usulan keputusan, tanpa hak menyetujui sendiri.',
  },
  {
    id: 'controller_us',
    label: 'Controller US',
    scopeLabel: 'Nusantara AI Technologies, Inc.',
    maker: true,
    checker: false,
    readOnly: false,
    personaId: 'ctrl_us',
    entityIds: ['ENT-US-004'],
    description: 'Mengakses entitas Amerika Serikat, menyusun SPT & usulan keputusan, tanpa hak menyetujui sendiri.',
  },
  {
    id: 'view_only',
    label: 'Lihat saja',
    scopeLabel: 'Ringkasan grup saja',
    maker: false,
    checker: false,
    readOnly: true,
    entityIds: [],
    description: 'Hanya dapat membuka Ringkasan grup. Entitas, dokumen, kasus, dan SPT terkunci hingga diberi peran.',
  },
];

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  roleId: WorkspaceRoleId;
  isOwner: boolean;
  personaId?: string;
  avatarInitials: string;
  avatarBg: string;
  status: 'active' | 'waiting';
  lastActiveLabel: string;
}

export interface PendingInvite {
  id: string;
  email: string;
  roleId: WorkspaceRoleId;
  invitedBy: string;
  sentAt: string;
  expiresAt: string;
  expired?: boolean;
}

export interface AccountWorkspaceConfig {
  groupName: string;
  parentCountry: CountryCode;
  filingCountries: CountryCode[];
  startWithSample: boolean;
}

export interface AccountState {
  members: TeamMember[];
  invites: PendingInvite[];
  activeEmail: string | null;
  workspaceConfig: AccountWorkspaceConfig;
}

export function roleDefFor(roleId: WorkspaceRoleId): RoleDefinition {
  return ROLE_DEFS.find((r) => r.id === roleId) ?? ROLE_DEFS[5];
}

export function initialsForName(name: string): string {
  const cleaned = name
    .replace(/^(Ir\.|Dr\.|H\.|Hj\.)\s+/i, '')
    .replace(/,.*$/, '')
    .trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'NX';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function createInitialAccountState(): AccountState {
  return {
    activeEmail: 'aditya.pratama@nusantara-holding.com',
    workspaceConfig: {
      groupName: 'PT Nusantara Kreasi Digital Tbk',
      parentCountry: 'ID',
      filingCountries: ['ID', 'SG', 'MY', 'US'],
      startWithSample: true,
    },
    members: [
      {
        id: 'MEM-CFO',
        name: 'Dewi Anggraini, S.E., Ak., CA',
        email: 'dewi.anggraini@nusantara-holding.com',
        roleId: 'group_cfo',
        isOwner: true,
        personaId: 'cfo_parent',
        avatarInitials: 'DA',
        avatarBg: 'bg-brand-700',
        status: 'active',
        lastActiveLabel: 'Sekarang',
      },
      {
        id: 'MEM-CEO',
        name: 'Ir. Aditya Pratama, M.Sc.',
        email: 'aditya.pratama@nusantara-holding.com',
        roleId: 'group_ceo',
        isOwner: false,
        personaId: 'ceo_parent',
        avatarInitials: 'AP',
        avatarBg: 'bg-ink',
        status: 'active',
        lastActiveLabel: '2 jam lalu',
      },
      {
        id: 'MEM-SG',
        name: 'Marcus Tan, CFA',
        email: 'marcus.tan@nusantara-sg.com',
        roleId: 'director_sg',
        isOwner: false,
        personaId: 'md_sg',
        avatarInitials: 'MT',
        avatarBg: 'bg-success-700',
        status: 'active',
        lastActiveLabel: 'Kemarin',
      },
      {
        id: 'MEM-MY',
        name: 'Ahmad Razak, CA (M)',
        email: 'ahmad.razak@nusantara-my.com',
        roleId: 'director_my',
        isOwner: false,
        personaId: 'dir_my',
        avatarInitials: 'AR',
        avatarBg: 'bg-warning-700',
        status: 'active',
        lastActiveLabel: '2 hari lalu',
      },
      {
        id: 'MEM-US',
        name: 'Sarah Jenkins, CPA',
        email: 'sarah.jenkins@nusantara-ai.com',
        roleId: 'controller_us',
        isOwner: false,
        personaId: 'ctrl_us',
        avatarInitials: 'SJ',
        avatarBg: 'bg-danger-700',
        status: 'active',
        lastActiveLabel: '3 hari lalu',
      },
      {
        id: 'MEM-WAIT',
        name: 'Rina Wijaya',
        email: 'rina.wijaya@nusantara-holding.com',
        roleId: 'view_only',
        isOwner: false,
        avatarInitials: 'RW',
        avatarBg: 'bg-ink-4',
        status: 'waiting',
        lastActiveLabel: 'Bergabung hari ini',
      },
    ],
    invites: [
      {
        id: 'INV-01',
        email: 'budi.hartono@nusantara-holding.com',
        roleId: 'controller_us',
        invitedBy: 'Dewi Anggraini, S.E., Ak., CA',
        sentAt: '2 hari lalu',
        expiresAt: '5 hari lagi',
      },
    ],
  };
}

export function normalizeAccountState(raw: unknown): AccountState {
  const base = createInitialAccountState();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<AccountState>;
  return {
    activeEmail: typeof r.activeEmail === 'string' || r.activeEmail === null ? r.activeEmail : base.activeEmail,
    members: Array.isArray(r.members) && r.members.length > 0 ? r.members : base.members,
    invites: Array.isArray(r.invites) ? r.invites : base.invites,
    workspaceConfig: r.workspaceConfig && typeof r.workspaceConfig === 'object'
      ? { ...base.workspaceConfig, ...r.workspaceConfig }
      : base.workspaceConfig,
  };
}

export function passwordStrength(password: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  if (!password) return { score: 0, label: 'Belum diisi' };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password) || password.length >= 12) score += 1;
  const clamped = Math.max(1, Math.min(4, score)) as 1 | 2 | 3 | 4;
  const labels: Record<1 | 2 | 3 | 4, string> = {
    1: 'Lemah',
    2: 'Cukup',
    3: 'Baik',
    4: 'Kuat',
  };
  return { score: clamped, label: labels[clamped] };
}

export function validateSignUp(
  state: AccountState,
  input: { name: string; email: string; password: string; acceptedTerms: boolean },
): { ok: true } | { ok: false; field: 'name' | 'email' | 'password' | 'terms'; message: string; existingAccount?: boolean } {
  if (input.name.trim().length < 2) {
    return { ok: false, field: 'name', message: 'Masukkan nama lengkap Anda.' };
  }
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, field: 'email', message: 'Masukkan alamat email kerja yang valid.' };
  }
  if (state.members.some((m) => m.email.toLowerCase() === email)) {
    return {
      ok: false,
      field: 'email',
      message: 'Akun dengan email ini sudah terdaftar. Silakan masuk sebagai gantinya.',
      existingAccount: true,
    };
  }
  if (input.password.length < 8 || !/(\d|[^A-Za-z0-9])/.test(input.password)) {
    return { ok: false, field: 'password', message: 'Minimal 8 karakter dengan angka atau simbol.' };
  }
  if (!input.acceptedTerms) {
    return { ok: false, field: 'terms', message: 'Setujui Ketentuan Layanan dan Kebijakan Privasi untuk melanjutkan.' };
  }
  return { ok: true };
}

/**
 * Generic sign-in validation so account enumeration via differing error messages is prevented.
 */
export function validateSignIn(
  state: AccountState,
  email: string,
  password: string,
): { ok: true; member: TeamMember } | { ok: false; message: string } {
  const cleanEmail = email.trim().toLowerCase();
  const member = state.members.find((m) => m.email.toLowerCase() === cleanEmail);
  if (!member || password.trim().length < 6) {
    return { ok: false, message: 'Email dan kata sandi tidak cocok. Coba lagi atau atur ulang kata sandi.' };
  }
  return { ok: true, member };
}

export function canRemoveMember(members: TeamMember[], memberId: string): { ok: true } | { ok: false; reason: string } {
  const target = members.find((m) => m.id === memberId);
  if (!target) return { ok: false, reason: 'Anggota tidak ditemukan.' };
  if (target.isOwner) {
    return {
      ok: false,
      reason: 'Anda adalah pemilik ruang kerja. Alihkan kepemilikan ke anggota lain sebelum keluar atau dihapus.',
    };
  }
  return { ok: true };
}

export function transferOwnership(state: AccountState, newOwnerId: string): AccountState {
  const exists = state.members.some((m) => m.id === newOwnerId && m.status === 'active');
  if (!exists) return state;
  return {
    ...state,
    members: state.members.map((m) => ({
      ...m,
      isOwner: m.id === newOwnerId,
    })),
  };
}

export function assignMemberRole(state: AccountState, memberId: string, roleId: WorkspaceRoleId): AccountState {
  const def = roleDefFor(roleId);
  return {
    ...state,
    members: state.members.map((m) =>
      m.id === memberId
        ? {
            ...m,
            roleId,
            personaId: def.personaId ?? m.personaId,
            status: roleId === 'view_only' ? 'waiting' : 'active',
          }
        : m,
    ),
  };
}

export function inviteMember(state: AccountState, email: string, roleId: WorkspaceRoleId, invitedBy: string): { next: AccountState; error?: string } {
  const clean = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
    return { next: state, error: 'Masukkan alamat email yang valid.' };
  }
  if (state.members.some((m) => m.email.toLowerCase() === clean)) {
    return { next: state, error: 'Email tersebut sudah terdaftar sebagai anggota ruang kerja.' };
  }
  if (state.invites.some((i) => i.email.toLowerCase() === clean && !i.expired)) {
    return { next: state, error: 'Undangan aktif untuk email ini sudah terkirim.' };
  }
  const invite: PendingInvite = {
    id: `INV-${Date.now().toString(36).toUpperCase()}`,
    email: clean,
    roleId,
    invitedBy,
    sentAt: 'Baru saja',
    expiresAt: '7 hari lagi',
    expired: false,
  };
  return {
    next: {
      ...state,
      invites: [invite, ...state.invites.filter((i) => i.email.toLowerCase() !== clean)],
    },
  };
}

export function revokeInvite(state: AccountState, inviteId: string): AccountState {
  return {
    ...state,
    invites: state.invites.filter((i) => i.id !== inviteId),
  };
}

export function resendInvite(state: AccountState, inviteId: string): AccountState {
  return {
    ...state,
    invites: state.invites.map((i) =>
      i.id === inviteId ? { ...i, sentAt: 'Baru saja', expiresAt: '7 hari lagi', expired: false } : i,
    ),
  };
}
