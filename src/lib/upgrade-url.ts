import { merqoBaseUrl } from "@merqo/ui/kit-api";

/** The Merqo dashboard, where the kit cards hold the Upgrade button. */
export function merqoUpgradeUrl(): string {
  return `${merqoBaseUrl()}/dashboard`;
}
