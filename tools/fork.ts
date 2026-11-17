#!/usr/bin/env bun
// Creates the forks of forks.toml that do not exist yet in the fork organization (server-side, nothing is cloned), throttled for GitHub's
// secondary rate limits. Existing forks are left alone: syncing and pinning belong to rust-mono's tools/forks.ts and tools/sync.ts.
//   bun tools/fork.ts [--dry-run]
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const gh = (...a: string[]) => Bun.spawnSync(["gh", ...a], { stdout: "pipe", stderr: "pipe" });

const m = Bun.TOML.parse(await Bun.file(join(root, "forks.toml")).text()) as { meta: { org: string }; fork: { name: string; upstream: string }[] };
const org = m.meta.org;
const have = new Set((JSON.parse(gh("repo", "list", org, "--limit", "5000", "--json", "name").stdout.toString()) as { name: string }[]).map((r) => r.name.toLowerCase()));
const todo = m.fork.filter((f) => !have.has(f.name.toLowerCase()));
console.log(`${m.fork.length} forks in the manifest, ${m.fork.length - todo.length} exist, ${todo.length} to create`);
if (process.argv.includes("--dry-run")) process.exit(0);
let failed = 0;
const parentOf = (name: string): string => {
  const p = gh("api", `repos/${org}/${name}`, "--jq", ".parent.full_name // empty");
  return p.exitCode === 0 ? p.stdout.toString().trim().toLowerCase() : "";
};
for (const f of todo) {
  let ok = false;
  let why = "";
  for (let attempt = 0; attempt < 5 && !ok; attempt++) {
    const p = gh("repo", "fork", f.upstream, "--org", org, "--fork-name", f.name, "--clone=false");
    ok = p.exitCode === 0 || parentOf(f.name) === f.upstream.toLowerCase();
    why = p.stderr.toString().trim().slice(0, 100);
    if (!ok && /too quickly|being forked|rate limit/i.test(why)) await Bun.sleep(30_000 * (attempt + 1));
    else if (!ok) break;
  }
  if (!ok) failed++;
  console.log(`${ok ? "forked" : "FAILED"} ${f.upstream} -> ${org}/${f.name}${ok ? "" : ` ${why}`}`);
  await Bun.sleep(8000);
}
console.log(`done, ${failed} failed`);
process.exit(failed ? 1 : 0);
