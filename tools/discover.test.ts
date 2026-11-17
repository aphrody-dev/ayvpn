import { expect, test } from "bun:test";
import { forkName, select, toToml, type Repo } from "./discover.ts";

const r = (name: string, lang: string | null, description = "", archived = false): Repo => ({ name, description, primaryLanguage: lang ? { name: lang } : null, isArchived: archived, defaultBranchRef: { name: "main" }, repositoryTopics: [] });

test("all takes every non-archived repository; match needs a language and a pattern hit; extra always wins", () => {
  const repos = [r("a", "Rust"), r("b", null, "", true), r("tunnel-x", "Go"), r("tunnel-y", "Python"), r("pretty", "Go", "a wireguard helper"), r("plain", "Go"), r("cloudflared", "Go")];
  expect(select({ org: "m", take: "all" }, repos).map((x) => x.name)).toEqual(["a", "tunnel-x", "tunnel-y", "pretty", "plain", "cloudflared"]);
  const src = { org: "c", take: "match" as const, languages: ["Go", "Rust"], pattern: "tunnel|wireguard", extra: ["c/plain", "other/a"] };
  expect(select(src, repos).map((x) => x.name)).toEqual(["tunnel-x", "pretty", "plain"]);
});

test("fork names avoid collisions and the manifest parses back", () => {
  expect(forkName("mullvad", "openvpn", new Map([["openvpn", "openvpn/openvpn"]]))).toBe("mullvad-openvpn");
  expect(forkName("mullvad", "openvpn", new Map([["openvpn", "openvpn/openvpn"], ["mullvad-openvpn", "mullvad/openvpn"]]))).toBe("mullvad-openvpn");
  expect(forkName("mullvad", "mullvadvpn-app", new Map([["mullvadvpn-app", "mullvad/mullvadvpn-app"]]))).toBe("mullvadvpn-app");
  expect(forkName("mullvad", "gotatun", new Map())).toBe("gotatun");
  const t = Bun.TOML.parse(toToml("o", [{ path: "mullvad/gotatun", name: "gotatun", upstream: "mullvad/gotatun", branch: "main" }], "2026-01-01")) as { meta: { org: string }; fork: { path: string; role: string }[] };
  expect(t.meta.org).toBe("o");
  expect(t.fork[0]).toMatchObject({ path: "mullvad/gotatun", role: "consumer" });
});

test("the manifest names the consumer organization when it differs from the fork organization", () => {
  const entries = [{ path: "mullvad/gotatun", name: "gotatun", upstream: "mullvad/gotatun", branch: "main" }];
  expect((Bun.TOML.parse(toToml("forks", entries, "2026-01-01", "app")) as { meta: { consumer?: string } }).meta.consumer).toBe("app");
  expect((Bun.TOML.parse(toToml("forks", entries, "2026-01-01")) as { meta: { consumer?: string } }).meta.consumer).toBeUndefined();
});
