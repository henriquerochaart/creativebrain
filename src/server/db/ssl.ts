/**
 * `sslmode=require` (what Neon and Vercel hand out) verifies the certificate in today's pg, but the
 * next major pg reads it as libpq does, encrypted without verification. Say verify-full outright,
 * so an upgrade keeps the same guarantee; any other mode, or none, is left as written.
 */
export function strictSsl(url: string): string {
  return url.replace(/([?&]sslmode=)(prefer|require|verify-ca)(?=&|$)/, "$1verify-full");
}
