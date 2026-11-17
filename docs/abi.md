# AYVPN ABI, version 1

<!-- Generated from abi/ayvpn.abi.toml by tools/abi.ts; do not edit. -->

A thin, blocking C ABI over the daemon's management IPC, for hosts that cannot speak it. Every call opens its own connection; no handle, no global state, no allocation crosses it. Generated from abi/ayvpn.abi.toml: edit the spec, not the generated files.

## Return codes. Zero or positive is success; negative values are errors

| Name | Value | Meaning |
|---|---:|---|
| `AYVPN_OK` | 0 | done, nothing changed |
| `AYVPN_CHANGED` | 1 | done, the tunnel state changed |
| `AYVPN_ERR_IPC` | -1 | the daemon is not reachable |
| `AYVPN_ERR_INPUT` | -2 | an argument is invalid (null pointer, bad account) |
| `AYVPN_ERR_DAEMON` | -3 | the daemon refused the request |
| `AYVPN_ERR_RUNTIME` | -4 | the async runtime could not start |

## Tunnel states, the variants of Mullvad's TunnelState

| Name | Value | Meaning |
|---|---:|---|
| `AYVPN_STATE_DISCONNECTED` | 0 |  |
| `AYVPN_STATE_CONNECTING` | 1 |  |
| `AYVPN_STATE_CONNECTED` | 2 |  |
| `AYVPN_STATE_DISCONNECTING` | 3 |  |
| `AYVPN_STATE_ERROR` | 4 |  |

## Functions

| Function | Signature | Meaning |
|---|---|---|
| `ayvpn_abi_version` | `uint32_t ayvpn_abi_version(void);` | The ABI version the library implements. |
| `ayvpn_state` | `int32_t ayvpn_state(uint32_t *out_state);` | Writes the current AYVPN_STATE_* to `out_state`. |
| `ayvpn_connect` | `int32_t ayvpn_connect(void);` | Asks the daemon to connect with its current settings. |
| `ayvpn_disconnect` | `int32_t ayvpn_disconnect(void);` | Asks the daemon to disconnect. |
| `ayvpn_login` | `int32_t ayvpn_login(const uint8_t *account, uintptr_t len);` | Logs in with a sixteen-digit account number; the number is never logged or echoed. |
| `ayvpn_daemon_run` | `int32_t ayvpn_daemon_run(void);` | Runs the daemon in the calling thread until it stops. |
