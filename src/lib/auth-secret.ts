/**
 * NextAuth requires a secret for JWT signing and middleware. Set NEXTAUTH_SECRET (or
 * AUTH_SECRET) in .env.local for any shared or production environment.
 *
 * When unset, a fixed development fallback is used so local demo works without copying
 * env.example first. If you deploy without NEXTAUTH_SECRET, a warning is logged once.
 */
const DEV_FALLBACK =
  "pulse-desk-local-dev-secret-change-with-nextauth-secret-in-env";

let warnedMissingSecret = false;

export function getAuthSecret(): string {
  const fromEnv = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "production" && !warnedMissingSecret) {
    warnedMissingSecret = true;
    console.warn(
      "[next-auth] NEXTAUTH_SECRET is not set; using a built-in fallback. Generate one with `openssl rand -base64 32` and add it to your environment."
    );
  }
  return DEV_FALLBACK;
}
