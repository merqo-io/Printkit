/**
 * `source_kit` of the sample labels a vendor sends from the dashboard. No row
 * in kit_api_keys carries this slug, so a test job can never reach a kit.
 */
export const TEST_PRINT_SOURCE_KIT = "printkit-test";

export function isTestPrint(sourceKit: string): boolean {
  return sourceKit === TEST_PRINT_SOURCE_KIT;
}
