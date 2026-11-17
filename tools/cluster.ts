#!/usr/bin/env bun
// Mullvad WireGuard for the servers of the fleet, without ever putting a server's default route in a tunnel. A server keeps its SSH session,
// its provider's health checks and its IP-restricted API calls: only the processes of one dedicated user reach the Internet through Mullvad
// (policy routing by uid), everything else stays on the host's own network.
//   bun tools/cluster.ts plan            what would be installed on each role (nothing is read from or written to a host)
//   bun tools/cluster.ts render <role>   print the ready-to-install config of a role, the private key replaced by <hidden>
//   bun tools/cluster.ts script <role>   print the shell script that installs it on that host (run it yourself, over ssh, with sudo)
// Each role needs its own config in .private/cluster/<role>.conf (git-ignored): a Mullvad device key must not be shared by two hosts. Roles
// come from the hosts block of ay.local.toml (build, test, prod); no host name or address appears in this file or in a tracked one.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const DIR = join(ROOT, ".private", "cluster");

export type Conf = { address: string[]; privateKey: string; dns?: string; publicKey: string; endpoint: string; allowedIps: string };

/** Reads a WireGuard config as Mullvad's generator writes it. Throws a message that never quotes a key. */
export function parse(text: string): Conf {
  const sections = new Map<string, Map<string, string>>();
  let current = "";
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const header = line.match(/^\[(\w+)\]$/);
    if (header) {
      current = header[1]!;
      sections.set(current, new Map());
    } else if (current && line && !line.startsWith("#")) {
      const index = line.indexOf("=");
      if (index > 0) sections.get(current)!.set(line.slice(0, index).trim(), line.slice(index + 1).trim());
    }
  }
  const face = sections.get("Interface");
  const peer = sections.get("Peer");
  const need = (map: Map<string, string> | undefined, key: string, where: string) => {
    const value = map?.get(key);
    if (!value) throw new Error(`the config has no ${key} in [${where}]`);
    return value;
  };
  const privateKey = need(face, "PrivateKey", "Interface");
  if (!/^[A-Za-z0-9+/]{43}=$/.test(privateKey)) throw new Error("the PrivateKey is not a WireGuard key");
  return {
    address: need(face, "Address", "Interface").split(",").map((part) => part.trim()),
    privateKey,
    dns: face?.get("DNS"),
    publicKey: need(peer, "PublicKey", "Peer"),
    endpoint: need(peer, "Endpoint", "Peer"),
    allowedIps: need(peer, "AllowedIPs", "Peer"),
  };
}

export type Options = { table?: number; uid?: number; interfaceName?: string };

/** The host config: a routing table of its own, a rule that sends one uid to it, no DNS change, no route for the host itself. */
export function render(conf: Conf, hide = true, options: Options = {}): string {
  const table = options.table ?? 51820;
  const uid = options.uid ?? 2000;
  const key = hide ? "<hidden>" : conf.privateKey;
  return [
    "[Interface]",
    `PrivateKey = ${key}`,
    `Address = ${conf.address.join(", ")}`,
    `Table = ${table}`,
    `PostUp = ip rule add uidrange ${uid}-${uid} lookup ${table} priority 100; ip -6 rule add uidrange ${uid}-${uid} lookup ${table} priority 100`,
    `PostDown = ip rule del uidrange ${uid}-${uid} lookup ${table} priority 100; ip -6 rule del uidrange ${uid}-${uid} lookup ${table} priority 100`,
    "",
    "[Peer]",
    `PublicKey = ${conf.publicKey}`,
    `Endpoint = ${conf.endpoint}`,
    `AllowedIPs = ${conf.allowedIps}`,
    "PersistentKeepalive = 25",
    "",
  ].join("\n");
}

/** The script a person runs on the host: a user for the tunnel, the config at mode 600, the interface brought up and checked. */
export function script(conf: Conf, options: Options = {}): string {
  const name = options.interfaceName ?? "wgmullvad";
  const uid = options.uid ?? 2000;
  return [
    "#!/bin/sh",
    "set -eu",
    `# Installs a Mullvad WireGuard tunnel that only the user 'vpn' (uid ${uid}) uses. SSH and everything else keep the host's own route.`,
    "command -v wg-quick >/dev/null || { echo 'wireguard-tools is not installed' >&2; exit 1; }",
    `id vpn >/dev/null 2>&1 || useradd --system --uid ${uid} --no-create-home --shell /usr/sbin/nologin vpn`,
    "umask 077",
    `cat > /etc/wireguard/${name}.conf <<'CONF'`,
    render(conf, false, options).trimEnd(),
    "CONF",
    `chmod 600 /etc/wireguard/${name}.conf`,
    `wg-quick up ${name}`,
    "echo 'host:   '$(curl -s --max-time 10 https://am.i.mullvad.net/ip)",
    "echo 'tunnel: '$(sudo -u vpn curl -s --max-time 10 https://am.i.mullvad.net/connected)",
    `echo "to remove: wg-quick down ${name} && rm /etc/wireguard/${name}.conf"`,
    "",
  ].join("\n");
}

const roles = (): string[] => {
  const file = join(ROOT, "..", "ay", "ay.local.toml");
  if (!existsSync(file)) return ["build", "test", "prod"];
  const hosts = (Bun.TOML.parse(readFileSync(file, "utf8")) as { hosts?: Record<string, unknown> }).hosts ?? {};
  return ["build", "test", "prod"].filter((role) => role in hosts);
};

if (import.meta.main) {
  const [command = "plan", role] = Bun.argv.slice(2);
  const configs = existsSync(DIR) ? readdirSync(DIR).filter((file) => file.endsWith(".conf")).map((file) => file.slice(0, -5)) : [];
  if (command === "plan") {
    for (const name of roles()) console.log(`${name.padEnd(6)} ${configs.includes(name) ? "config ready" : `needs its own device: generate a key on the Mullvad WireGuard page and save the file as .private/cluster/${name}.conf`}`);
  } else if (command === "render" || command === "script") {
    if (!role || !configs.includes(role)) throw new Error(`no .private/cluster/${role ?? "<role>"}.conf`);
    const conf = parse(readFileSync(join(DIR, `${role}.conf`), "utf8"));
    console.log(command === "render" ? render(conf) : script(conf));
  } else {
    console.error("usage: cluster.ts plan | render <role> | script <role>");
    process.exit(2);
  }
}
