# AGENTS.md

Contract for every agent working in ayvpn. Identity and sources come from `ayvpn.toml`.

- Upstreams are aphrody-labs forks consumed as submodules with relative URLs; never copies. New code lives in `ayvpn-<unit>` crates and `@aphrody/ayvpn-<unit>` packages, each with a working test.
- No data about the owner's machine, location or the fleet in tracked files; measurements, matrices and graphs go to the git-ignored `.private/`.
- Heavy clones and builds run on the build host, not the PC. Work on `main`, commit by path, no branches, stash or reset, no AI attribution.
- Run `bun test tools` before every push.
