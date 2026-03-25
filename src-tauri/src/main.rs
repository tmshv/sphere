#![cfg_attr(all(not(debug_assertions), target_os = "windows"), windows_subsystem = "windows")]

mod commands;
mod state;

// use tokio::sync::mpsc;

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
        .invoke_handler(tauri::generate_handler![
            commands::system::greet,
            commands::source::mbtiles_get_tile,
            commands::source::mbtiles_get_metadata,
            commands::source::source_add,
            commands::source::source_get,
            commands::source::source_bounds,
            commands::source::source_get_schema,
            commands::source::source_query_page,
            commands::source::source_get_column_stats,
            commands::source::source_get_filtered,
            commands::source::source_query_rect,
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
