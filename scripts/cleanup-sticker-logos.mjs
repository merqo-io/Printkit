import { createClient } from "@supabase/supabase-js";
import {
  CleanupError,
  collectLogoPaths,
  listAllLogos,
  planCleanup,
  removeInBatches,
} from "../src/lib/sticker-logo-cleanup.ts";

const BUCKET = "sticker-logos";
const PAGE = 500;
const HELP = `Usage: node scripts/cleanup-sticker-logos.mjs [--apply] [--grace-hours N]

Deletes sticker logos in the "${BUCKET}" bucket that no saved design and no
print job snapshot uses and that are older than the grace period (default 24).
Without --apply it only prints what it would delete.
Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in the environment.`;

function parseArgs(argv) {
  const options = { apply: false, graceHours: 24, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--apply") options.apply = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--grace-hours") {
      const value = Number(argv[++i]);
      if (!Number.isFinite(value) || value < 0)
        throw new Error("--grace-hours needs a number of hours, 0 or more.");
      options.graceHours = value;
    } else throw new Error(`Unknown argument: ${arg}\n\n${HELP}`);
  }
  return options;
}

// Pages by id so rows added mid-run cannot shift later pages.
async function* pages(buildQuery, label) {
  let after = null;
  for (;;) {
    let query = buildQuery().order("id").limit(PAGE);
    if (after) query = query.gt("id", after);
    const { data, error } = await query;
    if (error) throw new CleanupError(`Reading ${label} failed.`);
    for (const row of data) yield row;
    if (data.length < PAGE) return;
    after = data[data.length - 1].id;
  }
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(HELP);
  } else {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const secretKey = process.env.SUPABASE_SECRET_KEY;
    if (!url || !secretKey)
      throw new Error(
        "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY first.",
      );
    const db = createClient(url, secretKey, { db: { schema: "printkit" } });
    const storage = db.storage.from(BUCKET);

    const readReferences = async () => {
      const referenced = new Set();
      for await (const row of pages(
        () => db.from("sticker_templates").select("id, design"),
        "sticker_templates",
      ))
        for (const path of collectLogoPaths(row.design, `template ${row.id}`))
          referenced.add(path);
      for await (const row of pages(
        () =>
          db
            .from("print_jobs")
            .select("id, snapshot:payload->_printkit_sticker_template")
            .not("payload->_printkit_sticker_template", "is", null),
        "print_jobs",
      ))
        for (const path of collectLogoPaths(row.snapshot, `job ${row.id}`))
          referenced.add(path);
      return referenced;
    };
    const referenced = await readReferences();

    // Listed after the references are read, so an upload racing the run is
    // either unlisted or protected by the grace period.
    const objects = await listAllLogos(storage);
    const plan = planCleanup({
      objects,
      referenced,
      now: new Date(),
      graceMs: options.graceHours * 3_600_000,
    });

    let orphans = plan.orphans;
    let deleted = 0;
    if (options.apply) {
      // A designer session open since before the first read may have saved
      // since; re-reading drops any candidate that is now in use.
      const latest = await readReferences();
      orphans = orphans.filter((path) => !latest.has(path));
    }
    for (const path of orphans) console.log(path);
    if (options.apply) deleted = await removeInBatches(storage, orphans);
    console.log(
      `${options.apply ? "Applied" : "Dry run"}: listed ${plan.listed}, referenced paths ${plan.referenced}, kept in use ${plan.keptReferenced.length}, kept by grace ${plan.keptByGrace.length}, kept as not ours ${plan.keptUnmanaged.length}, orphaned ${orphans.length}, deleted ${deleted}.`,
    );
    if (!options.apply && orphans.length > 0)
      console.log("Re-run with --apply to delete these.");
  }
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Logo cleanup failed.",
  );
  process.exitCode = 1;
}
