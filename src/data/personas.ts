/**
 * RBAC demo personas. Parent executives see every entity; subsidiary staff are
 * restricted to their own jurisdiction (segregation of duties).
 */
export interface UserPersona {
  id: string;
  name: string;
  title: string;
  entityRole: 'PARENT' | 'SUBSIDIARY';
  organization: string;
  email: string;
  jurisdiction: string;
  avatarInitials: string;
  avatarBg: string;
  badge: string;
  canViewAll: boolean;
  accessibleEntityIds: string[];
  governanceLevel: string;
  description: string;
  complianceStatus: string;
}


export const PERSONAS: UserPersona[] = [
  {
    id: 'ceo_parent',
    name: 'Ir. Aditya Pratama, M.Sc.',
    title: 'Group Chief Executive Officer (CEO)',
    entityRole: 'PARENT',
    organization: 'PT Nusantara Kreasi Digital Tbk (Induk Grup)',
    email: 'aditya.pratama@nusantara-holding.com',
    jurisdiction: '🇮🇩 Indonesia (Ultimate Parent Entity - UPE)',
    avatarInitials: 'AP',
    avatarBg: 'bg-ink',
    badge: '👑 Group CEO (Induk)',
    canViewAll: true,
    accessibleEntityIds: ['ENT-ID-001', 'ENT-SG-002', 'ENT-MY-003', 'ENT-US-004'],
    governanceLevel: 'Level 5 (Unrestricted Multinational Holding Scope)',
    description: 'CEO Perusahaan Induk — Memiliki hak akses universal (Global Scope) sesuai standar enterprise internasional untuk mengaudit, mengonsolidasi, dan melihat seluruh data Induk & 3 Anak Usaha (ID, SG, MY, US).',
    complianceStatus: 'Akses seluruh grup • Maker & checker induk',
  },
  {
    id: 'cfo_parent',
    name: 'Dewi Anggraini, S.E., Ak., CA',
    title: 'Group Chief Financial Officer (CFO)',
    entityRole: 'PARENT',
    organization: 'PT Nusantara Kreasi Digital Tbk (Induk Grup)',
    email: 'dewi.anggraini@nusantara-holding.com',
    jurisdiction: '🇮🇩 Indonesia (Ultimate Parent Entity - UPE)',
    avatarInitials: 'DA',
    avatarBg: 'bg-brand-700',
    badge: '💼 Group CFO (Induk)',
    canViewAll: true,
    accessibleEntityIds: ['ENT-ID-001', 'ENT-SG-002', 'ENT-MY-003', 'ENT-US-004'],
    governanceLevel: 'Level 5 (Group Fiscal & BEPS Consolidation)',
    description: 'CFO Perusahaan Induk — Setara dengan CEO dalam pengawasan keuangan fiskal konsolidasi, transfer pricing lintas negara, dan kepatuhan audit grup.',
    complianceStatus: 'Akses seluruh grup • Checker induk',
  },
  {
    id: 'md_sg',
    name: 'Marcus Tan, CFA',
    title: 'Managing Director — Singapore Subsidiary',
    entityRole: 'SUBSIDIARY',
    organization: 'Nusantara FinTech Pte. Ltd. (Singapura)',
    email: 'marcus.tan@nusantara-sg.com',
    jurisdiction: '🇸🇬 Singapura (Constituent Entity)',
    avatarInitials: 'MT',
    avatarBg: 'bg-success-700',
    badge: '🇸🇬 Director SG (Anak Usaha)',
    canViewAll: false,
    accessibleEntityIds: ['ENT-SG-002'],
    governanceLevel: 'Level 2 (Single Entity — Singapore IRAS Only)',
    description: 'Karyawan Anak Usaha Singapura — Hanya memiliki hak akses internal Nusantara FinTech Pte. Ltd. Entitas lain dikunci (segregasi tugas).',
    complianceStatus: 'Akses terbatas • Entitas Singapura',
  },
  {
    id: 'dir_my',
    name: 'Ahmad Razak, CA (M)',
    title: 'Country Director — Malaysia Subsidiary',
    entityRole: 'SUBSIDIARY',
    organization: 'Nusantara Digital Solutions Sdn. Bhd. (Malaysia)',
    email: 'ahmad.razak@nusantara-my.com',
    jurisdiction: '🇲🇾 Malaysia (Constituent Entity)',
    avatarInitials: 'AR',
    avatarBg: 'bg-warning-700',
    badge: '🇲🇾 Director MY (Anak Usaha)',
    canViewAll: false,
    accessibleEntityIds: ['ENT-MY-003'],
    governanceLevel: 'Level 2 (Single Entity — Malaysia LHDN Only)',
    description: 'Karyawan Anak Usaha Malaysia — Akses dibatasi pada entitas lokal Malaysia.',
    complianceStatus: 'Akses terbatas • Entitas Malaysia',
  },
  {
    id: 'ctrl_us',
    name: 'Sarah Jenkins, CPA',
    title: 'VP Finance & Controller — US Subsidiary',
    entityRole: 'SUBSIDIARY',
    organization: 'Nusantara AI Technologies, Inc. (Amerika Serikat)',
    email: 'sarah.jenkins@nusantara-ai.com',
    jurisdiction: '🇺🇸 Amerika Serikat (Constituent Entity)',
    avatarInitials: 'SJ',
    avatarBg: 'bg-danger-700',
    badge: '🇺🇸 Controller US (Anak Usaha)',
    canViewAll: false,
    accessibleEntityIds: ['ENT-US-004'],
    governanceLevel: 'Level 2 (Single Entity — US IRS Only)',
    description: 'Karyawan Anak Usaha Amerika Serikat — Akses dibatasi pada entitas lokal AS.',
    complianceStatus: 'Akses terbatas • Entitas Amerika Serikat',
  },
];
