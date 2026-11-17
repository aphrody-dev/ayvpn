import { expect, test } from "bun:test";
import { evaluate, table, type Feature } from "./matrix.ts";

const features: Feature[] = [{ id: "wireguard", group: "tunnel", title: "WireGuard", pattern: "wireguard" }, { id: "kill-switch", group: "privacy", title: "Kill switch", pattern: "kill.?switch" }];

test("a repository is crossed with the catalog and the evidence is the text around the match", () => {
  const row = evaluate({ name: "gotatun", upstream: "m/gotatun", description: "Userspace WireGuard implementation", topics: [], license: "MPL-2.0", languages: { Rust: 900, Shell: 10 }, tree: ["Cargo.toml"], readme: "" }, features);
  expect(row.features.wireguard).toContain("WireGuard");
  expect(row.features["kill-switch"]).toBeUndefined();
  expect(row.languages).toEqual(["Rust"]);
});

test("the table marks present features", () => {
  const row = evaluate({ name: "a", upstream: "o/a", description: "kill switch", topics: [], license: "MIT", languages: {}, tree: [], readme: "" }, features);
  expect(table([row], features)).toContain("| a | MIT |  |  | x |");
});
