import { expect, test } from "bun:test";
import { accountOf, mullvadBinary, steps } from "./setup.ts";

test("the steps turn on quantum resistance, DAITA, IPv6 and the DNS blockers, and never connect, lock down or auto-connect", () => {
  const joined = steps().map((step) => step.args.join(" "));
  for (const expected of ["tunnel set quantum-resistant on", "tunnel set daita on", "tunnel set ipv6 on", "dns set default --block-ads --block-trackers --block-malware", "lan set allow"]) expect(joined).toContain(expected);
  for (const forbidden of ["connect", "lockdown", "auto-connect", "factory-reset", "account login"]) expect(joined.some((line) => line.startsWith(forbidden) || line.includes(` ${forbidden} `))).toBe(false);
});

test("the location is any by default, and a country and a city when given", () => {
  expect(steps().at(-1)!.args).toEqual(["relay", "set", "location", "any"]);
  expect(steps("fr", "mrs").at(-1)!.args).toEqual(["relay", "set", "location", "fr", "mrs"]);
  expect(steps("fr").at(-1)!.args).toEqual(["relay", "set", "location", "fr"]);
});

test("an account is sixteen digits, with or without the groups of four, and nothing else", () => {
  expect(accountOf("1234 5678 9012 3456\n")).toBe("1234567890123456");
  expect(accountOf("1234567890123456")).toBe("1234567890123456");
  for (const bad of ["", "1234", "1234 5678 9012 345x", "12345678901234567", "MULLVAD=1234567890123456"]) expect(accountOf(bad)).toBeUndefined();
});

test("the CLI is the Mullvad app's on Windows, the one on the PATH elsewhere, and MULLVAD_CLI wins", () => {
  expect(mullvadBinary("win32", {})).toContain("Mullvad VPN/resources/mullvad.exe");
  expect(mullvadBinary("linux", {})).toBe("mullvad");
  expect(mullvadBinary("linux", { MULLVAD_CLI: "/x/mullvad" })).toBe("/x/mullvad");
});
