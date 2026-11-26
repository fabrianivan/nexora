import type { Metadata } from 'next';
import { CalendarPage } from '@/features/calendar/CalendarPage';

export const metadata: Metadata = { title: 'Kalender pajak' };

export default function Page() {
  return <CalendarPage />;
}
