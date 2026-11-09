import {
  hashApiKey,
  verifyKitAuth as verifySharedKitAuth,
  type KitKeyStore,
} from "@merqo/ui/kit-api";
import { createServiceClient } from "@/lib/supabase/server";

export { hashApiKey };

const kitKeyStore: KitKeyStore = {
  async getSecretHash(kitSlug) {
    const supabase = await createServiceClient();
    const { data, error } = await supabase
      .from("kit_api_keys")
      .select("secret_hash")
      .eq("kit_slug", kitSlug)
      .maybeSingle();
    if (error || !data) return null;
    return data.secret_hash;
  },
};

export function verifyKitAuth(
  request: Request,
): Promise<{ kitSlug: string } | null> {
  return verifySharedKitAuth(request, { store: kitKeyStore });
}
