use tauri::{AppHandle, Runtime};

/// The notch is approximately 10.5% of the screen width on all notched MacBook Pro models.
const NOTCH_WIDTH_FRACTION: f64 = 0.107;

pub struct IslandLayout {
    pub x: f64,
    pub y: f64,
    pub has_notch: bool,
    pub notch_width: f64,
    pub screen_width: f64,
}

/// Detect the primary monitor and calculate island positioning.
/// Uses NSScreen directly for reliable notch detection regardless of display scaling.
pub fn calculate_island_layout<R: Runtime>(_app: &AppHandle<R>, width: f64) -> IslandLayout {
    let (screen_width, menu_bar_height, has_notch) = get_screen_info();

    // Approximate notch width from screen width
    let notch_width = if has_notch {
        (screen_width * NOTCH_WIDTH_FRACTION).round()
    } else {
        0.0
    };

    let x = (screen_width - width) / 2.0;
    let y = 0.0;

    println!(
        "[island] Screen: {:.0}pt wide, menu_bar: {:.1}px, has_notch: {}, notch_width: {:.0}",
        screen_width, menu_bar_height, has_notch, notch_width
    );

    IslandLayout {
        x,
        y,
        has_notch,
        notch_width,
        screen_width,
    }
}

/// Use NSScreen to get the actual screen dimensions and menu bar height.
/// On notched MacBooks the menu bar is ~37pt (matches the notch height).
/// On non-notched Macs it's ~24-25pt.
/// This works regardless of the user's display scaling preferences.
#[cfg(target_os = "macos")]
fn get_screen_info() -> (f64, f64, bool) {
    use objc2::MainThreadMarker;
    use objc2_app_kit::NSScreen;

    // NSScreen.mainScreen is safe to read from any thread in practice.
    let mtm = unsafe { MainThreadMarker::new_unchecked() };
    let Some(screen) = NSScreen::mainScreen(mtm) else {
        return (1440.0, 24.0, false);
    };

    let frame = screen.frame();
    let visible = screen.visibleFrame();

    let screen_width = frame.size.width;
    // Menu bar height = full height minus the top of the visible area.
    // In NSScreen coordinates: origin is bottom-left, y increases upward.
    // visible.maxY = visible.origin.y + visible.size.height
    let menu_bar_height = frame.size.height - (visible.origin.y + visible.size.height);
    // Notched MacBooks have a 37pt menu bar; non-notched have ~24pt.
    let has_notch = menu_bar_height > 30.0;

    (screen_width, menu_bar_height, has_notch)
}

#[cfg(not(target_os = "macos"))]
fn get_screen_info() -> (f64, f64, bool) {
    (1440.0, 0.0, false)
}
