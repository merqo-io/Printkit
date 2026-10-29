import { execFileSync, execFile } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";

// An isolated local cluster, never a Supabase connection or an existing database.
const bin = process.argv[2];
if (!bin) throw new Error("Pass the PostgreSQL bin directory");
const dir = mkdtempSync(join(tmpdir(), "printkit-label-tests-"));
const port = "55439";
const run = (name, args, input) =>
  execFileSync(join(bin, name), args, {
    input,
    encoding: "utf8",
    windowsHide: true,
    ...(name === "pg_ctl" ? { stdio: "ignore" } : {}),
  });
const sql = (text) =>
  run(
    "psql",
    [
      "-X",
      "-h",
      "127.0.0.1",
      "-p",
      port,
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    text,
  );
run("initdb", [
  "-D",
  dir,
  "-U",
  "postgres",
  "-A",
  "trust",
  "--no-locale",
  "-E",
  "UTF8",
]);
try {
  run("pg_ctl", [
    "-D",
    dir,
    "-l",
    join(dir, "server.log"),
    "-o",
    `-p ${port} -h 127.0.0.1`,
    "-w",
    "start",
  ]);
  sql(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`);
  for (const file of [
    "0001_printkit_core.sql",
    "0003_printkit_print_jobs_idempotency.sql",
    "0005_print_locations.sql",
    "0008_printers_core.sql",
    "0011_label_batches.sql",
  ]) {
    sql(readFileSync(resolve("supabase/migrations", file), "utf8"));
  }
  sql(readFileSync(resolve("scripts/label-batches.regression.sql"), "utf8"));
  const concurrent = `select * from printkit.create_label_batch('11111111-1111-4111-8111-111111111111','qkit','concurrent','{}','[{"item_name":"Kopi"},{"item_name":"Tea"}]',null);`;
  const exec = promisify(execFile);
  await Promise.all(
    Array.from({ length: 8 }, () =>
      exec(
        join(bin, "psql"),
        [
          "-X",
          "-h",
          "127.0.0.1",
          "-p",
          port,
          "-U",
          "postgres",
          "-v",
          "ON_ERROR_STOP=1",
          "-c",
          concurrent,
        ],
        { windowsHide: true },
      ),
    ),
  );
  sql(
    `do $$ begin assert (select count(*) from printkit.print_batches where source_ref='concurrent')=1; assert (select count(*) from printkit.print_jobs j join printkit.print_batches b on j.batch_id=b.id where b.source_ref='concurrent')=2; end $$;`,
  );
  const children = sql(
    "select j.id from printkit.print_jobs j join printkit.print_batches b on j.batch_id=b.id where b.source_ref='concurrent' order by j.id;",
  )
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[0-9a-f-]{36}$/.test(line));
  await Promise.all(
    children.map((id) =>
      exec(
        join(bin, "psql"),
        [
          "-X",
          "-h",
          "127.0.0.1",
          "-p",
          port,
          "-U",
          "postgres",
          "-v",
          "ON_ERROR_STOP=1",
          "-c",
          `update printkit.print_jobs set status='printed' where id='${id}'; select * from printkit.label_batch_status((select batch_id from printkit.print_jobs where id='${id}'));`,
        ],
        { windowsHide: true },
      ),
    ),
  );
  sql(
    `do $$ begin assert (select status from printkit.label_batch_status((select id from printkit.print_batches where source_ref='concurrent')))='printed'; end $$;`,
  );
  console.log(
    "PASS: batch SQL lifecycle, atomicity, claims/reconnect, retry, legacy compatibility, RLS, 8 concurrent submissions and concurrent completion",
  );
} finally {
  run("pg_ctl", ["-D", dir, "-m", "fast", "-w", "stop"]);
  console.log(`Disposable test cluster stopped: ${dir}`);
}
