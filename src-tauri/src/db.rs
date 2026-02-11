use libsql::{Builder, Database, Connection, Value};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::{AppHandle, Manager, State};
use tokio::sync::Mutex;

pub struct DbState {
    pub conn: Arc<Mutex<Option<Connection>>>,
    pub db: Arc<Mutex<Option<Database>>>,
}

impl Default for DbState {
    fn default() -> Self {
        Self {
            conn: Arc::new(Mutex::new(None)),
            db: Arc::new(Mutex::new(None)),
        }
    }
}

#[derive(Serialize)]
pub struct QueryResult {
    pub columns: Vec<String>,
    pub rows: Vec<Vec<serde_json::Value>>,
    pub rows_affected: u64,
    pub last_insert_rowid: i64,
}

#[derive(Deserialize)]
pub struct BatchStatement {
    pub sql: String,
    pub args: Option<Vec<serde_json::Value>>,
}

fn json_to_libsql_value(v: &serde_json::Value) -> Value {
    match v {
        serde_json::Value::Null => Value::Null,
        serde_json::Value::Bool(b) => Value::Integer(if *b { 1 } else { 0 }),
        serde_json::Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                Value::Integer(i)
            } else if let Some(f) = n.as_f64() {
                Value::Real(f)
            } else {
                Value::Null
            }
        }
        serde_json::Value::String(s) => Value::Text(s.clone()),
        _ => Value::Text(v.to_string()),
    }
}

fn libsql_value_to_json(v: Value) -> serde_json::Value {
    match v {
        Value::Null => serde_json::Value::Null,
        Value::Integer(i) => serde_json::json!(i),
        Value::Real(f) => serde_json::json!(f),
        Value::Text(s) => serde_json::json!(s),
        Value::Blob(b) => serde_json::json!(b),
    }
}

async fn execute_stmt(
    conn: &Connection,
    sql: &str,
    args: &[serde_json::Value],
) -> Result<QueryResult, String> {
    let params: Vec<Value> = args.iter().map(json_to_libsql_value).collect();

    let mut rows_result = conn
        .query(sql, libsql::params::Params::Positional(params))
        .await
        .map_err(|e| e.to_string())?;

    let col_count = rows_result.column_count() as usize;
    let columns: Vec<String> = (0..col_count)
        .map(|i| {
            rows_result
                .column_name(i as i32)
                .unwrap_or("?")
                .to_string()
        })
        .collect();

    let mut rows: Vec<Vec<serde_json::Value>> = Vec::new();
    while let Some(row) = rows_result.next().await.map_err(|e| e.to_string())? {
        let mut vals = Vec::with_capacity(col_count);
        for i in 0..col_count {
            let v = row.get_value(i as i32).map_err(|e| e.to_string())?;
            vals.push(libsql_value_to_json(v));
        }
        rows.push(vals);
    }

    Ok(QueryResult {
        columns,
        rows,
        rows_affected: conn.changes(),
        last_insert_rowid: conn.last_insert_rowid(),
    })
}

#[tauri::command]
pub async fn db_init(
    url: Option<String>,
    auth_token: Option<String>,
    app: AppHandle,
    state: State<'_, DbState>,
) -> Result<(), String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    let db_path = data_dir.join("local.db");
    let path_str = db_path.to_string_lossy().to_string();
    let is_remote = matches!(
        (url.as_deref(), auth_token.as_deref()),
        (Some(u), Some(t)) if !u.is_empty() && !t.is_empty()
    );

    // Try remote replica first; if it fails (no internet, stale state, etc.)
    // fall back to local-only so the app always works offline.
    let db = if is_remote {
        match Builder::new_remote_replica(
            &path_str,
            url.clone().unwrap(),
            auth_token.clone().unwrap(),
        )
        .build()
        .await
        {
            Ok(db) => db,
            Err(e) => {
                let err_msg = e.to_string();
                log::warn!("Remote replica failed, falling back to local: {}", err_msg);

                // If stale metadata, wipe files first
                if err_msg.contains("metadata") {
                    for suffix in &["", "-client_wal_index", "-shm", "-wal", "-metadata"] {
                        let mut p = db_path.clone().into_os_string();
                        p.push(suffix);
                        let _ = std::fs::remove_file(&p);
                    }
                }

                Builder::new_local(&path_str)
                    .build()
                    .await
                    .map_err(|e| e.to_string())?
            }
        }
    } else {
        Builder::new_local(&path_str)
            .build()
            .await
            .map_err(|e| e.to_string())?
    };

    let conn = db.connect().map_err(|e| e.to_string())?;

    // If remote replica, try initial sync (non-fatal if offline)
    if is_remote {
        if let Err(e) = db.sync().await {
            log::warn!("Initial sync failed (will work offline): {}", e);
        }
    }

    *state.conn.lock().await = Some(conn);
    *state.db.lock().await = Some(db);

    Ok(())
}

#[tauri::command]
pub async fn db_execute(
    sql: String,
    args: Option<Vec<serde_json::Value>>,
    state: State<'_, DbState>,
) -> Result<QueryResult, String> {
    let conn_guard = state.conn.lock().await;
    let conn = conn_guard
        .as_ref()
        .ok_or("Database not initialized. Call db_init first.")?;

    execute_stmt(conn, &sql, &args.unwrap_or_default()).await
}

#[tauri::command]
pub async fn db_batch(
    statements: Vec<BatchStatement>,
    state: State<'_, DbState>,
) -> Result<Vec<QueryResult>, String> {
    let conn_guard = state.conn.lock().await;
    let conn = conn_guard
        .as_ref()
        .ok_or("Database not initialized. Call db_init first.")?;

    let mut results = Vec::with_capacity(statements.len());
    for stmt in &statements {
        let args = stmt.args.as_deref().unwrap_or(&[]);
        let result = execute_stmt(conn, &stmt.sql, args).await?;
        results.push(result);
    }

    Ok(results)
}

#[tauri::command]
pub async fn db_sync(state: State<'_, DbState>) -> Result<u64, String> {
    let db_guard = state.db.lock().await;
    let db = db_guard
        .as_ref()
        .ok_or("Database not initialized. Call db_init first.")?;

    let rep = db.sync().await.map_err(|e| e.to_string())?;
    Ok(rep.frames_synced() as u64)
}
