use crate::menu;
use tauri::AppHandle;

/// Tells the native menu what the frontend store holds, so items that need a
/// selected source, layer, or feature can be greyed out when there is none.
#[tauri::command]
pub async fn menu_set_context(app: AppHandle, context: menu::Context) -> Result<(), String> {
    menu::set_context(&app, context).map_err(|err| err.to_string())
}
