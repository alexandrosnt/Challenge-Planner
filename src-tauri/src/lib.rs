mod db;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_os::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      #[cfg(mobile)]
      app.handle().plugin(tauri_plugin_barcode_scanner::init())?;
      Ok(())
    })
    .manage(db::DbState::default())
    .invoke_handler(tauri::generate_handler![
      db::db_init,
      db::db_execute,
      db::db_batch,
      db::db_sync,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
