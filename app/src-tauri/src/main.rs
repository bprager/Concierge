#[tauri::command]
fn app_status() -> &'static str {
    "Concierge desktop shell running"
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![app_status])
        .run(tauri::generate_context!())
        .expect("error while running Concierge");
}
