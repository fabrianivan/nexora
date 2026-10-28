import {
  LayoutGrid,
  Building2,
  Inbox,
  ShieldAlert,
  ListChecks,
  Calculator,
  FileCheck2,
  Landmark,
  Users,
  CalendarDays,
  FileBarChart2,
  BookOpen,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Position in the 7-step compliance cycle. */
  step?: number;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    items: [{ href: '/overview', label: 'Ringkasan', description: 'Posisi pajak & risiko seluruh grup', icon: LayoutGrid }],
  },
  {
    label: 'Siklus kepatuhan',
    items: [
      { href: '/entities', label: 'Entitas & struktur', description: 'Direktori, profil legal, struktur kepemilikan', icon: Building2, step: 1 },
      { href: '/documents', label: 'Dokumen', description: 'Inbox faktur & dokumen, ekstraksi Document AI', icon: Inbox, step: 2 },
      { href: '/risk', label: 'Risiko & fraud', description: 'Temuan TBTS, MTF, anomali & validasi silang', icon: ShieldAlert, step: 3 },
      { href: '/review', label: 'Review temuan', description: 'Keputusan maker-checker & koreksi fiskal', icon: ListChecks, step: 4 },
      { href: '/calculation', label: 'Rekonsiliasi fiskal', description: 'Koreksi fiskal, PPN, PPh potput, what-if', icon: Calculator, step: 5 },
      { href: '/tax-return', label: 'SPT tahunan', description: 'Draf SPT 1771, lampiran & persetujuan', icon: FileCheck2, step: 6 },
      { href: '/payments', label: 'Pembayaran', description: 'Kode billing, NTPN & kewajiban setor', icon: Landmark, step: 7 },
    ],
  },
  {
    label: 'Tata kelola',
    items: [
      { href: '/shareholders', label: 'Pemegang saham & UBO', description: 'Pemilik manfaat & pajak dividen', icon: Users },
      { href: '/calendar', label: 'Kalender pajak', description: 'Tenggat lapor & setor semua yurisdiksi', icon: CalendarDays },
      { href: '/reports', label: 'Laporan & audit', description: 'Ringkasan eksekutif & jejak audit', icon: FileBarChart2 },
      { href: '/studies', label: 'Studi & simulator', description: 'P3B, Pillar Two, transfer pricing', icon: BookOpen },
    ],
  },
];

export const ALL_NAV: NavItem[] = NAV.flatMap((g) => g.items);
export const CYCLE: NavItem[] = ALL_NAV.filter((i) => i.step).sort((a, b) => (a.step ?? 0) - (b.step ?? 0));

export function navFor(pathname: string): { item?: NavItem; group?: NavGroup } {
  for (const group of NAV) {
    const item = group.items.find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
    if (item) return { item, group };
  }
  return {};
}
