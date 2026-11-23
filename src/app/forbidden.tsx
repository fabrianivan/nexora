import type { Metadata } from 'next';
import { ForbiddenView } from '@/features/errors/ErrorViews';

export const metadata: Metadata = { title: 'Akses dibatasi' };

/** Rendered when a server component calls `forbidden()` (next.config: experimental.authInterrupts). */
export default function Forbidden() {
  return <ForbiddenView />;
}
