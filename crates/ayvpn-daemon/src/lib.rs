//! The Aphrody VPN daemon and its client.
//!
//! The daemon is Mullvad's `mullvad-daemon`, built with its `embedded` feature so that the host
//! process keeps its own logger and release lifecycle. The client speaks the daemon's own
//! management IPC; this crate defines no protocol of its own.

#[cfg(not(target_os = "android"))]
pub mod cli;

use std::path::PathBuf;

pub use mullvad_management_interface::Error;
pub use mullvad_types::states::TunnelState;

/// A started daemon; [`run`] drives it until it is told to stop.
pub type Daemon = mullvad_daemon::Daemon;

/// Mullvad keeps its settings and cache in system directories that only an elevated session can
/// create. Any other session gets per-user directories under the shared Aphrody state directory.
/// `MULLVAD_SETTINGS_DIR` and `MULLVAD_CACHE_DIR` still win when they are set.
fn user_dir(kind: &str) -> Result<PathBuf, String> {
    let base = if cfg!(windows) {
        std::env::var_os("LOCALAPPDATA").map(|dir| PathBuf::from(dir).join("Aphrody"))
    } else {
        std::env::var_os("XDG_STATE_HOME")
            .map(PathBuf::from)
            .or_else(|| std::env::var_os("HOME").map(|home| PathBuf::from(home).join(".local/state")))
            .map(|dir| dir.join("aphrody"))
    }
    .ok_or("no per-user state directory (LOCALAPPDATA or HOME is unset)")?;
    let dir = base.join("vpn").join(kind);
    std::fs::create_dir_all(&dir).map_err(|error| format!("{}: {error}", dir.display()))?;
    Ok(dir)
}

/// Starts the daemon in this process with Mullvad's platform paths and endpoint settings.
pub async fn start() -> Result<Daemon, String> {
    let settings_dir = mullvad_paths::settings_dir()
        .or_else(|_| user_dir("settings"))
        .map_err(|error| error.to_string())?;
    let cache_dir = mullvad_paths::cache_dir()
        .or_else(|_| user_dir("cache"))
        .map_err(|error| error.to_string())?;
    let log_handle = mullvad_daemon::logging::detached_log_handle().map_err(|error| error.to_string())?;
    let config = mullvad_daemon::DaemonConfig {
        log_dir: None,
        resource_dir: mullvad_paths::get_resource_dir(),
        settings_dir,
        cache_dir,
        rpc_socket_path: mullvad_paths::get_rpc_socket_path(),
        endpoint: mullvad_api::ApiEndpoint::from_env_vars(),
        log_handle,
    };
    mullvad_daemon::Daemon::start(config, mullvad_daemon::DaemonCommandChannel::new())
        .await
        .map_err(|error| error.to_string())
}

/// Starts the daemon and runs it until it stops.
pub async fn run() -> Result<(), String> {
    start().await?.run().await.map_err(|error| error.to_string())
}

/// A connection to a running daemon's management IPC.
#[cfg(not(target_os = "android"))]
pub struct Client(mullvad_management_interface::client::MullvadProxyClient);

#[cfg(not(target_os = "android"))]
impl Client {
    /// Connects to the platform's management endpoint.
    pub async fn connect() -> Result<Self, Error> {
        mullvad_management_interface::client::MullvadProxyClient::new().await.map(Self)
    }

    /// The tunnel state the daemon reports.
    pub async fn state(&mut self) -> Result<TunnelState, Error> {
        self.0.get_tunnel_state().await
    }

    /// Logs in with an account number; the number never appears in an error or a log line.
    pub async fn login(&mut self, account: String) -> Result<(), Error> {
        self.0.login_account(account).await
    }

    /// Asks the daemon to connect with its current settings; `true` when the state changed.
    pub async fn connect_tunnel(&mut self) -> Result<bool, Error> {
        self.0.connect_tunnel().await
    }

    /// Asks the daemon to disconnect; `true` when the state changed.
    pub async fn disconnect_tunnel(&mut self) -> Result<bool, Error> {
        self.0.disconnect_tunnel("ayvpn").await
    }
}
