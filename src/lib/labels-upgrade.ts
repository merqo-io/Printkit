/**
 * Client-safe pieces of the labels-blocked copy. The link text is a shared
 * constant so the plain API message and the rendered dashboard link say the
 * same thing; vendor-entitlement.ts is server-only and cannot be imported by
 * client components.
 */
export const LABELS_UPGRADE_LINK_TEXT = "Upgrade in your Merqo account";
