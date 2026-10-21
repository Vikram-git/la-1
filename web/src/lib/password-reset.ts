// "Forgot password?" (owner, 2026-10-21): Supabase emails a link; it comes back to /auth/callback,
// which signs the person in for the reset and sends them to /reset-password. Pure: unit-tested.

export const RESET_PATH = "/reset-password";
export const CALLBACK_PATH = "/auth/callback";

// Where Supabase should send the link back to, for this site.
export function resetRedirectUrl(origin: string): string {
  return `${origin.replace(/\/+$/, "")}${CALLBACK_PATH}`;
}

// A reset link can land on the site's home page instead of /auth/callback (Supabase falls back to the
// project's Site URL when the callback is not on its allow list). Returns the callback URL to forward
// it to, or null when the request is not a reset link.
export function strayResetLink(pathname: string, search: URLSearchParams): string | null {
  if (pathname === CALLBACK_PATH) return null;
  const code = search.get("code");
  const tokenHash = search.get("token_hash");
  if (tokenHash && search.get("type") === "recovery") return `${CALLBACK_PATH}?${new URLSearchParams({ token_hash: tokenHash, type: "recovery" })}`;
  if (code && /^[A-Za-z0-9-]{8,200}$/.test(code)) return `${CALLBACK_PATH}?${new URLSearchParams({ code })}`;
  return null;
}

// Supabase reports a failed or expired link as ?error=…&error_description=… (or in the #hash).
export function linkProblem(search: URLSearchParams): string | null {
  return search.get("error_description") ?? search.get("error") ?? null;
}
