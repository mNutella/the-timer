use serde::Deserialize;
use std::sync::{Arc, Mutex};

/// Payload received from the frontend `tray-timer-state` event.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimerPayload {
    pub running: bool,
    pub start_time: Option<f64>,
    pub entry_id: Option<String>,
    pub name: Option<String>,
    pub project_name: Option<String>,
    pub client_name: Option<String>,
}

/// Internal timer state held across tray updates.
#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct TimerState {
    pub running: bool,
    pub start_time: Option<f64>,
    pub entry_id: Option<String>,
    pub name: Option<String>,
    pub project_name: Option<String>,
    pub client_name: Option<String>,
}

impl Default for TimerState {
    fn default() -> Self {
        Self {
            running: false,
            start_time: None,
            entry_id: None,
            name: None,
            project_name: None,
            client_name: None,
        }
    }
}

impl TimerState {
    pub fn from_payload(p: &TimerPayload) -> Self {
        Self {
            running: p.running,
            start_time: p.start_time,
            entry_id: p.entry_id.clone(),
            name: p.name.clone(),
            project_name: p.project_name.clone(),
            client_name: p.client_name.clone(),
        }
    }

    /// Human-readable elapsed string like "01:23:45".
    pub fn elapsed_string(&self) -> String {
        let Some(start) = self.start_time else {
            return "00:00:00".to_string();
        };
        let now_ms = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as f64;
        let elapsed_secs = ((now_ms - start) / 1000.0).max(0.0) as u64;
        let h = elapsed_secs / 3600;
        let m = (elapsed_secs % 3600) / 60;
        let s = elapsed_secs % 60;
        format!("{h:02}:{m:02}:{s:02}")
    }

    /// Status text shown at the top of the tray menu.
    pub fn status_text(&self) -> String {
        if !self.running {
            return "No timer running".to_string();
        }
        let elapsed = self.elapsed_string();
        let label = self.display_label();
        if label.is_empty() {
            elapsed
        } else {
            format!("{elapsed} - {label}")
        }
    }

    /// Short label for the tray title (next to the icon in the menu bar).
    pub fn tray_title(&self) -> String {
        if self.running {
            self.elapsed_string()
        } else {
            String::new()
        }
    }

    fn display_label(&self) -> String {
        let parts: Vec<&str> = [
            self.name.as_deref(),
            self.project_name.as_deref(),
            self.client_name.as_deref(),
        ]
        .into_iter()
        .flatten()
        .filter(|s| !s.is_empty())
        .collect();
        parts.join(" - ")
    }
}

/// Recent entry shown in the tray menu for quick-start.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub struct RecentEntry {
    pub project_id: Option<String>,
    pub project_name: Option<String>,
    pub client_id: Option<String>,
    pub client_name: Option<String>,
    pub category_id: Option<String>,
    pub last_entry_name: Option<String>,
}

pub type SharedTimerState = Arc<Mutex<TimerState>>;
pub type SharedRecentEntries = Arc<Mutex<Vec<RecentEntry>>>;
