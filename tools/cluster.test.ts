import { expect, test } from "bun:test";
import { parse, render, script } from "./cluster.ts";

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
