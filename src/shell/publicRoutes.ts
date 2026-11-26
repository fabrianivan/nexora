/**
 * Routes that render without the workspace shell (sidebar, top bar, copilot):
 * the public welcome page and the account pages. Everything else is the app.
 */
const PUBLIC_PREFIXES = ['/sign-in', '/sign-up', '/reset-password', '/waiting'];

export function isPublicRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  if (pathname === '/') return true;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
