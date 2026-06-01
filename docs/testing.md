# Testing

Run all tests from the repo root:

```powershell
npm run test
```

Run coordinator tests only:

```powershell
npm run test --workspace @mc-share/coordinator
```

Run desktop frontend type checks:

```powershell
npm run typecheck --workspace @mc-share/desktop
```

Run the Tauri/Rust checks after installing Rust:

```powershell
cd apps/desktop/src-tauri
cargo test
cargo check
```

The current machine used for the initial scaffold did not have Node, npm, Rust,
or Cargo on PATH, so dependency installation and test execution must happen on a
machine with that toolchain installed.
