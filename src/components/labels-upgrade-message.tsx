import { TextLink } from "@/components/text-link";
import { LABELS_UPGRADE_LINK_TEXT } from "@/lib/labels-upgrade";

/**
 * The labels-blocked message with its "Upgrade in your Merqo account" phrase
 * turned into a link to the Merqo dashboard. Falls back to the plain text if
 * the phrase is missing, so a copy edit cannot drop the message.
 */
export function LabelsUpgradeMessage({
  message,
  upgradeUrl,
}: {
  message: string;
  upgradeUrl: string;
}) {
  const at = message.indexOf(LABELS_UPGRADE_LINK_TEXT);
  if (at === -1) return <>{message}</>;
  return (
    <>
      {message.slice(0, at)}
      <TextLink href={upgradeUrl}>{LABELS_UPGRADE_LINK_TEXT}</TextLink>
      {message.slice(at + LABELS_UPGRADE_LINK_TEXT.length)}
    </>
  );
}
