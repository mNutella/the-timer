mod island;
mod tray;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Set macOS activation policy.
/// 0 = Regular (shows in Dock + Cmd+Tab), 1 = Accessory (hidden from both).
#[cfg(target_os = "macos")]
pub(crate) fn set_activation_policy(accessory: bool) {
    unsafe {
        use objc2::runtime::AnyClass;
        let ns_app: *const objc2::runtime::AnyObject =
            objc2::msg_send![AnyClass::get(c"NSApplication").unwrap(), sharedApplication];
        let policy: i64 = if accessory { 1 } else { 0 };
        let _: () = objc2::msg_send![ns_app, setActivationPolicy: policy];
        if !accessory {
            let _: () = objc2::msg_send![ns_app, activateIgnoringOtherApps: true];
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_nspanel::init())
        .setup(|app| {
            tray::init(app.handle())?;
            Ok(())
        })
        .on_window_event(|window, event| {
            // Hide main window on close instead of destroying it.
            // Also hide from Dock/Cmd+Tab so it behaves like a tray-only app.
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    api.prevent_close();
                    let _ = window.hide();
                    #[cfg(target_os = "macos")]
                    set_activation_policy(true);
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            island::window::create_island,
            island::window::show_island,
            island::window::hide_island,
            island::window::toggle_island,
            island::window::resize_island,
            island::window::check_island_mouse,
            island::window::focus_island,
            island::window::unfocus_island,
            island::window::destroy_island,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
