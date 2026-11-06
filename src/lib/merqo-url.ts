/**
 * Base URL of the Merqo site, where vendors sign in, accept terms and manage
 * their plan. One definition so the legal gate, the accept action and the
 * upgrade link cannot drift apart.
 */
export function merqoBaseUrl(): string {
  return process.env.MERQO_BASE_URL ?? "https://www.merqo.io";
}

/** The Merqo dashboard, where the kit cards hold the Upgrade button. */
export function merqoUpgradeUrl(): string {
  return `${merqoBaseUrl()}/dashboard`;
}
