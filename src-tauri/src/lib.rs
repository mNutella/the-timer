mod island;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_nspanel::init())
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
