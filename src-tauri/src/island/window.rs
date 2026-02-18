use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};
#[allow(unused_imports)]
use tauri_nspanel::{Panel, TrackingAreaOptions};

use super::position::calculate_island_layout;

const ISLAND_LABEL: &str = "island";
const ISLAND_WIDTH: f64 = 620.0;

tauri_nspanel::tauri_panel! {
    panel!(IslandPanel {
        config: {
            can_become_key_window: false,
            is_floating_panel: true
        }
        with: {
            tracking_area: {
                options: TrackingAreaOptions::new()
                    .active_always()
                    .mouse_entered_and_exited()
                    .assume_inside()
                    .in_visible_rect(),
                auto_resize: true
            }
        }
    })

    panel_event!(IslandEventHandler {})
}

/// Create and show the island panel at the top-center of the screen.
fn do_create_island(app: &AppHandle) -> Result<(), String> {
    // Don't create if it already exists
    if tauri_nspanel::ManagerExt::get_webview_panel(app, ISLAND_LABEL).is_ok() {
        println!("[island] Panel already exists, skipping creation");
        return Ok(());
    }

    // Calculate initial compact dimensions so window doesn't start oversized
    let layout = calculate_island_layout(app, ISLAND_WIDTH);
    let initial_width = if layout.has_notch {
        layout.notch_width
    } else {
        140.0
    };
    let initial_height = if layout.has_notch { 55.0 } else { 32.0 };
    let initial_layout = calculate_island_layout(app, initial_width);

    println!(
        "[island] Creating island: x={}, y={}, has_notch={}, notch_width={}, screen_width={}",
        initial_layout.x, initial_layout.y, layout.has_notch, layout.notch_width, layout.screen_width
    );

    // Pass notch info to the frontend via query params
    let url = format!(
        "overlay.html?notch={}&notchWidth={}&windowWidth={}",
        layout.has_notch, layout.notch_width as u32, ISLAND_WIDTH as u32
    );

    // Create a regular webview window first
    let window = WebviewWindowBuilder::new(
        app,
        ISLAND_LABEL,
        WebviewUrl::App(url.into()),
    )
    .title("Island")
    .inner_size(initial_width, initial_height)
    .position(initial_layout.x, initial_layout.y)
    .decorations(false)
    .transparent(true)
    .shadow(false)
    .always_on_top(true)
    .visible(false)
    .focused(false)
    .skip_taskbar(true)
    .build()
    .map_err(|e| format!("Failed to create island window: {e}"))?;

    // Convert to NSPanel for non-focus-stealing behavior
    let panel = tauri_nspanel::WebviewWindowExt::to_panel::<IslandPanel>(&window)
        .map_err(|e| format!("Failed to convert to panel: {e}"))?;

    panel.set_floating_panel(true);
    panel.set_level(25); // Status window level (above other windows)
    panel.set_hides_on_deactivate(false);
    panel.set_accepts_mouse_moved_events(true);

    // Set up native mouse tracking → Tauri event bridge.
    // NSPanel with canBecomeKeyWindow:false won't fire DOM pointer events,
    // so we use NSTrackingArea callbacks to emit Tauri events instead.
    let handler = IslandEventHandler::new();

    let app_enter = app.clone();
    handler.on_mouse_entered(move |_event| {
        let _ = app_enter.emit("island-mouse-entered", ());
    });

    let app_exit = app.clone();
    handler.on_mouse_exited(move |_event| {
        let _ = app_exit.emit("island-mouse-exited", ());
    });

    panel.set_event_handler(Some(handler.as_ref()));

    panel.show();
    println!("[island] Panel created and shown successfully");

    Ok(())
}

#[tauri::command]
pub fn create_island(app: AppHandle) -> Result<(), String> {
    do_create_island(&app)
}

#[tauri::command]
pub fn show_island(app: AppHandle) -> Result<(), String> {
    let panel = tauri_nspanel::ManagerExt::get_webview_panel(&app, ISLAND_LABEL)
        .map_err(|_| "Island panel not found".to_string())?;
    panel.show();
    Ok(())
}

#[tauri::command]
pub fn hide_island(app: AppHandle) -> Result<(), String> {
    let panel = tauri_nspanel::ManagerExt::get_webview_panel(&app, ISLAND_LABEL)
        .map_err(|_| "Island panel not found".to_string())?;
    panel.hide();
    Ok(())
}

#[tauri::command]
pub fn toggle_island(app: AppHandle) -> Result<(), String> {
    let panel = tauri_nspanel::ManagerExt::get_webview_panel(&app, ISLAND_LABEL)
        .map_err(|_| "Island panel not found".to_string())?;
    if panel.is_visible() {
        panel.hide();
    } else {
        panel.show();
    }
    Ok(())
}

#[tauri::command]
pub fn resize_island(app: AppHandle, width: f64, height: f64) -> Result<(), String> {
    let panel = tauri_nspanel::ManagerExt::get_webview_panel(&app, ISLAND_LABEL)
        .map_err(|_| "Island panel not found".to_string())?;

    let layout = calculate_island_layout(&app, width);
    let x = layout.x;
    let y = layout.y;

    // NSPanel frame: origin is bottom-left in screen coords.
    // We need to convert our top-left (x, y=0) to bottom-left origin.
    use objc2_foundation::NSRect;
    use objc2_foundation::NSPoint;
    use objc2_foundation::NSSize;

    let screen_frame = {
        use objc2::MainThreadMarker;
        use objc2_app_kit::NSScreen;
        let mtm = unsafe { MainThreadMarker::new_unchecked() };
        NSScreen::mainScreen(mtm)
            .map(|s| s.frame())
            .unwrap_or(NSRect::new(NSPoint::new(0.0, 0.0), NSSize::new(1440.0, 900.0)))
    };

    let ns_y = screen_frame.size.height - y - height;
    let frame = NSRect::new(NSPoint::new(x, ns_y), NSSize::new(width, height));

    unsafe {
        use objc2_app_kit::NSWindow;
        let ns_panel = panel.as_panel();
        NSWindow::setFrame_display_animate(ns_panel, frame, true, false);
    }

    Ok(())
}

/// Check if the mouse cursor is currently inside the island panel.
/// Used by the frontend to verify deferred mouse-exit events are real
/// (the tracking area rebuild during resize can fire spurious exits).
#[tauri::command]
pub fn check_island_mouse(app: AppHandle) -> Result<bool, String> {
    let panel = tauri_nspanel::ManagerExt::get_webview_panel(&app, ISLAND_LABEL)
        .map_err(|_| "Island panel not found".to_string())?;

    unsafe {
        use objc2::runtime::AnyClass;
        use objc2_app_kit::NSWindow;
        use objc2_foundation::NSPoint;

        // Mouse location in screen coordinates (class method on NSEvent)
        let mouse_loc: NSPoint =
            objc2::msg_send![AnyClass::get(c"NSEvent").unwrap(), mouseLocation];

        // Panel frame in screen coordinates
        let frame = NSWindow::frame(panel.as_panel());

        let inside = mouse_loc.x >= frame.origin.x
            && mouse_loc.x <= frame.origin.x + frame.size.width
            && mouse_loc.y >= frame.origin.y
            && mouse_loc.y <= frame.origin.y + frame.size.height;

        Ok(inside)
    }
}

#[tauri::command]
pub fn destroy_island(app: AppHandle) -> Result<(), String> {
    let panel = tauri_nspanel::ManagerExt::get_webview_panel(&app, ISLAND_LABEL)
        .map_err(|_| "Island panel not found".to_string())?;
    panel.set_released_when_closed(true);
    panel.hide();
    Ok(())
}
