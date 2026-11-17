// Aphrody VPN: daemon control ABI, version 1. Generated from abi/ayvpn.abi.toml by tools/abi.ts; do not edit.
import { dlopen } from "bun:ffi";

// Return codes. Zero or positive is success; negative values are errors.
export const AYVPN_OK = 0;
export const AYVPN_CHANGED = 1;
export const AYVPN_ERR_IPC = -1;
export const AYVPN_ERR_INPUT = -2;
export const AYVPN_ERR_DAEMON = -3;
export const AYVPN_ERR_RUNTIME = -4;

// Tunnel states, the variants of Mullvad's TunnelState.
export const AYVPN_STATE_DISCONNECTED = 0;
export const AYVPN_STATE_CONNECTING = 1;
export const AYVPN_STATE_CONNECTED = 2;
export const AYVPN_STATE_DISCONNECTING = 3;
export const AYVPN_STATE_ERROR = 4;

/** Symbols of the ayvpn-ffi library as `bun:ffi` describes them. */
export const symbols = {
  ayvpn_abi_version: { args: [], returns: "u32" },
  ayvpn_state: { args: ["ptr"], returns: "i32" },
  ayvpn_connect: { args: [], returns: "i32" },
  ayvpn_disconnect: { args: [], returns: "i32" },
  ayvpn_login: { args: ["ptr", "usize"], returns: "i32" },
  ayvpn_daemon_run: { args: [], returns: "i32" },
} as const;

/** Opens a built ayvpn-ffi library (shared library) and binds every symbol. */
export const open = (path: string) => dlopen(path, symbols);
