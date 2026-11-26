import { forbidden } from 'next/navigation';

// Rendered per request: a statically prerendered page would be served with 200.
export const dynamic = 'force-dynamic';

/**
 * A stable address for "you don't have access": role checks can send people
 * here, and it renders app/forbidden.tsx with a real 403 status.
 */
export default function AccessDenied() {
  forbidden();
}
