#![cfg_attr(all(not(debug_assertions), target_os = "windows"), windows_subsystem = "windows")]

mod commands;
mod id;
mod selection;
mod state;

// use tokio::sync::mpsc;

use crate::selection::SelectionStorage;
use crate::state::SourceStorage;

#[tokio::main]
async fn main() {
    tauri::async_runtime::set(tokio::runtime::Handle::current());

    // let (async_proc_input_tx, async_proc_input_rx) = mpsc::channel(1);
    // let (async_proc_output_tx, mut async_proc_output_rx) = mpsc::channel(1);

    // tokio::spawn(async move {
    //     async_process(
    //         async_process_input_rx,
    //         async_process_output_tx,
    //     ).await
    // });

    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(SourceStorage {
            store: Default::default(),
        })
        .manage(SelectionStorage::default())
        .invoke_handler(tauri::generate_handler![
            commands::source::mbtiles_get_tile,
            commands::source::mbtiles_get_metadata,
            commands::source::source_add,
            commands::source::source_get,
            commands::source::source_get_slice,
            commands::source::source_get_selected,
            commands::source::source_bounds,
            commands::source::source_get_schema,
            commands::source::source_query_page,
            commands::source::source_get_column_stats,
            commands::source::source_get_filtered,
            commands::source::source_query_rect,
            commands::source::source_add_data,
            commands::source::source_replace,
            commands::source::source_patch,
            commands::selection::selection_set,
            commands::selection::selection_preview,
            commands::selection::selection_add,
            commands::selection::selection_remove,
            commands::selection::selection_apply,
            commands::selection::selection_clear,
            commands::selection::selection_count,
            commands::selection::selection_get_ids,
            commands::selection::selection_query_page,
            commands::selection::selection_rect,
            commands::selection::selection_rect_features,
            commands::selection::selection_cache_features,
            commands::selection::selection_copy_geojson,
            commands::selection::selection_copy_wkt,
        ])
        // .setup(|app| {
        //     let app_handle = app.handle();
        //     tauri::async_runtime::spawn(async move {
        //         // A loop that takes output from the async process and sends it
        //         // to the webview via a Tauri Event
        //         loop {
        //             if let Some(output) = async_proc_output_rx.recv().await {
        //                 // rs2js(output, &app_handle);
        //             }
        //         }
        //     });
        //
        //     Ok(())
        // })
        .run(tauri::generate_context!())
        .expect("Error while running Application");
}
