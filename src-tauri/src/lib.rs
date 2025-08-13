use std::path::PathBuf;

use anyhow::{anyhow, Context, Result};
use rand::RngCore;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use chrono::{Datelike, NaiveDate};
use tauri::{path::BaseDirectory, Manager};

#[tauri::command]
fn register_user(app: tauri::AppHandle, email: String, password: String) -> Result<(), String> {
  (|| -> Result<()> {
    let db = get_db_path(&app)?;
    let conn = open_and_migrate(&db)?;
    let normalized_email = email.trim().to_lowercase();
    let password_hash = hash_password(&password)?;
    conn.execute(
      "INSERT INTO users (email, password_hash, created_at) VALUES (?1, ?2, strftime('%s','now'))",
      params![normalized_email, password_hash],
    )
    .context("failed to insert user")?;
    Ok(())
  })()
  .map_err(|e| e.to_string())
}

#[tauri::command]
fn login_user(app: tauri::AppHandle, email: String, password: String) -> Result<bool, String> {
  (|| -> Result<bool> {
    let db = get_db_path(&app)?;
    let conn = open_and_migrate(&db)?;
    let normalized_email = email.trim().to_lowercase();
    let mut stmt = conn.prepare("SELECT password_hash FROM users WHERE email = ?1")?;
    let row = stmt.query_row([normalized_email], |row| row.get::<_, String>(0));
    let password_hash: String = match row {
      Ok(h) => h,
      Err(rusqlite::Error::QueryReturnedNoRows) => return Ok(false),
      Err(e) => return Err(anyhow!(e)),
    };
    Ok(verify_password(&password, &password_hash)?)
  })()
  .map_err(|e| e.to_string())
}

fn get_db_path(app: &tauri::AppHandle) -> Result<PathBuf> {
  let dir = app
    .path()
    .resolve("db", BaseDirectory::AppLocalData)
    .context("resolve app data dir failed")?;
  std::fs::create_dir_all(&dir).ok();
  Ok(dir.join("timekeeper.sqlite"))
}

fn open_and_migrate(path: &PathBuf) -> Result<Connection> {
  let conn = Connection::open(path).context("open sqlite failed")?;
  conn.execute_batch(
    r#"
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS project_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      allotted_hours REAL NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS project_month_allotments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_code_id INTEGER NOT NULL REFERENCES project_codes(id) ON DELETE CASCADE,
      month TEXT NOT NULL,
      allotted_hours REAL NOT NULL DEFAULT 0,
      UNIQUE(project_code_id, month)
    );
    CREATE TABLE IF NOT EXISTS time_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_code_id INTEGER NOT NULL REFERENCES project_codes(id) ON DELETE CASCADE,
      entry_date TEXT NOT NULL,
      hours REAL NOT NULL,
      UNIQUE(project_code_id, entry_date)
    );
  "#,
  )?;
  Ok(conn)
}

fn hash_password(password: &str) -> Result<String> {
  use argon2::{password_hash::SaltString, Argon2, PasswordHasher};
  let mut salt_bytes = [0u8; 16];
  rand::thread_rng().fill_bytes(&mut salt_bytes);
  let salt = SaltString::encode_b64(&salt_bytes).map_err(|e| anyhow!(e))?;
  let argon2 = Argon2::default();
  let hash = argon2
    .hash_password(password.as_bytes(), &salt)
    .map_err(|e| anyhow!(e))?;
  Ok(hash.to_string())
}

fn verify_password(password: &str, hash: &str) -> Result<bool> {
  use argon2::{password_hash::PasswordHash, Argon2, PasswordVerifier};
  let parsed = PasswordHash::new(hash).map_err(|e| anyhow!(e))?;
  let argon2 = Argon2::default();
  Ok(argon2.verify_password(password.as_bytes(), &parsed).is_ok())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app
          .handle()
          .plugin(tauri_plugin_log::Builder::default().level(log::LevelFilter::Info).build())?;
      }
      // Persist and restore window size/position/state
      app
        .handle()
        .plugin(tauri_plugin_window_state::Builder::default().build())?;
      // ensure DB created
      let _ = get_db_path(&app.handle());
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![register_user, login_user, get_weeks, set_day_hours])
    .invoke_handler(tauri::generate_handler![register_user, login_user, get_weeks, set_day_hours, list_projects, add_project, update_project, delete_project, set_project_month_allotment, list_project_allotments])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WeekRowDto {
  pub project_code_id: i64,
  pub project_code: String,
  pub allotted: f64,
  pub days: std::collections::HashMap<String, f64>,
  pub total: f64,
  pub remaining: f64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WeekSliceDto {
  pub week_index: i32,
  pub start_date: String,
  pub end_date: String,
  pub rows: Vec<WeekRowDto>,
}

#[tauri::command]
fn get_weeks(app: tauri::AppHandle, month: String) -> Result<Vec<WeekSliceDto>, String> {
  (|| -> Result<Vec<WeekSliceDto>> {
    let db = get_db_path(&app)?;
    let conn = open_and_migrate(&db)?;
    ensure_sample_projects(&conn)?;

    let first = NaiveDate::parse_from_str(&format!("{month}-01"), "%Y-%m-%d")
      .context("invalid month")?;
    let month_end = {
      let next_month = if first.month() == 12 {
        NaiveDate::from_ymd_opt(first.year() + 1, 1, 1).unwrap()
      } else {
        NaiveDate::from_ymd_opt(first.year(), first.month() + 1, 1).unwrap()
      };
      next_month.pred_opt().unwrap()
    };

    // Compute week ranges (Sun-Sat) covering the month
    let base_week_start = {
      let wd = first.weekday().num_days_from_sunday() as i64;
      first - chrono::Duration::days(wd)
    };
    let mut weeks: Vec<(NaiveDate, NaiveDate, i32)> = Vec::new();
    let mut week_start = base_week_start;
    let mut index = 1i32;
    while week_start <= month_end {
      let week_end = week_start + chrono::Duration::days(6);
      weeks.push((week_start, week_end, index));
      week_start = week_start + chrono::Duration::days(7);
      index += 1;
    }

    // Load projects with month allotment
    let mut rows_stmt = conn.prepare(
      "SELECT p.id, p.code, COALESCE(a.allotted_hours, 0)
       FROM project_codes p
       LEFT JOIN project_month_allotments a ON a.project_code_id = p.id AND a.month = ?1
       ORDER BY p.code",
    )?;
    let projects = rows_stmt
      .query_map([month.as_str()], |r| Ok((r.get::<_, i64>(0)?, r.get::<_, String>(1)?, r.get::<_, f64>(2)?)))?
      .collect::<std::result::Result<Vec<_>, _>>()?;

    // Load entries for the month into map
    let mut te_stmt = conn.prepare(
      "SELECT project_code_id, entry_date, hours FROM time_entries WHERE entry_date LIKE ?1",
    )?;
    let like = format!("{month}-%");
    use std::collections::HashMap;
    let mut by_key: HashMap<(i64, String), f64> = HashMap::new();
    let mut te_rows = te_stmt.query([like])?;
    while let Some(row) = te_rows.next()? {
      let pid: i64 = row.get(0)?;
      let date: String = row.get(1)?;
      let hours: f64 = row.get(2)?;
      by_key.insert((pid, date), hours);
    }

    let mut out: Vec<WeekSliceDto> = Vec::new();
    // Track cumulative totals per project across weeks for continuous subtraction
    let mut cumulative_by_project: HashMap<i64, f64> = HashMap::new();
    for (week_start, week_end, idx) in weeks {
      let mut rows: Vec<WeekRowDto> = Vec::new();
      for (pid, code, allotted) in &projects {
        let mut days = HashMap::new();
        // Total only counts days within the selected month
        let mut total_in_month = 0.0;
        for offset in 0..7 {
          let d = week_start + chrono::Duration::days(offset);
          let ds = d.format("%Y-%m-%d").to_string();
          let v = *by_key.get(&(*pid, ds.clone())).unwrap_or(&0.0);
          if ds.starts_with(&month) {
            days.insert(ds.clone(), v);
            total_in_month += v;
          }
        }
        let cum = cumulative_by_project.entry(*pid).or_insert(0.0);
        let start_balance = allotted - *cum; // carry from prior weeks
        let remaining = start_balance - total_in_month; // continuous subtraction
        *cum += total_in_month; // update after computing this week
        rows.push(WeekRowDto {
          project_code_id: *pid,
          project_code: code.clone(),
          allotted: start_balance,
          days,
          total: total_in_month,
          remaining,
        });
      }
      out.push(WeekSliceDto {
        week_index: idx,
        start_date: week_start.format("%Y-%m-%d").to_string(),
        end_date: week_end.format("%Y-%m-%d").to_string(),
        rows,
      });
    }
    Ok(out)
  })()
  .map_err(|e| e.to_string())
}

#[tauri::command]
fn set_day_hours(app: tauri::AppHandle, project_code_id: i64, date: String, hours: f64) -> Result<(), String> {
  (|| -> Result<()> {
    let db = get_db_path(&app)?;
    let conn = open_and_migrate(&db)?;
    conn.execute(
      "INSERT INTO time_entries (project_code_id, entry_date, hours) VALUES (?1, ?2, ?3)
        ON CONFLICT(project_code_id, entry_date) DO UPDATE SET hours=excluded.hours",
      params![project_code_id, date, hours],
    )?;
    Ok(())
  })()
  .map_err(|e| e.to_string())
}

fn ensure_sample_projects(conn: &Connection) -> Result<()> {
  // Seed a couple of codes if table empty
  let count: i64 = conn.query_row("SELECT COUNT(*) FROM project_codes", [], |r| r.get(0))?;
  if count == 0 {
    conn.execute(
      "INSERT INTO project_codes (code, allotted_hours) VALUES
        ('PRJ-1001', 40.0),
        ('PRJ-2002', 20.0)",
      [],
    )?;
  }
  Ok(())
}

#[derive(Debug, Serialize, Deserialize)]
struct ProjectDto { id: i64, code: String, allotted: f64 }

#[tauri::command]
fn list_projects(app: tauri::AppHandle) -> Result<Vec<ProjectDto>, String> {
  (|| -> Result<Vec<ProjectDto>> {
    let db = get_db_path(&app)?;
    let conn = open_and_migrate(&db)?;
    let mut stmt = conn.prepare("SELECT id, code, allotted_hours FROM project_codes ORDER BY id")?;
    let rows = stmt
      .query_map([], |r| Ok(ProjectDto { id: r.get(0)?, code: r.get(1)?, allotted: r.get(2)? }))?
      .collect::<std::result::Result<Vec<_>, _>>()?;
    Ok(rows)
  })()
  .map_err(|e| e.to_string())
}

#[tauri::command]
fn add_project(app: tauri::AppHandle, code: String, allotted: f64) -> Result<(), String> {
  (|| -> Result<()> {
    let db = get_db_path(&app)?;
    let conn = open_and_migrate(&db)?;
    conn.execute(
      "INSERT INTO project_codes (code, allotted_hours) VALUES (?1, ?2)",
      params![code.trim(), allotted],
    )?;
    Ok(())
  })()
  .map_err(|e| e.to_string())
}

#[tauri::command]
fn update_project(app: tauri::AppHandle, id: i64, code: String) -> Result<(), String> {
  (|| -> Result<()> {
    let db = get_db_path(&app)?;
    let conn = open_and_migrate(&db)?;
    conn.execute("UPDATE project_codes SET code = ?1 WHERE id = ?2", params![code.trim(), id])?;
    Ok(())
  })()
  .map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_project(app: tauri::AppHandle, id: i64) -> Result<(), String> {
  (|| -> Result<()> {
    let db = get_db_path(&app)?;
    let conn = open_and_migrate(&db)?;
    conn.execute("DELETE FROM project_codes WHERE id = ?1", params![id])?;
    Ok(())
  })()
  .map_err(|e| e.to_string())
}

#[derive(Debug, Serialize, Deserialize)]
struct ProjectAllotmentDto { month: String, allotted: f64 }

#[tauri::command]
fn set_project_month_allotment(app: tauri::AppHandle, project_code_id: i64, month: String, allotted: f64) -> Result<(), String> {
  (|| -> Result<()> {
    let db = get_db_path(&app)?;
    let conn = open_and_migrate(&db)?;
    conn.execute(
      "INSERT INTO project_month_allotments (project_code_id, month, allotted_hours) VALUES (?1, ?2, ?3)
       ON CONFLICT(project_code_id, month) DO UPDATE SET allotted_hours = excluded.allotted_hours",
      params![project_code_id, month, allotted],
    )?;
    Ok(())
  })()
  .map_err(|e| e.to_string())
}

#[tauri::command]
fn list_project_allotments(app: tauri::AppHandle, project_code_id: i64) -> Result<Vec<ProjectAllotmentDto>, String> {
  (|| -> Result<Vec<ProjectAllotmentDto>> {
    let db = get_db_path(&app)?;
    let conn = open_and_migrate(&db)?;
    let mut stmt = conn.prepare("SELECT month, allotted_hours FROM project_month_allotments WHERE project_code_id = ?1 ORDER BY month DESC")?;
    let rows = stmt
      .query_map([project_code_id], |r| Ok(ProjectAllotmentDto { month: r.get(0)?, allotted: r.get(1)? }))?
      .collect::<std::result::Result<Vec<_>, _>>()?;
    Ok(rows)
  })()
  .map_err(|e| e.to_string())
}
