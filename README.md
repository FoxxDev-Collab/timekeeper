# Kratos Time Keeper

A lightweight desktop app for tracking project hours and monthly allotments. Built with Next.js UI embedded in a Tauri (Rust) shell for a fast, native experience on Windows.

## What it does
- Track time against projects by day and week
- View weekly rollups and totals
- Simple, keyboard-friendly UI with light/dark theme

## Run the app (Windows)
- **Download and run the .exe:** You must obtain the Windows executable from the release directory to run locally.
  - Path when built locally: `src-tauri/target/release/project_time_keeper.exe`
  - Or download the `.exe` from your distribution channel (e.g., GitHub Releases) and run it.

## Developer setup
Prerequisites:
- Node.js 20+ and pnpm
- Rust toolchain (rustup, cargo)
- Windows build tools required by Tauri

Install dependencies:

```bash
pnpm install
```

Run in development (desktop app):

```bash
pnpm tauri:dev
```

Build desktop release:

```bash
pnpm tauri:build
```

The Windows executable will be at: `src-tauri/target/release/project_time_keeper.exe`.

Optional (web-only preview):

```bash
pnpm dev
```

## Screenshots

### Login
![Screenshot 1](./public/images/Screenshot%202025-08-13%20102446.png)

### Signup
![Screenshot 2](./public/images/Screenshot%202025-08-13%20102459.png)

### Time Calendar View (Dark)
![Screenshot 3](./public/images/Screenshot%202025-08-13%20102536.png)

### Time Calendar View (Light)
![Screenshot 4](./public/images/Screenshot%202025-08-13%20102541.png)

### Manage Projects/Hours
![Screenshot 5](./public/images/Screenshot%202025-08-13%20102549.png)
