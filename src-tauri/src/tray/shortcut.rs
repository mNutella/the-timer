use tauri::{AppHandle, Emitter};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

/// Register Cmd+Shift+T as a global hotkey to toggle the timer.
/// Falls back gracefully if the shortcut is already taken by another app.
pub fn register(app: &AppHandle) {
    let shortcut: Shortcut = "CommandOrControl+Shift+T"
        .parse()
        .expect("Failed to parse shortcut");

    let app_handle = app.clone();
    let result = app.global_shortcut().on_shortcut(shortcut, move |_app, _shortcut, event| {
        if event.state == ShortcutState::Pressed {
            println!("[tray] Global shortcut Cmd+Shift+T pressed");
            let _ = app_handle.emit("tray-toggle-timer", ());
        }
    });

    match result {
        Ok(()) => println!("[tray] Registered global shortcut: Cmd+Shift+T"),
        Err(e) => eprintln!("[tray] Failed to register global shortcut: {e}"),
    }
}
