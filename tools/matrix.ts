#!/usr/bin/env bun
// Feature matrix of every fork in forks.toml, from GitHub's own data (no clone): languages, licence, topics, README and the root file tree are matched
// against the catalog of features.toml, with the matching text as evidence. Output goes to the git-ignored .private/ (matrix.json, matrix.md).
//   bun tools/matrix.ts [--only a,b]
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "..");

export type Feature = { id: string; group: string; title: string; pattern: string };
export type Facts = { name: string; upstream: string; description: string; topics: string[]; license: string; languages: Record<string, number>; tree: string[]; readme: string };
export type Row = { repo: string; upstream: string; license: string; languages: string[]; features: Record<string, string> };

export function evaluate(f: Facts, features: Feature[]): Row {
  const text = `${f.name}\n${f.description}\n${f.topics.join(" ")}\n${f.tree.join("\n")}\n${f.readme}`;
  const found: Record<string, string> = {};
  for (const feat of features) {
    const m = new RegExp(feat.pattern, "i").exec(text);
    if (m) found[feat.id] = text.slice(Math.max(0, m.index - 30), m.index + m[0].length + 30).replace(/\s+/g, " ").trim();
  }
  const total = Object.values(f.languages).reduce((a, b) => a + b, 0) || 1;
  const languages = Object.entries(f.languages).sort((a, b) => b[1] - a[1]).filter(([, n]) => n / total >= 0.05).slice(0, 4).map(([l]) => l);
  return { repo: f.name, upstream: f.upstream, license: f.license, languages, features: found };
}

export function table(rows: Row[], features: Feature[]): string {
  const head = ["Repository", "License", "Languages", ...features.map((f) => f.id)];
  return [`| ${head.join(" | ")} |`, `|${head.map(() => "---").join("|")}|`, ...rows.map((r) => `| ${[r.repo, r.license, r.languages.join(", "), ...features.map((f) => (r.features[f.id] ? "x" : ""))].join(" | ")} |`), ""].join("\n");
}

async function gh(path: string, raw = false): Promise<any> {
  const p = Bun.spawn(["gh", "api", ...(raw ? ["-H", "Accept: application/vnd.github.raw"] : []), path], { stdout: "pipe", stderr: "ignore" });
  const out = await new Response(p.stdout).text();
  if ((await p.exited) !== 0) return undefined;
  return raw ? out : JSON.parse(out);
}

export async function collect(org: string, fork: { name: string; upstream: string }): Promise<Facts> {
  const repo = `${org}/${fork.name}`;
  const [meta, langs, tree, readme] = await Promise.all([gh(`repos/${repo}`), gh(`repos/${repo}/languages`), gh(`repos/${repo}/contents/`), gh(`repos/${repo}/readme`, true)]);
  return { name: fork.name, upstream: fork.upstream, description: meta?.description ?? "", topics: meta?.topics ?? [], license: meta?.license?.spdx_id ?? "none", languages: langs ?? {}, tree: Array.isArray(tree) ? tree.map((t: { name: string }) => t.name) : [], readme: (readme ?? "").slice(0, 60_000) };
}

if (import.meta.main) {
  const m = Bun.TOML.parse(await Bun.file(join(root, "forks.toml")).text()) as { meta: { org: string }; fork: { name: string; upstream: string }[] };
  const features = (Bun.TOML.parse(await Bun.file(join(root, "features.toml")).text()) as { feature: Feature[] }).feature;
  const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7).split(",");
  const forks = m.fork.filter((f) => !only || only.includes(f.name));
  const rows: Row[] = [];
  for (let i = 0; i < forks.length; i += 6) rows.push(...(await Promise.all(forks.slice(i, i + 6).map(async (f) => evaluate(await collect(m.meta.org, f), features)))));
  await Bun.write(join(root, ".private/matrix.json"), JSON.stringify(rows, null, 2));
  await Bun.write(join(root, ".private/matrix.md"), table(rows, features));
  const coverage = features.map((f) => `${f.id}:${rows.filter((r) => r.features[f.id]).length}`).join(" ");
  console.log(`${rows.length} repositories x ${features.length} features\n${coverage}`);
}
