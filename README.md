# ayvpn

The Aphrody VPN: one tunnel stack (Rust, Go, C, C++, TypeScript) assembled from forks of the Mullvad, Cloudflare and Brave organizations, with a Google Cloud network replacement, latency-based routing and no geographic telemetry. See `docs/adr/0001-one-tunnel-stack.md`.

- `ayvpn.toml` sources; `bun tools/discover.ts` writes `forks.toml`; `bun ../rust-mono/tools/fork.ts --manifest forks.toml` creates the missing forks; submodules are registered with `rust-mono`'s `tools/submodules.ts --manifest forks.toml --write`.
- Generated data (matrix, graphs, measurements) lives in the git-ignored `.private/`.

## Desktop setup

The Mullvad app (winget `MullvadVPN.MullvadVPN`, with its daemon and `mullvad` CLI) and the Mullvad Browser (`MullvadVPN.MullvadBrowser`) are the desktop install; the GPUI client (`aphrody-vpn`) talks to the same daemon. `bun tools/setup.ts plan` lists the best-practice settings (quantum-resistant tunnel, DAITA, IPv6, DNS blockers, LAN access, automatic obfuscation, the nearest relays) and `apply` sets them; it never connects the tunnel or turns on lockdown mode or auto-connect. The account stays in the git-ignored `.secrets/` and reaches the CLI through stdin.
