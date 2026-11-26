import type { FiscalReconciliationItem } from '@/data/indonesiaTaxData';
import type { CreditLine } from '@/lib/cit';

export type DbEngine = 'sqlite' | 'mysql' | 'memory';

export interface CalculationState {
  items: FiscalReconciliationItem[];
  /** Country facility toggle (Pasal 31E / PTE / SME). Name kept for DB compatibility. */
  apply31EFacility: boolean;
  fiscalYear?: string;
  credits?: CreditLine[];
}

export type ReturnStatus = 'Draft' | 'Review' | 'Approved' | 'Ready';

export interface TaxReturnState {
  returnStatus: ReturnStatus;
  approver?: { name: string; role: string } | null;
  creator?: { name: string; role: string };
  submittedAt?: string;
  approvedAt?: string;
  /** Snapshot of the computed figures at approval time. */
  figures?: Record<string, number>;
  history?: { at: string; by: string; role: string; action: string; note?: string }[];
}

export interface LedgerState {
  calculations: Record<string, CalculationState>;
  returns: Record<string, TaxReturnState>;
}

export type PaymentStatus = 'Belum dibayar' | 'Dibayar' | 'Terlambat';

export interface PaymentLiability {
  id: string;
  entityId: string;
  taxType: string;
  kapKjs: string;
  period: string;
  amount: number;
  dueDate: string;
  status: PaymentStatus;
  billingCode?: string;
  ntpn?: string;
  paidAt?: string;
}

export type CalendarStatus = 'Upcoming' | 'Today' | 'Overdue' | 'Completed';

export interface CalendarEvent {
  id: string;
  entityId: string;
  title: string;
  jurisdiction: string;
  taxType: string;
  dueDate: string;
  status: CalendarStatus;
  assignee: string;
  regulationBasis: string;
  description: string;
  reminder?: boolean;
}

export interface AuditLogRecord {
  id: string;
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  target: string;
  details: string;
}

export type StudyCategory = 'P3B / Tax Treaty' | 'BEPS 2.0 / Pillar Two' | 'Transfer Pricing' | 'PPN / VAT' | 'Fraud Case Study';

export interface StudyItem {
  id: string;
  title: string;
  category: StudyCategory;
  summary: string;
  source: string;
  tags: string[];
  applicableJurisdictions: string[];
  simulationType: 'treaty_relief' | 'pillar_two_etr' | 'tp_markup' | 'none';
}
