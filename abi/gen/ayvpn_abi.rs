//! Aphrody VPN: daemon control ABI, version 1. Generated from abi/ayvpn.abi.toml by tools/abi.ts; do not edit.

// Return codes. Zero or positive is success; negative values are errors.
pub const AYVPN_OK: i32 = 0;
pub const AYVPN_CHANGED: i32 = 1;
pub const AYVPN_ERR_IPC: i32 = -1;
pub const AYVPN_ERR_INPUT: i32 = -2;
pub const AYVPN_ERR_DAEMON: i32 = -3;
pub const AYVPN_ERR_RUNTIME: i32 = -4;

// Tunnel states, the variants of Mullvad's TunnelState.
pub const AYVPN_STATE_DISCONNECTED: u32 = 0;
pub const AYVPN_STATE_CONNECTING: u32 = 1;
pub const AYVPN_STATE_CONNECTED: u32 = 2;
pub const AYVPN_STATE_DISCONNECTING: u32 = 3;
pub const AYVPN_STATE_ERROR: u32 = 4;

unsafe extern "C" {
    pub fn ayvpn_abi_version() -> u32;
    pub fn ayvpn_state(out_state: *mut u32) -> i32;
    pub fn ayvpn_connect() -> i32;
    pub fn ayvpn_disconnect() -> i32;
    pub fn ayvpn_login(account: *const u8, len: usize) -> i32;
    pub fn ayvpn_daemon_run() -> i32;
}
