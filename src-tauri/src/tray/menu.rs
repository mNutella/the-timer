use tauri::menu::{Menu, MenuBuilder, MenuItemBuilder, PredefinedMenuItem};
use tauri::{AppHandle, Emitter, Wry};

use super::state::{RecentEntry, TimerState};

const MAX_RECENT: usize = 5;

pub fn build_tray_menu(
    app: &AppHandle,
    timer_state: &TimerState,
    recent_entries: &[RecentEntry],
) -> tauri::Result<Menu<Wry>> {
    let mut builder = MenuBuilder::new(app);

    // Status line (disabled)
    let status = MenuItemBuilder::new(timer_state.status_text())
        .enabled(false)
        .build(app)?;
    builder = builder.item(&status);

    builder = builder.separator();

    // Toggle timer action
    let toggle_label = if timer_state.running {
        "Stop Timer"
    } else {
        "Start New Timer"
    };
    let toggle = MenuItemBuilder::with_id("toggle-timer", toggle_label).build(app)?;
    builder = builder.item(&toggle);

    // Recent entries section
    if !recent_entries.is_empty() {
        builder = builder.separator();

        let recent_header = MenuItemBuilder::new("Recent").enabled(false).build(app)?;
        builder = builder.item(&recent_header);

        for (i, entry) in recent_entries.iter().take(MAX_RECENT).enumerate() {
            let label = format_recent_label(entry);
            let item = MenuItemBuilder::with_id(format!("recent-{i}"), label).build(app)?;
            builder = builder.item(&item);
        }
    }

    builder = builder.separator();

    let show = MenuItemBuilder::with_id("show-window", "Show Window").build(app)?;
    builder = builder.item(&show);

    builder = builder.separator();

    let quit = PredefinedMenuItem::quit(app, Some("Quit"))?;
    builder = builder.item(&quit);

    builder.build()
}

fn format_recent_label(entry: &RecentEntry) -> String {
    let project = entry.project_name.as_deref().unwrap_or("Untitled Project");
    match entry.client_name.as_deref() {
        Some(client) if !client.is_empty() => format!("{project} ({client})"),
        _ => project.to_string(),
    }
}

/// Handle menu item clicks by emitting Tauri events back to the frontend.
pub fn handle_menu_event(app: &AppHandle, event: tauri::menu::MenuEvent) {
    let id = event.id().0.as_str();
    match id {
        "toggle-timer" => {
            let _ = app.emit("tray-toggle-timer", ());
        }
        "show-window" => {
            let _ = app.emit("tray-show-window", ());
        }
        _ if id.starts_with("recent-") => {
            if let Ok(index) = id.trim_start_matches("recent-").parse::<usize>() {
                let _ = app.emit("tray-start-recent", index);
            }
        }
        _ => {}
    }
}
