"""Aphrody VPN: daemon control ABI, version 1. Generated from abi/ayvpn.abi.toml by tools/abi.ts; do not edit."""
import ctypes

# Return codes. Zero or positive is success; negative values are errors.
AYVPN_OK = 0
AYVPN_CHANGED = 1
AYVPN_ERR_IPC = -1
AYVPN_ERR_INPUT = -2
AYVPN_ERR_DAEMON = -3
AYVPN_ERR_RUNTIME = -4

# Tunnel states, the variants of Mullvad's TunnelState.
AYVPN_STATE_DISCONNECTED = 0
AYVPN_STATE_CONNECTING = 1
AYVPN_STATE_CONNECTED = 2
AYVPN_STATE_DISCONNECTING = 3
AYVPN_STATE_ERROR = 4

SIGNATURES = {
    "ayvpn_abi_version": (ctypes.c_uint32, []),
    "ayvpn_state": (ctypes.c_int32, [ctypes.POINTER(ctypes.c_uint32)]),
    "ayvpn_connect": (ctypes.c_int32, []),
    "ayvpn_disconnect": (ctypes.c_int32, []),
    "ayvpn_login": (ctypes.c_int32, [ctypes.POINTER(ctypes.c_uint8), ctypes.c_size_t]),
    "ayvpn_daemon_run": (ctypes.c_int32, []),
}


def bind(lib):
    """Sets restype and argtypes of every ayvpn-ffi library function on a loaded library."""
    for name, (restype, argtypes) in SIGNATURES.items():
        fn = getattr(lib, name)
        fn.restype = restype
        fn.argtypes = argtypes
    return lib
