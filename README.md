# ayvpn

The Aphrody VPN: one tunnel stack (Rust, Go, C, C++, TypeScript) assembled from forks of the Mullvad, Cloudflare and Brave organizations, with a Google Cloud network replacement, latency-based routing and no geographic telemetry. See `docs/adr/0001-one-tunnel-stack.md`.

- `ayvpn.toml` sources; `bun tools/discover.ts` writes `forks.toml`; `bun ../rust-mono/tools/fork.ts --manifest forks.toml` creates the missing forks; submodules are registered with `rust-mono`'s `tools/submodules.ts --manifest forks.toml --write`.
- Generated data (matrix, graphs, measurements) lives in the git-ignored `.private/`.
