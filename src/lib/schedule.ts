import { daysUntil } from './format';
import type { CalendarEvent, CalendarStatus, PaymentLiability, PaymentStatus } from '@/state/types';

/** Status is derived from the due date so the demo never goes stale. */
export function paymentStatus(p: PaymentLiability, today = new Date()): PaymentStatus {
  if (p.status === 'Dibayar') return 'Dibayar';
  return daysUntil(p.dueDate, today) < 0 ? 'Terlambat' : 'Belum dibayar';
}

export function eventStatus(e: CalendarEvent, today = new Date()): CalendarStatus {
  if (e.status === 'Completed') return 'Completed';
  const d = daysUntil(e.dueDate, today);
  if (d < 0) return 'Overdue';
  if (d === 0) return 'Today';
  return 'Upcoming';
}
