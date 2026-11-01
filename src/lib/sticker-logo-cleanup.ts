// Pure logic for the operator logo cleanup. Kept free of "@/" imports so the
// plain-node script can load it directly.

export class CleanupError extends Error {}

export type StoredLogo = { path: string; createdAt: string | null };

export type CleanupPlan = {
  listed: number;
  referenced: number;
  keptReferenced: string[];
  keptByGrace: string[];
  keptUnmanaged: string[];
  orphans: string[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Logo paths used by one template or job snapshot. Anything that does not
 * look like a template throws: deleting on a guess could destroy a live logo,
 * so the caller must abort instead.
 */
export function collectLogoPaths(design: unknown, source: string): string[] {
  if (!isRecord(design) || !Array.isArray(design.elements))
    throw new CleanupError(`Unreadable sticker design in ${source}.`);
  const paths: string[] = [];
  for (const element of design.elements) {
    if (!isRecord(element))
      throw new CleanupError(`Unreadable sticker element in ${source}.`);
    if (element.kind !== "logo") continue;
    if (typeof element.path !== "string" || element.path === "")
      throw new CleanupError(`Logo element without a path in ${source}.`);
    paths.push(element.path);
  }
  return paths;
}

/** Splits listed objects into in-use, within-grace and orphaned. */
export function planCleanup(input: {
  objects: StoredLogo[];
  referenced: ReadonlySet<string>;
  now: Date;
  graceMs: number;
}): CleanupPlan {
  const plan: CleanupPlan = {
    listed: input.objects.length,
    referenced: input.referenced.size,
    keptReferenced: [],
    keptByGrace: [],
    keptUnmanaged: [],
    orphans: [],
  };
  const cutoff = input.now.getTime() - input.graceMs;
  for (const object of input.objects) {
    if (input.referenced.has(object.path)) {
      plan.keptReferenced.push(object.path);
      continue;
    }
    // Only <vendor>/<booth>/<file> uploads are ours; placeholders and strays stay.
    if (!MANAGED_PATH.test(object.path)) {
      plan.keptUnmanaged.push(object.path);
      continue;
    }
    const created = object.createdAt ? Date.parse(object.createdAt) : NaN;
    // An unknown age is treated as fresh so it can never be deleted by mistake.
    if (Number.isNaN(created) || created > cutoff)
      plan.keptByGrace.push(object.path);
    else plan.orphans.push(object.path);
  }
  return plan;
}

/** Removes candidates a later reference read shows are now in use. */
export function dropNowReferenced(
  candidates: string[],
  referenced: ReadonlySet<string>,
): string[] {
  return candidates.filter((path) => !referenced.has(path));
}

type ListEntry = {
  name: string;
  id: string | null;
  created_at?: string | null;
};
type ListResult = {
  data: ListEntry[] | null;
  error: { message: string } | null;
};

export type LogoStorage = {
  list(
    prefix: string,
    options: {
      limit: number;
      offset: number;
      sortBy: { column: string; order: "asc" | "desc" };
    },
  ): Promise<ListResult>;
  remove(paths: string[]): Promise<{ error: { message: string } | null }>;
};

const MANAGED_PATH = /^[^/]+\/[^/]+\/[^/]+\.(png|jpg)$/;
const PAGE = 100;
// Folders are <vendor>/<booth>; files sit one level below.
const MAX_DEPTH = 2;

/** Lists every file in the bucket, walking vendor and booth folders page by page. */
export async function listAllLogos(
  storage: LogoStorage,
): Promise<StoredLogo[]> {
  const found: StoredLogo[] = [];
  async function walk(prefix: string, depth: number): Promise<void> {
    for (const entry of await listFolder(storage, prefix)) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      // Folders come back without an id; files carry one.
      if (entry.id !== null)
        found.push({ path, createdAt: entry.created_at ?? null });
      else if (depth < MAX_DEPTH) await walk(path, depth + 1);
    }
  }
  await walk("", 0);
  return found;
}

async function listFolder(
  storage: LogoStorage,
  prefix: string,
): Promise<ListEntry[]> {
  const entries: ListEntry[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await storage.list(prefix, {
      limit: PAGE,
      sortBy: { column: "name", order: "asc" },
      offset,
    });
    if (error || !data)
      throw new CleanupError(`Listing failed for "${prefix}".`);
    entries.push(...data);
    if (data.length < PAGE) return entries;
  }
}

export async function removeInBatches(
  storage: LogoStorage,
  paths: string[],
  batchSize = 100,
): Promise<number> {
  let deleted = 0;
  for (let i = 0; i < paths.length; i += batchSize) {
    const batch = paths.slice(i, i + batchSize);
    const { error } = await storage.remove(batch);
    if (error)
      throw new CleanupError(`Delete failed after ${deleted} objects.`);
    deleted += batch.length;
  }
  return deleted;
}
