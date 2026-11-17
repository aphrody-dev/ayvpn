# ayvpn

The Aphrody VPN: one tunnel stack (Rust, Go, C, C++, TypeScript) assembled from forks of the Mullvad, Cloudflare and Brave organizations, with a Google Cloud network replacement, latency-based routing and no geographic telemetry. See `docs/adr/0001-one-tunnel-stack.md`.

- `ayvpn.toml` sources; `bun tools/discover.ts` writes `forks.toml`; `bun ../rust-mono/tools/fork.ts --manifest forks.toml` creates the missing forks; submodules are registered with `rust-mono`'s `tools/submodules.ts --manifest forks.toml --write`.
- Generated data (matrix, graphs, measurements) lives in the git-ignored `.private/`.

## Desktop setup

The Mullvad app (winget `MullvadVPN.MullvadVPN`, with its daemon and `mullvad` CLI) and the Mullvad Browser (`MullvadVPN.MullvadBrowser`) are the desktop install; the GPUI client (`aphrody-vpn`) talks to the same daemon. `bun tools/setup.ts plan` lists the best-practice settings (quantum-resistant tunnel, DAITA, IPv6, DNS blockers, LAN access, automatic obfuscation, the nearest relays) and `apply` sets them; it never connects the tunnel or turns on lockdown mode or auto-connect. The account stays in the git-ignored `.secrets/` and reaches the CLI through stdin.

## Servers

`bun tools/cluster.ts plan|render|script <role>` prepares Mullvad WireGuard for the servers of the fleet (roles `build`, `test`, `prod` of the git-ignored `ay.local.toml`) without putting a server's default route in a tunnel: only the processes of one dedicated user reach the Internet through Mullvad (policy routing by uid), so SSH, health checks and IP-restricted API calls keep the host's own network. Each role needs its own Mullvad device key, saved as `.private/cluster/<role>.conf`. The script it prints is run by a person, on the host, with sudo; nothing here connects to a host.

## Exits

`exits.toml` names where traffic leaves the VPN: the USA (Ashburn) for the Google services and Japan (Tokyo) for the crawlers of Shenron, Rosegriffon and their siblings. `bun tools/exits.ts use google|crawl` points the desktop client at one of them (it connects only with `--connect`). On a server, `bun tools/cluster.ts retarget <role>` writes one config per exit from the role's own device key and the relay list Mullvad publishes, and `script <role> <exit>` prints the installer: one tunnel and one system user per exit (`vpn-us`, `vpn-jp`), policy routing by uid, so a crawler started as `vpn-jp` leaves through Tokyo, a Google client started as `vpn-us` through Ashburn, and SSH and the rest keep the host's own route.
