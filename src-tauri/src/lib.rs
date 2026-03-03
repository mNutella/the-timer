#[cfg(target_os = "macos")]
mod island;
#[cfg(desktop)]
mod tray;

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
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::LogDir {
                        file_name: Some("the-timer".into()),
                    }),
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Webview),
                ])
                .max_file_size(5_000_000)
                .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepOne)
                .level(log::LevelFilter::Info)
                .build(),
        );

    #[cfg(target_os = "macos")]
    let builder = builder.plugin(tauri_nspanel::init());

    builder
        .setup(|_app| {
            #[cfg(desktop)]
            tray::init(_app.handle())?;

            // Show + focus main window when a deep link arrives (app may be in tray-only mode)
            #[cfg(desktop)]
            {
                use tauri::Manager;
                use tauri_plugin_deep_link::DeepLinkExt;

                let handle = _app.handle().clone();
                _app.deep_link().on_open_url(move |_event| {
                    if let Some(window) = handle.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                        #[cfg(target_os = "macos")]
                        set_activation_policy(false);
                    }
                });
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            // Hide main window on close instead of destroying it.
            // Also hide from Dock/Cmd+Tab so it behaves like a tray-only app.
            #[cfg(desktop)]
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    api.prevent_close();
                    let _ = window.hide();
                    #[cfg(target_os = "macos")]
                    set_activation_policy(true);
                }
            }
            // Suppress unused variable warnings on mobile
            #[cfg(mobile)]
            {
                let _ = (window, event);
            }
        })
        .invoke_handler({
            #[cfg(target_os = "macos")]
            {
                tauri::generate_handler![
                    island::window::create_island,
                    island::window::show_island,
                    island::window::hide_island,
                    island::window::toggle_island,
                    island::window::resize_island,
                    island::window::check_island_mouse,
                    island::window::focus_island,
                    island::window::unfocus_island,
                    island::window::destroy_island,
                ]
            }
            #[cfg(not(target_os = "macos"))]
            {
                tauri::generate_handler![]
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
