use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
  collections::HashMap,
  fs::{self, File},
  io::{BufRead, BufReader, Read, Write},
  path::{Component, Path, PathBuf},
  process::{Child, Command, Stdio},
  sync::Mutex,
  time::{SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Emitter, State};
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

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ArchiveResult {
  path: String,
  file_name: String,
  sha256: String,
  size: u64,
  archive_format: String,
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
    let first = relative.components().next().map(|part| part.as_os_str().to_string_lossy().to_string());
    match first {
      Some(name) => {
        profile.world_includes.iter().any(|include| include == &name)
          && !profile.world_excludes.iter().any(|exclude| relative_contains(relative, exclude))
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
    let first = relative.components().next().map(|part| part.as_os_str().to_string_lossy().to_string());
    match first {
      Some(name) => {
        !profile.world_includes.iter().any(|include| include == &name)
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
fn download_archive(url: String, expected_sha256: String, file_name: String) -> Result<ArchiveResult, String> {
  let mut response = reqwest::blocking::get(&url).map_err(|error| error.to_string())?;
  if !response.status().is_success() {
    return Err(format!("Download failed with {}", response.status()));
  }

  let path = std::env::temp_dir().join(safe_file_name(&file_name));
  let mut file = File::create(&path).map_err(|error| error.to_string())?;
  response.copy_to(&mut file).map_err(|error| error.to_string())?;

  let actual = sha256_file(&path)?;
  if actual.to_lowercase() != expected_sha256.to_lowercase() {
    return Err("Downloaded archive hash did not match manifest".into());
  }

  archive_result(path)
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
  let mut guard = state.minecraft.lock().map_err(|_| "Minecraft process lock failed")?;
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
fn stop_minecraft_server(state: State<'_, ProcessState>) -> Result<(), String> {
  let mut guard = state.minecraft.lock().map_err(|_| "Minecraft process lock failed")?;
  if let Some(child) = guard.as_mut() {
    if let Some(stdin) = child.stdin.as_mut() {
      stdin.write_all(b"save-all\nstop\n").map_err(|error| error.to_string())?;
    }
    child.wait().map_err(|error| error.to_string())?;
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
  let mut guard = state.playit.lock().map_err(|_| "playit process lock failed")?;
  if guard.is_some() {
    return Err("playit is already running".into());
  }

  let mut child = Command::new(playit_path)
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
  let mut guard = state.playit.lock().map_err(|_| "playit process lock failed")?;
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

  for entry in WalkDir::new(root).min_depth(1).into_iter().filter_map(Result::ok) {
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
    let relative = entry.path().map_err(|error| error.to_string())?.into_owned();
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
  let size = fs::metadata(&path).map_err(|error| error.to_string())?.len();
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
      let _ = app.emit(
        "process-log",
        ProcessLog {
          process: process.clone(),
          line,
        },
      );
    }
  });
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
  path.components()
    .any(|part| part.as_os_str().to_string_lossy().eq_ignore_ascii_case(needle))
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
  path.components().all(|component| {
    matches!(component, Component::Normal(_) | Component::CurDir)
  })
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
    assert_eq!(includes, vec!["world".to_string(), "world_nether".to_string()]);
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
      extract_server_package,
      restore_world_archive,
      verify_file_sha256,
      start_minecraft_server,
      stop_minecraft_server,
      start_playit,
      stop_playit
    ])
    .run(tauri::generate_context!())
    .expect("error while running MC Server Share");
}
