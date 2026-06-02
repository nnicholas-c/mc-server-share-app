use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
  collections::HashMap,
  fs::{self, File},
  io::{BufRead, BufReader, Read, Write},
  path::{Component, Path, PathBuf},
  process::{Child, Command, Stdio},
  sync::Mutex,
  thread,
  time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Emitter, Manager, State};
use walkdir::WalkDir;

#[derive(Default)]
struct ProcessState {
  minecraft: Mutex<Option<Child>>,
  playit: Mutex<Option<Child>>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct DesktopProfile {
  server_path: String,
  server_type: String,
  start_command: String,
  java_path: String,
  memory_mb: u32,
  server_port: u16,
  level_name: String,
  world_includes: Vec<String>,
  world_excludes: Vec<String>,
  playit_path: Option<String>,
  coordinator_url: Option<String>,
  share_code: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ArchiveResult {
  path: String,
  file_name: String,
  sha256: String,
  size: u64,
  archive_format: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BlobClientTokenResponse {
  client_token: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct UploadedBlob {
  url: String,
  download_url: String,
  pathname: String,
  content_type: String,
  content_disposition: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ArchiveUploadProgress {
  upload_id: String,
  loaded: u64,
  total: u64,
  percentage: f64,
}

#[derive(Debug, Serialize, Clone)]
struct ProcessLog {
  process: String,
  line: String,
}

#[tauri::command]
fn detect_server_folder(server_path: String) -> Result<DesktopProfile, String> {
  let root = PathBuf::from(&server_path);
  if !root.exists() {
    return Err("Server folder does not exist".into());
  }

  let properties = read_server_properties(&root.join("server.properties"))?;
  let level_name = properties
    .get("level-name")
    .cloned()
    .unwrap_or_else(|| "world".to_string());
  let server_port = properties
    .get("server-port")
    .and_then(|value| value.parse::<u16>().ok())
    .unwrap_or(25565);
  let (server_type, jar_name) = detect_server_jar(&root);
  let start_command = jar_name
    .map(|jar| format!("java -Xmx4096M -jar \"{}\" nogui", jar))
    .unwrap_or_else(|| "java -jar server.jar nogui".to_string());

  Ok(DesktopProfile {
    server_path,
    server_type,
    start_command,
    java_path: "java".to_string(),
    memory_mb: 4096,
    server_port,
    level_name: level_name.clone(),
    world_includes: default_world_includes(&root, &level_name),
    world_excludes: vec![
      "session.lock".to_string(),
      "logs".to_string(),
      "crash-reports".to_string(),
    ],
    playit_path: None,
    coordinator_url: Some("http://localhost:3000".to_string()),
    share_code: None,
  })
}

#[tauri::command]
fn create_world_archive(profile: DesktopProfile) -> Result<ArchiveResult, String> {
  let root = PathBuf::from(&profile.server_path);
  let archive_path = temp_archive_path("world")?;
  create_tar_zst(&root, &archive_path, |path| {
    let relative = path.strip_prefix(&root).unwrap_or(path);
    let first = relative
      .components()
      .next()
      .map(|part| part.as_os_str().to_string_lossy().to_string());
    match first {
      Some(name) => {
        profile
          .world_includes
          .iter()
          .any(|include| include == &name)
          && !profile
            .world_excludes
            .iter()
            .any(|exclude| relative_contains(relative, exclude))
      }
      None => false,
    }
  })?;
  archive_result(archive_path)
}

#[tauri::command]
fn create_server_archive(profile: DesktopProfile) -> Result<ArchiveResult, String> {
  let root = PathBuf::from(&profile.server_path);
  let archive_path = temp_archive_path("server")?;
  create_tar_zst(&root, &archive_path, |path| {
    let relative = path.strip_prefix(&root).unwrap_or(path);
    let first = relative
      .components()
      .next()
      .map(|part| part.as_os_str().to_string_lossy().to_string());
    match first {
      Some(name) => {
        !profile
          .world_includes
          .iter()
          .any(|include| include == &name)
          && !matches!(
            name.as_str(),
            "logs"
              | "crash-reports"
              | ".mc-share-backups"
              | "ngrok.exe"
              | ".ngrok.exe.old"
              | "session.lock"
          )
      }
      None => false,
    }
  })?;
  archive_result(archive_path)
}

#[tauri::command]
fn download_archive(
  url: String,
  expected_sha256: String,
  file_name: String,
) -> Result<ArchiveResult, String> {
  let mut response = reqwest::blocking::get(&url).map_err(|error| error.to_string())?;
  if !response.status().is_success() {
    return Err(format!("Download failed with {}", response.status()));
  }

  let path = std::env::temp_dir().join(safe_file_name(&file_name));
  let mut file = File::create(&path).map_err(|error| error.to_string())?;
  response
    .copy_to(&mut file)
    .map_err(|error| error.to_string())?;

  let actual = sha256_file(&path)?;
  if actual.to_lowercase() != expected_sha256.to_lowercase() {
    return Err("Downloaded archive hash did not match manifest".into());
  }

  archive_result(path)
}

#[tauri::command]
fn upload_archive(
  app: AppHandle,
  archive: ArchiveResult,
  coordinator_url: String,
  endpoint: String,
  client_payload: serde_json::Value,
  upload_id: String,
) -> Result<UploadedBlob, String> {
  if endpoint != "/api/uploads/world-token" && endpoint != "/api/uploads/package-token" {
    return Err("Unsupported upload endpoint".into());
  }

  let archive_path = PathBuf::from(&archive.path);
  let file = File::open(&archive_path).map_err(|error| error.to_string())?;
  let content_type = archive_content_type(&archive.archive_format);
  let client = reqwest::blocking::Client::new();
  let handle_upload_url = format!(
    "{}{}",
    coordinator_url.trim_end_matches('/'),
    endpoint
  );

  let token_event = serde_json::json!({
    "type": "blob.generate-client-token",
    "payload": {
      "pathname": archive.file_name.clone(),
      "clientPayload": serde_json::to_string(&client_payload).map_err(|error| error.to_string())?,
      "multipart": false
    }
  });

  let token_response = client
    .post(handle_upload_url)
    .header("content-type", "application/json")
    .body(token_event.to_string())
    .send()
    .map_err(|error| error.to_string())?;

  if !token_response.status().is_success() {
    let status = token_response.status();
    let body = token_response.text().unwrap_or_default();
    return Err(format!("Upload token request failed with {status}: {body}"));
  }

  let token_body = token_response.text().map_err(|error| error.to_string())?;
  let token_response: BlobClientTokenResponse =
    serde_json::from_str(&token_body).map_err(|error| error.to_string())?;
  let store_id = parse_blob_store_id(&token_response.client_token)?;
  let blob_url = blob_api_url(&archive.file_name)?;
  let request_id = format!("{}:{}:mc-share-desktop", store_id, timestamp_millis());

  emit_archive_upload_progress(&app, &upload_id, 0, archive.size);
  let reader = ProgressReader::new(file, app.clone(), upload_id.clone(), archive.size);
  let response = client
    .put(blob_url)
    .header("authorization", format!("Bearer {}", token_response.client_token))
    .header("x-vercel-blob-access", "private")
    .header("x-content-type", content_type)
    .header("x-vercel-blob-store-id", store_id)
    .header("x-api-version", "12")
    .header("x-api-blob-request-id", request_id)
    .header("x-api-blob-request-attempt", "0")
    .header("x-content-length", archive.size.to_string())
    .body(reqwest::blocking::Body::sized(reader, archive.size))
    .send()
    .map_err(|error| error.to_string())?;

  if !response.status().is_success() {
    let status = response.status();
    let body = response.text().unwrap_or_default();
    return Err(format!("Blob upload failed with {status}: {body}"));
  }

  let body = response.text().map_err(|error| error.to_string())?;
  let blob: UploadedBlob = serde_json::from_str(&body).map_err(|error| error.to_string())?;
  emit_archive_upload_progress(&app, &upload_id, archive.size, archive.size);
  Ok(blob)
}

#[tauri::command]
fn extract_server_package(archive_path: String, destination: String) -> Result<(), String> {
  extract_tar_zst(Path::new(&archive_path), Path::new(&destination))
}

#[tauri::command]
fn restore_world_archive(profile: DesktopProfile, archive_path: String) -> Result<(), String> {
  let root = PathBuf::from(&profile.server_path);
  let backup_root = root.join(".mc-share-backups").join(timestamp().to_string());
  fs::create_dir_all(&backup_root).map_err(|error| error.to_string())?;

  for include in &profile.world_includes {
    let path = root.join(include);
    if path.exists() {
      fs::rename(&path, backup_root.join(include)).map_err(|error| error.to_string())?;
    }
  }

  extract_tar_zst(Path::new(&archive_path), &root)
}

#[tauri::command]
fn verify_file_sha256(path: String, expected_sha256: String) -> Result<bool, String> {
  Ok(sha256_file(Path::new(&path))?.to_lowercase() == expected_sha256.to_lowercase())
}

#[tauri::command]
fn start_minecraft_server(
  app: AppHandle,
  state: State<'_, ProcessState>,
  profile: DesktopProfile,
) -> Result<(), String> {
  let mut guard = state
    .minecraft
    .lock()
    .map_err(|_| "Minecraft process lock failed")?;
  if guard.is_some() {
    return Err("Minecraft server is already running".into());
  }

  let mut child = shell_command(&profile.start_command)
    .current_dir(&profile.server_path)
    .stdin(Stdio::piped())
    .stdout(Stdio::piped())
    .stderr(Stdio::piped())
    .spawn()
    .map_err(|error| error.to_string())?;

  pipe_logs(&app, "minecraft", child.stdout.take());
  pipe_logs(&app, "minecraft", child.stderr.take());
  *guard = Some(child);
  Ok(())
}

#[tauri::command]
fn stop_minecraft_server(app: AppHandle, state: State<'_, ProcessState>) -> Result<(), String> {
  let mut guard = state
    .minecraft
    .lock()
    .map_err(|_| "Minecraft process lock failed")?;
  if let Some(child) = guard.as_mut() {
    if let Some(stdin) = child.stdin.as_mut() {
      stdin
        .write_all(b"save-all flush\r\nstop\r\n")
        .map_err(|error| error.to_string())?;
    }

    for _ in 0..45 {
      if child
        .try_wait()
        .map_err(|error| error.to_string())?
        .is_some()
      {
        *guard = None;
        return Ok(());
      }
      thread::sleep(Duration::from_secs(1));
    }

    emit_process_log(
      &app,
      "minecraft",
      "Minecraft did not exit after 45 seconds; forcing it closed after save-all.",
    );
    child.kill().map_err(|error| error.to_string())?;
    let _ = child.wait();
  }
  *guard = None;
  Ok(())
}

#[tauri::command]
fn start_playit(
  app: AppHandle,
  state: State<'_, ProcessState>,
  playit_path: String,
) -> Result<(), String> {
  let mut guard = state
    .playit
    .lock()
    .map_err(|_| "playit process lock failed")?;
  if guard.is_some() {
    return Err("playit is already running".into());
  }

  let mut child = Command::new(playit_path)
    .arg("attach")
    .arg("--stdout")
    .stdout(Stdio::piped())
    .stderr(Stdio::piped())
    .spawn()
    .map_err(|error| error.to_string())?;

  pipe_logs(&app, "playit", child.stdout.take());
  pipe_logs(&app, "playit", child.stderr.take());
  *guard = Some(child);
  Ok(())
}

#[tauri::command]
fn stop_playit(state: State<'_, ProcessState>) -> Result<(), String> {
  let mut guard = state
    .playit
    .lock()
    .map_err(|_| "playit process lock failed")?;
  if let Some(child) = guard.as_mut() {
    let _ = child.kill();
    let _ = child.wait();
  }
  *guard = None;
  Ok(())
}

fn read_server_properties(path: &Path) -> Result<HashMap<String, String>, String> {
  let mut values = HashMap::new();
  if !path.exists() {
    return Ok(values);
  }

  let text = fs::read_to_string(path).map_err(|error| error.to_string())?;
  for line in text.lines() {
    let trimmed = line.trim();
    if trimmed.is_empty() || trimmed.starts_with('#') {
      continue;
    }
    if let Some((key, value)) = trimmed.split_once('=') {
      values.insert(key.trim().to_string(), value.trim().to_string());
    }
  }
  Ok(values)
}

fn detect_server_jar(root: &Path) -> (String, Option<String>) {
  let mut fallback = None;
  let entries = match fs::read_dir(root) {
    Ok(entries) => entries,
    Err(_) => return ("unknown".to_string(), None),
  };

  for entry in entries.flatten() {
    let name = entry.file_name().to_string_lossy().to_string();
    let lower = name.to_lowercase();
    if !lower.ends_with(".jar") {
      continue;
    }
    if lower.contains("forge") {
      return ("forge".to_string(), Some(name));
    }
    if lower.contains("fabric") {
      return ("fabric".to_string(), Some(name));
    }
    if lower.contains("paper") {
      return ("paper".to_string(), Some(name));
    }
    if lower.contains("server") {
      fallback = Some(name);
    }
  }

  ("vanilla".to_string(), fallback)
}

fn default_world_includes(root: &Path, level_name: &str) -> Vec<String> {
  let candidates = [
    level_name.to_string(),
    format!("{}_nether", level_name),
    format!("{}_the_end", level_name),
  ];

  let found: Vec<String> = candidates
    .iter()
    .filter(|candidate| root.join(candidate).exists())
    .cloned()
    .collect();

  if found.is_empty() {
    vec![level_name.to_string()]
  } else {
    found
  }
}

fn create_tar_zst<F>(root: &Path, archive_path: &Path, include: F) -> Result<(), String>
where
  F: Fn(&Path) -> bool,
{
  let file = File::create(archive_path).map_err(|error| error.to_string())?;
  let encoder = zstd::Encoder::new(file, 3).map_err(|error| error.to_string())?;
  let mut builder = tar::Builder::new(encoder.auto_finish());
  let mut added = false;

  for entry in WalkDir::new(root)
    .min_depth(1)
    .into_iter()
    .filter_map(Result::ok)
  {
    let path = entry.path();
    if !include(path) {
      continue;
    }
    let relative = path.strip_prefix(root).map_err(|error| error.to_string())?;
    if entry.file_type().is_file() {
      builder
        .append_path_with_name(path, relative)
        .map_err(|error| error.to_string())?;
      added = true;
    }
  }

  builder.finish().map_err(|error| error.to_string())?;
  if !added {
    return Err("No files matched the archive include rules".into());
  }
  Ok(())
}

fn extract_tar_zst(archive_path: &Path, destination: &Path) -> Result<(), String> {
  fs::create_dir_all(destination).map_err(|error| error.to_string())?;
  let file = File::open(archive_path).map_err(|error| error.to_string())?;
  let decoder = zstd::Decoder::new(file).map_err(|error| error.to_string())?;
  let mut archive = tar::Archive::new(decoder);

  for entry in archive.entries().map_err(|error| error.to_string())? {
    let mut entry = entry.map_err(|error| error.to_string())?;
    let relative = entry
      .path()
      .map_err(|error| error.to_string())?
      .into_owned();
    if !is_safe_relative_path(&relative) {
      return Err("Archive contains an unsafe path".into());
    }
    entry
      .unpack(destination.join(relative))
      .map_err(|error| error.to_string())?;
  }

  Ok(())
}

fn archive_result(path: PathBuf) -> Result<ArchiveResult, String> {
  let file_name = path
    .file_name()
    .ok_or("Archive path has no file name")?
    .to_string_lossy()
    .to_string();
  let size = fs::metadata(&path)
    .map_err(|error| error.to_string())?
    .len();
  let sha256 = sha256_file(&path)?;

  Ok(ArchiveResult {
    path: path.to_string_lossy().to_string(),
    file_name,
    sha256,
    size,
    archive_format: "tar.zst".to_string(),
  })
}

fn temp_archive_path(prefix: &str) -> Result<PathBuf, String> {
  let dir = std::env::temp_dir().join("mc-server-share");
  fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
  Ok(dir.join(format!("{}-{}.tar.zst", prefix, timestamp())))
}

fn sha256_file(path: &Path) -> Result<String, String> {
  let mut file = File::open(path).map_err(|error| error.to_string())?;
  let mut hasher = Sha256::new();
  let mut buffer = [0_u8; 1024 * 128];

  loop {
    let read = file.read(&mut buffer).map_err(|error| error.to_string())?;
    if read == 0 {
      break;
    }
    hasher.update(&buffer[..read]);
  }

  Ok(format!("{:x}", hasher.finalize()))
}

fn pipe_logs<R: Read + Send + 'static>(app: &AppHandle, process: &str, reader: Option<R>) {
  let Some(reader) = reader else {
    return;
  };
  let app = app.clone();
  let process = process.to_string();

  std::thread::spawn(move || {
    let reader = BufReader::new(reader);
    for line in reader.lines().map_while(Result::ok) {
      emit_process_log(&app, &process, &line);
    }
  });
}

fn emit_process_log(app: &AppHandle, process: &str, line: &str) {
  let _ = app.emit(
    "process-log",
    ProcessLog {
      process: process.to_string(),
      line: line.to_string(),
    },
  );
}

struct ProgressReader<R> {
  inner: R,
  app: AppHandle,
  upload_id: String,
  loaded: u64,
  total: u64,
  last_emit: Instant,
  last_loaded: u64,
}

impl<R: Read> ProgressReader<R> {
  fn new(inner: R, app: AppHandle, upload_id: String, total: u64) -> Self {
    Self {
      inner,
      app,
      upload_id,
      loaded: 0,
      total,
      last_emit: Instant::now(),
      last_loaded: 0,
    }
  }

  fn maybe_emit(&mut self) {
    let elapsed = self.last_emit.elapsed() >= Duration::from_millis(150);
    let advanced = self.loaded.saturating_sub(self.last_loaded) >= 512 * 1024;
    let complete = self.loaded >= self.total;

    if elapsed || advanced || complete {
      emit_archive_upload_progress(&self.app, &self.upload_id, self.loaded, self.total);
      self.last_emit = Instant::now();
      self.last_loaded = self.loaded;
    }
  }
}

impl<R: Read> Read for ProgressReader<R> {
  fn read(&mut self, buffer: &mut [u8]) -> std::io::Result<usize> {
    let read = self.inner.read(buffer)?;
    if read > 0 {
      self.loaded = self.loaded.saturating_add(read as u64);
      self.maybe_emit();
    }
    Ok(read)
  }
}

fn emit_archive_upload_progress(app: &AppHandle, upload_id: &str, loaded: u64, total: u64) {
  let percentage = if total == 0 {
    0.0
  } else {
    ((loaded as f64 / total as f64) * 100.0).clamp(0.0, 100.0)
  };

  let _ = app.emit(
    "archive-upload-progress",
    ArchiveUploadProgress {
      upload_id: upload_id.to_string(),
      loaded,
      total,
      percentage,
    },
  );
}

fn archive_content_type(archive_format: &str) -> &'static str {
  if archive_format == "zip" {
    "application/zip"
  } else {
    "application/zstd"
  }
}

fn blob_api_url(pathname: &str) -> Result<reqwest::Url, String> {
  let mut url = reqwest::Url::parse("https://vercel.com/api/blob/")
    .map_err(|error| error.to_string())?;
  url.query_pairs_mut().append_pair("pathname", pathname);
  Ok(url)
}

fn parse_blob_store_id(client_token: &str) -> Result<String, String> {
  client_token
    .split('_')
    .nth(3)
    .filter(|store_id| !store_id.is_empty())
    .map(|store_id| store_id.to_string())
    .ok_or_else(|| "Blob client token did not include a store id".to_string())
}

fn timestamp_millis() -> u128 {
  SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .unwrap_or_default()
    .as_millis()
}

fn shell_command(command: &str) -> Command {
  #[cfg(target_os = "windows")]
  {
    let mut cmd = Command::new("cmd");
    cmd.arg("/C").arg(command);
    cmd
  }

  #[cfg(not(target_os = "windows"))]
  {
    let mut cmd = Command::new("sh");
    cmd.arg("-lc").arg(command);
    cmd
  }
}

fn relative_contains(path: &Path, needle: &str) -> bool {
  path.components().any(|part| {
    part.as_os_str()
      .to_string_lossy()
      .eq_ignore_ascii_case(needle)
  })
}

fn safe_file_name(file_name: &str) -> String {
  file_name
    .chars()
    .map(|character| match character {
      'a'..='z' | 'A'..='Z' | '0'..='9' | '.' | '-' | '_' => character,
      _ => '_',
    })
    .collect()
}

fn is_safe_relative_path(path: &Path) -> bool {
  path.components()
    .all(|component| matches!(component, Component::Normal(_) | Component::CurDir))
}

fn timestamp() -> u64 {
  SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .unwrap_or_default()
    .as_secs()
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn parses_server_properties() {
    let root = unique_test_dir();
    fs::create_dir_all(&root).unwrap();
    fs::write(
      root.join("server.properties"),
      "server-port=25566\nlevel-name=DregoraRL\n",
    )
    .unwrap();

    let properties = read_server_properties(&root.join("server.properties")).unwrap();
    assert_eq!(properties.get("server-port"), Some(&"25566".to_string()));
    assert_eq!(properties.get("level-name"), Some(&"DregoraRL".to_string()));
    let _ = fs::remove_dir_all(root);
  }

  #[test]
  fn finds_default_world_siblings() {
    let root = unique_test_dir();
    fs::create_dir_all(root.join("world")).unwrap();
    fs::create_dir_all(root.join("world_nether")).unwrap();

    let includes = default_world_includes(&root, "world");
    assert_eq!(
      includes,
      vec!["world".to_string(), "world_nether".to_string()]
    );
    let _ = fs::remove_dir_all(root);
  }

  #[test]
  fn rejects_archive_path_traversal() {
    assert!(is_safe_relative_path(Path::new("world/region/r.0.0.mca")));
    assert!(!is_safe_relative_path(Path::new("../outside")));
    assert!(!is_safe_relative_path(Path::new("/absolute/path")));
  }

  fn unique_test_dir() -> PathBuf {
    let nanos = SystemTime::now()
      .duration_since(UNIX_EPOCH)
      .unwrap_or_default()
      .as_nanos();
    std::env::temp_dir().join(format!("mc-share-test-{}", nanos))
  }
}

#[derive(Debug, Default, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct SavedConfig {
  server_path: Option<String>,
  share_code: Option<String>,
  coordinator_url: Option<String>,
  display_name: Option<String>,
  admin_token: Option<String>,
  playit_path: Option<String>,
}

#[tauri::command]
fn load_config(app: AppHandle) -> Result<SavedConfig, String> {
  let config_path = app
    .path()
    .app_local_data_dir()
    .map_err(|e| e.to_string())?
    .join("config.json");

  if !config_path.exists() {
    return Ok(SavedConfig::default());
  }

  let text = fs::read_to_string(&config_path).map_err(|e| e.to_string())?;
  serde_json::from_str(&text).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_config(app: AppHandle, config: SavedConfig) -> Result<(), String> {
  let data_dir = app.path().app_local_data_dir().map_err(|e| e.to_string())?;

  fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;

  let text = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
  fs::write(data_dir.join("config.json"), text).map_err(|e| e.to_string())
}

pub fn run() {
  let mut builder = tauri::Builder::default();

  #[cfg(desktop)]
  {
    builder = builder.plugin(tauri_plugin_single_instance::init(|_app, _argv, _cwd| {}));
  }

  builder
    .plugin(tauri_plugin_deep_link::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .setup(|app| {
      #[cfg(any(target_os = "linux", all(debug_assertions, windows)))]
      {
        use tauri_plugin_deep_link::DeepLinkExt;
        app.deep_link().register_all()?;
      }

      Ok(())
    })
    .manage(ProcessState::default())
    .invoke_handler(tauri::generate_handler![
      detect_server_folder,
      create_world_archive,
      create_server_archive,
      download_archive,
      upload_archive,
      extract_server_package,
      restore_world_archive,
      verify_file_sha256,
      start_minecraft_server,
      stop_minecraft_server,
      start_playit,
      stop_playit,
      load_config,
      save_config
    ])
    .run(tauri::generate_context!())
    .expect("error while running MC Server Share");
}
