pub mod menu;
pub mod shortcut;
pub mod state;

use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

use tauri::image::Image;
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Listener, Manager};

use state::{RecentEntry, SharedRecentEntries, SharedTimerState, TimerPayload, TimerState};

/// Initialize the system tray icon, event listeners, and tick thread.
pub fn init(app: &AppHandle) -> tauri::Result<()> {
    let timer_state: SharedTimerState = Arc::new(Mutex::new(TimerState::default()));
    let recent_entries: SharedRecentEntries = Arc::new(Mutex::new(Vec::new()));

    // Use existing 32x32 icon as placeholder.
    // macOS template images auto-invert for dark/light mode.
    let icon = Image::from_bytes(include_bytes!("../../icons/32x32.png"))
        .expect("Failed to load tray icon");

    // Build tray icon
    let initial_menu =
        menu::build_tray_menu(app, &TimerState::default(), &[])?;
    let tray = TrayIconBuilder::new()
        .icon(icon)
        .icon_as_template(true)
        .tooltip("Timer - Idle")
        .menu(&initial_menu)
        .on_menu_event(menu::handle_menu_event)
        .build(app)?;

    // Store tray ID for later access
    let tray_id = tray.id().clone();

    // Listen for timer state updates from frontend
    {
        let timer_state = Arc::clone(&timer_state);
        let recent_entries = Arc::clone(&recent_entries);
        let app_handle = app.clone();
        let tray_id = tray_id.clone();
        app.listen("tray-timer-state", move |event| {
            if let Ok(payload) = serde_json::from_str::<TimerPayload>(event.payload()) {
                let new_state = TimerState::from_payload(&payload);
                let tooltip = if new_state.running {
                    format!("Timer - {}", new_state.status_text())
                } else {
                    "Timer - Idle".to_string()
                };

                // Update tray title (shown next to icon in menu bar)
                if let Some(tray) = app_handle.tray_by_id(&tray_id) {
                    let _ = tray.set_title(Some(&new_state.tray_title()));
                    let _ = tray.set_tooltip(Some(&tooltip));

                    // Rebuild menu with new state
                    let recents = recent_entries.lock().unwrap().clone();
                    if let Ok(new_menu) =
                        menu::build_tray_menu(&app_handle, &new_state, &recents)
                    {
                        let _ = tray.set_menu(Some(new_menu));
                    }
                }

                *timer_state.lock().unwrap() = new_state;
            }
        });
    }

    // Listen for recent entries updates from frontend
    {
        let timer_state = Arc::clone(&timer_state);
        let recent_entries = Arc::clone(&recent_entries);
        let app_handle = app.clone();
        let tray_id = tray_id.clone();
        app.listen("tray-recent-entries", move |event| {
            if let Ok(entries) = serde_json::from_str::<Vec<RecentEntry>>(event.payload()) {
                let state = timer_state.lock().unwrap().clone();

                // Rebuild menu with new recents
                if let Some(tray) = app_handle.tray_by_id(&tray_id) {
                    if let Ok(new_menu) =
                        menu::build_tray_menu(&app_handle, &state, &entries)
                    {
                        let _ = tray.set_menu(Some(new_menu));
                    }
                }

                *recent_entries.lock().unwrap() = entries;
            }
        });
    }

    // Show + focus main window when requested from tray menu.
    // Restores Dock/Cmd+Tab visibility via activation policy.
    {
        let app_handle = app.clone();
        app.listen("tray-show-window", move |_event| {
            #[cfg(target_os = "macos")]
            crate::set_activation_policy(false);
            if let Some(window) = app_handle.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        });
    }

    // 1-second tick thread to update tray title with elapsed time
    {
        let timer_state = Arc::clone(&timer_state);
        let app_handle = app.clone();
        thread::spawn(move || loop {
            thread::sleep(Duration::from_secs(1));
            let state = timer_state.lock().unwrap().clone();
            if state.running {
                if let Some(tray) = app_handle.tray_by_id(&tray_id) {
                    let _ = tray.set_title(Some(&state.tray_title()));
                }
            }
        });
    }

    // Register global shortcut
    shortcut::register(app);

    println!("[tray] System tray initialized");

    Ok(())
}
