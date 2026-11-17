# ADR-0001: One tunnel stack assembled from forks, with latency-based routing and no geographic telemetry

Status: proposed, 2026-11-17 (owner request: an Aphrody VPN forked from the Mullvad, Cloudflare and Brave organizations; a replacement for Google Cloud's VPC, VPN and DNS; use of Google's and Cloudflare's proxy networks without geographic telemetry or restriction, with the best latency and speed for the user's real location; free, on own infrastructure or Cloudflare plus Mullvad; usable by every Aphrody user and repository).

## Context
Forks are the source: `ayvpn.toml` lists the organizations, `tools/discover.ts` selects repositories from the live API, `forks.toml` is the manifest read by `rust-mono`'s fork tooling (reused, not copied), and every upstream is an `aphrody-labs` fork consumed as a submodule with a relative URL. What the forks give us, by layer (read from the repositories' own descriptions, to be confirmed in the code graph):
- Tunnel: Mullvad `gotatun` (userspace WireGuard in Rust), `wireguard-go`, `wireguard-rs`, `udp-over-tcp`, `shadowsocks-rust`, `wgephemeralpeer` (post-quantum WireGuard), `maybenot` (traffic-analysis defenses), `domain-fronting` (TCP over HTTP CDNs); Cloudflare `boringtun`, `quiche`, `cloudflared`, `pingora`, `workerd`.
- Daemon and platform glue: Mullvad `mullvadvpn-app` (Rust daemon, management interface, GUI in TypeScript, Android and iOS), `nftnl-rs`, `mnl-rs`, `netlink`, `pfctl-rs`, `libwfp`, `win-split-tunnel`, `windows-service-rs`, `system-configuration-rs`.
- DNS and filtering: Mullvad `dns-blocklists`, `coredns`, `trust-dns`; Brave `adblock-rust`.
- Client surfaces: Mullvad `browser-extension`, `mullvad-browser`; Brave `brave-core` (includes its VPN component) and `brave-browser`.
- The Bun fork already carries a native embedded Mullvad VPN daemon and management client (`bun:vpn`); it is the first consumer.

## Decision
1. **One daemon, one ABI.** The core is Rust (daemon, tunnel manager, route selector). Go stays where the upstream is Go (`wireguard-go`, `cloudflared`, `coredns`, gVisor's netstack as a library), C and C++ stay for Windows drivers and system filters, TypeScript is the GUI, website, browser extension and SDK. Every boundary is the C ABI generated from a spec by `ay`'s generator (`ay/abi`, ADR-0011): `ayvpn.abi.toml` yields the C header, Rust, Bun FFI, Python and the docs, so each language binds one source.
2. **Latency-based routing, location never leaves the device.** The route selector measures round-trip time from the client to candidate entries (Cloudflare edge locations through its `cdn-cgi/trace` answer, Google's public anycast addresses, Mullvad's published relay list, our own nodes) and picks the fastest path per destination class. No geolocation service is called, no position is sent anywhere; the user's country and measurements stay in the client's private store (`ay.local.toml`/`.private` pattern), never in a tracked file. Geographic restriction is handled by choosing an exit in the allowed country among the measured candidates.
3. **Replace what Google Cloud sells with parts we run.** Cloud VPN, VPC peering: WireGuard site-to-site and a mesh overlay (gotatun/boringtun/wireguard-go). Cloud DNS: CoreDNS or Hickory DNS (trust-dns) zones with DoH/DoT to resolvers and filtering lists. Cloud Load Balancing: Pingora. Cloud NAT and firewall: nftables (`nftnl-rs`, gVisor netstack). Cloud Armor and edge proxy: Cloudflare's free proxy in front, `cloudflared` for inbound tunnels without public ports. Google and Cloudflare networks are used as transport and as CDN fronts (`domain-fronting`, `udp-over-tcp`), not as places where telemetry is accepted.
4. **Free means no mandatory fee.** Paths: (a) own infrastructure for entries and exits (the fleet's hosts or any VPS), (b) Cloudflare's free proxy and tunnels as the edge, (c) Mullvad relays as exits for users who hold a Mullvad account. Licences stay those of the upstreams (read per repository by the matrix). Whether a Mullvad account is free is not assumed: it is checked on Mullvad's own site before the SDK documents it.
5. **Assemble, never copy.** The code of the forks stays in the forks; `ayvpn` holds only the manifest, the generators, the ABI spec, the matrix, the graph tools, and the new Aphrody crates and packages (named `ayvpn-<unit>`), each added only with a working, tested unit.

## Work order
1. Forks and submodules: `bun ../rust-mono/tools/fork.ts --manifest forks.toml`, then `rust-mono`'s `tools/submodules.ts --manifest forks.toml --write`.
2. Matrix and graph (generated, private outputs): per repository language, licence, build system, entry points, public API surface (tree-sitter through `ay/tools/ts.ts`), dependency graph from `Cargo.lock`, `go.mod` and `package.json`, and a feature matrix across Mullvad, Cloudflare WARP and Brave VPN features.
3. `ayvpn.abi.toml` and the generated bindings; the route selector crate with tests on recorded measurements; the daemon wiring on `gotatun` and `bun:vpn`.
4. SDK packages (`@aphrody/ayvpn`, `ayvpn-*` crates), then the website, then packaging for Windows, Linux, Android.

## Open (not verified)
Licence of every fork, which Cloudflare repositories the filter missed, whether Brave's VPN component is usable outside the browser, and the real cost of Mullvad exits.
