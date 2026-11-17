import { expect, test } from "bun:test";
import { loadExits, optionsOf, parse, pickRelay, render, retarget, script, serialize, type Relay } from "./cluster.ts";

const KEY = "A".repeat(43) + "=";
const PUBLIC = "B".repeat(43) + "=";
const sample = `[Interface]
# Device: Test
PrivateKey = ${KEY}
Address = 10.1.2.3/32,fc00::1/128
DNS = 10.64.0.1

[Peer]
PublicKey = ${PUBLIC}
AllowedIPs = 0.0.0.0/0,::0/0
Endpoint = 203.0.113.9:51820
`;

test("a Mullvad config is read, and an incomplete one is refused without quoting a key", () => {
  const conf = parse(sample);
  expect(conf.address).toEqual(["10.1.2.3/32", "fc00::1/128"]);
  expect(conf.endpoint).toBe("203.0.113.9:51820");
  for (const broken of [sample.replace(/PrivateKey.*\n/, ""), sample.replace(KEY, "short"), sample.replace(/\[Peer\][\s\S]*/, "")]) {
    let message = "";
    try {
      parse(broken);
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).not.toBe("");
    expect(message).not.toContain(KEY);
  }
});

test("the host config never routes the host: a table of its own, a rule for one uid, no DNS change", () => {
  const text = render(parse(sample));
  expect(text).toContain("Table = 51820");
  expect(text).toContain("ip rule add uidrange 2000-2000 lookup 51820");
  expect(text).toContain("ip rule del uidrange 2000-2000 lookup 51820");
  expect(text).not.toContain("DNS");
  expect(text).toContain("PrivateKey = <hidden>");
  expect(text).not.toContain(KEY);
});

test("the install script writes the real key at mode 600 and asks nothing of the default route", () => {
  const text = script(parse(sample));
  expect(text).toContain(`PrivateKey = ${KEY}`);
  expect(text).toContain("umask 077");
  expect(text).toContain("chmod 600 /etc/wireguard/wgmullvad.conf");
  expect(text).toContain("useradd --system --uid 2000");
  expect(text).toContain("wg-quick up wgmullvad");
  expect(text.indexOf("Table = 51820")).toBeGreaterThan(0);
});

test("each exit has its own table, uid, interface and user, so the US and Japan tunnels live side by side", () => {
  const exits = loadExits();
  expect(exits.map((exit) => `${exit.purpose}:${exit.country}/${exit.city}`)).toEqual(["google:us/qas", "crawl:jp/tyo"]);
  expect(new Set(exits.map((exit) => exit.uid)).size).toBe(exits.length);
  expect(new Set(exits.map((exit) => exit.table)).size).toBe(exits.length);
  const text = script(parse(sample), optionsOf(exits[1]!));
  expect(text).toContain("useradd --system --uid 2002");
  expect(text).toContain("/etc/wireguard/wg-jp.conf");
  expect(text).toContain("Table = 51822");
  expect(text).toContain("ip rule add uidrange 2002-2002 lookup 51822");
  expect(text).toContain("sudo -u vpn-jp curl");
  expect(render(parse(sample), true, optionsOf(exits[0]!))).toContain("lookup 51821");
});

test("a device is retargeted to the best relay of an exit and keeps its own key and addresses", () => {
  const relay = (hostname: string, location: string, owned: boolean, weight: number, active = true): Relay => ({ hostname, location, active, owned, ipv4_addr_in: "198.51.100." + weight, public_key: "C".repeat(43) + "=", weight });
  const relays = [relay("us-qas-wg-001", "us-qas", false, 300), relay("us-qas-wg-002", "us-qas", true, 100), relay("us-qas-wg-003", "us-qas", true, 200), relay("us-qas-wg-004", "us-qas", true, 999, false), relay("jp-tyo-wg-001", "jp-tyo", false, 50)];
  expect(pickRelay(relays, { country: "us", city: "qas" }).hostname).toBe("us-qas-wg-003");
  expect(pickRelay(relays, { country: "jp", city: "tyo" }).hostname).toBe("jp-tyo-wg-001");
  expect(() => pickRelay(relays, { country: "fr", city: "par" })).toThrow("no active relay in fr-par");
  const conf = parse(sample);
  const moved = retarget(conf, relays[2]!);
  expect(moved.privateKey).toBe(conf.privateKey);
  expect(moved.address).toEqual(conf.address);
  expect(moved.endpoint).toBe("198.51.100.200:51820");
  expect(parse(serialize(moved))).toEqual(moved);
});
