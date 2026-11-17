#!/usr/bin/env bun
// The best-practice configuration of the Mullvad client on a desktop (the daemon and its CLI come from the Mullvad app: winget id
// MullvadVPN.MullvadVPN on Windows, the apt/dnf/pacman package elsewhere; the Mullvad Browser is MullvadVPN.MullvadBrowser). Every step is a
// `mullvad` CLI command; `plan` lists them and `apply` runs them, then reads the settings back. It never connects the tunnel and never turns on
// lockdown mode or auto-connect: those change how the whole machine reaches the network and stay a decision of the person at the keyboard.
//   bun tools/setup.ts plan [--country fr --city mrs]
//   bun tools/setup.ts apply [--country fr --city mrs]
// The account is read from .secrets/env.vpn (git-ignored) only when the client is logged out, and goes to the CLI through stdin, never through
// an argument or a log line. The location defaults to `any`: pass --country and --city (or set AYVPN_COUNTRY and AYVPN_CITY) for the nearest relays.
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");

export type Step = { why: string; args: string[] };

/** The settings, in the order they are applied. */
export function steps(country?: string, city?: string): Step[] {
  const location = country ? ["relay", "set", "location", country, ...(city ? [city] : [])] : ["relay", "set", "location", "any"];
  return [
    { why: "Quantum-resistant key exchange", args: ["tunnel", "set", "quantum-resistant", "on"] },
    { why: "DAITA, against traffic analysis", args: ["tunnel", "set", "daita", "on"] },
    { why: "IPv6 inside the tunnel, so it cannot leak around it", args: ["tunnel", "set", "ipv6", "on"] },
    { why: "DNS content blockers: ads, trackers, malware", args: ["dns", "set", "default", "--block-ads", "--block-trackers", "--block-malware"] },
    { why: "Local network devices stay reachable", args: ["lan", "set", "allow"] },
    { why: "Anti-censorship obfuscation picked automatically", args: ["anti-censorship", "set", "mode", "auto"] },
    { why: country ? `Relays of ${country}${city ? ` ${city}` : ""}, the nearest to this machine` : "Any relay", args: location },
  ];
}

/** An account number as the CLI wants it: sixteen digits, from a file that may group them with spaces. */
export function accountOf(text: string): string | undefined {
  const digits = text.replace(/\s+/g, "");
  return /^\d{16}$/.test(digits) ? digits : undefined;
}

export const mullvadBinary = (platform: string = process.platform, env: Record<string, string | undefined> = Bun.env): string =>
  env.MULLVAD_CLI ?? (platform === "win32" ? "C:/Program Files/Mullvad VPN/resources/mullvad.exe" : "mullvad");

const run = (binary: string, args: string[], input?: string) => {
  const process_ = Bun.spawnSync([binary, ...args], { stdin: input ? new TextEncoder().encode(input) : undefined, stdout: "pipe", stderr: "pipe" });
  return { code: process_.exitCode ?? 1, out: process_.stdout.toString().trim(), err: process_.stderr.toString().trim() };
};

if (import.meta.main) {
  const argv = Bun.argv.slice(2);
  const flag = (name: string, env: string) => argv[argv.indexOf(`--${name}`) + 1] ?? Bun.env[env];
  const country = argv.includes("--country") ? flag("country", "AYVPN_COUNTRY") : Bun.env.AYVPN_COUNTRY;
  const city = argv.includes("--city") ? flag("city", "AYVPN_CITY") : Bun.env.AYVPN_CITY;
  const [command = "plan"] = argv;
  const list = steps(country, city);
  const binary = mullvadBinary();
  if (command === "plan") {
    for (const step of list) console.log(`mullvad ${step.args.join(" ")}   # ${step.why}`);
  } else if (command === "apply") {
    const account = run(binary, ["account", "get"]);
    if (account.code !== 0 || /not logged in/i.test(account.out + account.err)) {
      const file = join(ROOT, ".secrets", "env.vpn");
      const number = existsSync(file) ? accountOf(readFileSync(file, "utf8")) : undefined;
      if (!number) throw new Error("the client is logged out and .secrets/env.vpn has no sixteen-digit account");
      const login = run(binary, ["account", "login"], `${number}\n`);
      if (login.code !== 0) throw new Error("account login failed");
      console.log("logged in");
    }
    for (const step of list) {
      const result = run(binary, step.args);
      console.log(`${result.code === 0 ? "ok  " : "FAIL"} mullvad ${step.args.join(" ")}`);
      if (result.code !== 0) throw new Error(result.err || result.out);
    }
    for (const read of [["tunnel", "get"], ["dns", "get"], ["lan", "get"], ["relay", "get"], ["status"]]) console.log(run(binary, read).out);
  } else {
    console.error("usage: setup.ts plan|apply [--country cc --city code]");
    process.exit(2);
  }
}
