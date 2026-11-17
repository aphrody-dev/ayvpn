/*
 * Aphrody VPN: daemon control ABI, version 1.
 *
 * A thin, blocking C ABI over the daemon's management IPC, for hosts that cannot speak it.
 * Every call opens its own connection; no handle, no global state, no allocation crosses it.
 * Generated from abi/ayvpn.abi.toml: edit the spec, not the generated files.
 */
#ifndef AYVPN_ABI_H
#define AYVPN_ABI_H

#include <stdint.h>

/* Return codes. Zero or positive is success; negative values are errors. */
#define AYVPN_OK           0     /* done, nothing changed */
#define AYVPN_CHANGED      1     /* done, the tunnel state changed */
#define AYVPN_ERR_IPC      (-1)  /* the daemon is not reachable */
#define AYVPN_ERR_INPUT    (-2)  /* an argument is invalid (null pointer, bad account) */
#define AYVPN_ERR_DAEMON   (-3)  /* the daemon refused the request */
#define AYVPN_ERR_RUNTIME  (-4)  /* the async runtime could not start */

/* Tunnel states, the variants of Mullvad's TunnelState. */
#define AYVPN_STATE_DISCONNECTED   0
#define AYVPN_STATE_CONNECTING     1
#define AYVPN_STATE_CONNECTED      2
#define AYVPN_STATE_DISCONNECTING  3
#define AYVPN_STATE_ERROR          4

/* Blocking calls over the daemon's management IPC; each opens and closes its own connection. */
uint32_t ayvpn_abi_version(void);
int32_t  ayvpn_state(uint32_t *out_state);
int32_t  ayvpn_connect(void);
int32_t  ayvpn_disconnect(void);
int32_t  ayvpn_login(const uint8_t *account, uintptr_t len);
int32_t  ayvpn_daemon_run(void);

#endif /* AYVPN_ABI_H */
