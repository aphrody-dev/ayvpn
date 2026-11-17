// The Aphrody VPN from Bun. Every call is the C ABI of abi/ayvpn.abi.toml (library crates/ayvpn-ffi),
// bound with the generated symbol table; nothing here restates a signature or a constant.
import { ptr } from "bun:ffi";
import * as abi from "../../abi/gen/ayvpn_abi.ts";

export const State = {
  Disconnected: abi.AYVPN_STATE_DISCONNECTED,
  Connecting: abi.AYVPN_STATE_CONNECTING,
  Connected: abi.AYVPN_STATE_CONNECTED,
  Disconnecting: abi.AYVPN_STATE_DISCONNECTING,
  Error: abi.AYVPN_STATE_ERROR,
} as const;
export type State = (typeof State)[keyof typeof State];

const reasons: Record<number, string> = {
  [abi.AYVPN_ERR_IPC]: "the daemon is not reachable",
  [abi.AYVPN_ERR_INPUT]: "an argument is invalid",
  [abi.AYVPN_ERR_DAEMON]: "the daemon refused the request",
  [abi.AYVPN_ERR_RUNTIME]: "the async runtime could not start",
};

export class VpnError extends Error {
  constructor(readonly code: number) {
    super(reasons[code] ?? `unknown status ${code}`);
    this.name = "VpnError";
  }
}

const ok = (code: number): boolean => {
  if (code < 0) throw new VpnError(code);
  return code === abi.AYVPN_CHANGED;
};

/** The library's file name on this platform. */
export const libraryName = (platform = process.platform): string =>
  platform === "win32" ? "ayvpn_ffi.dll" : platform === "darwin" ? "libayvpn_ffi.dylib" : "libayvpn_ffi.so";

/** Opens the library at `path` (default: $AYVPN_LIB, else the platform name on the loader's search path). */
export function open(path = Bun.env.AYVPN_LIB ?? libraryName()) {
  const { symbols: s, close } = abi.open(path);
  if (s.ayvpn_abi_version() !== 1) throw new Error(`${path}: ABI version ${s.ayvpn_abi_version()}, expected 1`);
  return {
    close,
    /** The current tunnel state. */
    state(): State {
      const out = new Uint32Array(1);
      ok(s.ayvpn_state(ptr(out)));
      return out[0]! as State;
    },
    /** Connects with the daemon's settings; true when the state changed. */
    connect: () => ok(s.ayvpn_connect()),
    /** Disconnects; true when the state changed. */
    disconnect: () => ok(s.ayvpn_disconnect()),
    /** Logs in with a sixteen-digit account number. */
    login(account: string) {
      const bytes = new TextEncoder().encode(account);
      ok(s.ayvpn_login(bytes.length ? ptr(bytes) : null, bytes.length));
    },
  };
}
