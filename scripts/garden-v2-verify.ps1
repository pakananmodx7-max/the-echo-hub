#Requires -Version 5.1
<#
Garden V2 — local verification runner (Windows PowerShell).

Runs BOTH test suites end-to-end on a Windows machine, where the Firebase RTDB emulator is
expected to work normally (this sandbox's own attempt to run it hit an environment-specific
403-on-startup bug unrelated to the rules content — see the accompanying chat report).

What this script does, in order:
  1. Prereq checks (Node, Java — the emulator jars need a JRE, Firebase CLI availability).
  2. npm install (pulls in the @firebase/rules-unit-testing / @playwright/test / firebase-tools
     devDependencies this task added to package.json).
  3. npx playwright install chromium (one-time browser download for the e2e suite).
  4. Runs the RTDB security-rules suite (tests/rtdb-rules/garden-v2.rules.test.mjs) via
     `firebase emulators:exec` — starts the database emulator, runs the script, tears it down.
  5. Starts the full emulator suite (auth+firestore+database) + the Vite dev server pointed
     at them, runs the two-browser Playwright multiplayer suite, then tears everything down.

Never modifies database.rules.json. Never runs `firebase deploy`. If a test fails, this
script does NOT loosen any rule to make it pass — a failure here means either the rule or
the app code needs a real fix, re-run this script after that fix, never after weakening a
rule.

Usage (from the repository root, in PowerShell):
    .\scripts\garden-v2-verify.ps1
Optional: -SkipRules or -SkipE2E to run only one suite; -KeepEnvLocal to leave the emulator
.env.local in place afterward instead of restoring your original one.
#>

param(
  [switch]$SkipRules,
  [switch]$SkipE2E,
  [switch]$KeepEnvLocal
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "    OK: $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "    WARN: $msg" -ForegroundColor Yellow }

# --- 1. Prereqs -----------------------------------------------------------------------
Write-Step "Checking prerequisites"

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { throw "Node.js not found on PATH. Install Node 20+ from https://nodejs.org first." }
Write-Ok "node $(node --version)"

$java = Get-Command java -ErrorAction SilentlyContinue
if (-not $java) {
  throw "Java not found on PATH. The Firestore/Database emulators need a JRE (Java 11+). Install Temurin/OpenJDK, e.g. 'winget install EclipseAdoptium.Temurin.21.JRE', then re-run."
}
Write-Ok "java found: $((java -version 2>&1 | Select-Object -First 1))"

# --- 2. Install deps --------------------------------------------------------------------
Write-Step "npm install (pulls in rules-unit-testing / playwright / firebase-tools)"
npm install
if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
Write-Ok "dependencies installed"

Write-Step "Installing the Playwright Chromium browser (one-time, skipped if already present)"
npx playwright install chromium
if ($LASTEXITCODE -ne 0) { throw "playwright install failed" }

# --- 3. RTDB security-rules suite --------------------------------------------------------
if (-not $SkipRules) {
  Write-Step "Running RTDB rules-unit-testing suite (tests/rtdb-rules/garden-v2.rules.test.mjs)"
  npm run test:garden-rules
  $rulesExit = $LASTEXITCODE
  if ($rulesExit -ne 0) {
    Write-Warn "RTDB rules suite reported failures (exit $rulesExit) — see PASS/FAIL lines above. Do NOT weaken database.rules.json to force this green; fix the rule or the failing test's expectation, then re-run."
  } else {
    Write-Ok "RTDB rules suite: ALL PASS"
  }
} else {
  Write-Warn "Skipping RTDB rules suite (-SkipRules)"
  $rulesExit = $null
}

# --- 4. Two-browser multiplayer e2e suite ------------------------------------------------
$e2eExit = $null
if (-not $SkipE2E) {
  Write-Step "Preparing a temporary emulator-pointed .env.local"
  $envLocalPath = Join-Path $RepoRoot '.env.local'
  $backupPath = Join-Path $RepoRoot '.env.local.garden-verify-backup'
  $hadExistingEnvLocal = Test-Path $envLocalPath
  if ($hadExistingEnvLocal) {
    Copy-Item $envLocalPath $backupPath -Force
    Write-Ok "backed up existing .env.local -> .env.local.garden-verify-backup"
  }
  @"
VITE_FIREBASE_API_KEY=demo-garden-verify-key
VITE_FIREBASE_AUTH_DOMAIN=demo-garden-verify.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=demo-garden-verify
VITE_FIREBASE_STORAGE_BUCKET=demo-garden-verify.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=000000000000
VITE_FIREBASE_APP_ID=1:000000000000:web:0000000000000000000000
VITE_FIREBASE_DATABASE_URL=http://127.0.0.1:9000/?ns=demo-garden-verify
VITE_USE_FIREBASE_EMULATORS=true
"@ | Set-Content -Path $envLocalPath -Encoding utf8
  Write-Ok "wrote temporary .env.local pointed at the local emulators"

  $emulatorProc = $null
  $devServerProc = $null
  try {
    Write-Step "Starting the full emulator suite (auth 9099, firestore 8080, database 9000)"
    $emulatorProc = Start-Process -FilePath "npx" -ArgumentList "firebase","emulators:start","--only","auth,firestore,database","--project","demo-garden-verify" `
      -PassThru -WindowStyle Hidden -RedirectStandardOutput "$RepoRoot\.garden-verify-emulators.log" -RedirectStandardError "$RepoRoot\.garden-verify-emulators.err.log"
    Write-Ok "emulator process started (PID $($emulatorProc.Id)) — logs: .garden-verify-emulators.log"

    Write-Step "Waiting for the Database emulator to accept connections (up to 90s)"
    $ready = $false
    for ($i = 0; $i -lt 45; $i++) {
      Start-Sleep -Seconds 2
      try {
        $resp = Invoke-WebRequest -Uri "http://127.0.0.1:9000/.json?ns=demo-garden-verify" -UseBasicParsing -TimeoutSec 2
        if ($resp.StatusCode -eq 200) { $ready = $true; break }
      } catch { }
    }
    if (-not $ready) { throw "Database emulator did not become ready within 90s — check .garden-verify-emulators.err.log" }
    Write-Ok "emulators ready"

    Write-Step "Starting the Vite dev server (port 5173)"
    $devServerProc = Start-Process -FilePath "npm" -ArgumentList "run","dev" `
      -PassThru -WindowStyle Hidden -RedirectStandardOutput "$RepoRoot\.garden-verify-devserver.log" -RedirectStandardError "$RepoRoot\.garden-verify-devserver.err.log"
    Write-Ok "dev server process started (PID $($devServerProc.Id)) — logs: .garden-verify-devserver.log"

    Write-Step "Waiting for the dev server to respond (up to 60s)"
    $devReady = $false
    for ($i = 0; $i -lt 30; $i++) {
      Start-Sleep -Seconds 2
      try {
        $resp = Invoke-WebRequest -Uri "http://127.0.0.1:5173/" -UseBasicParsing -TimeoutSec 2
        if ($resp.StatusCode -eq 200) { $devReady = $true; break }
      } catch { }
    }
    if (-not $devReady) { throw "Dev server did not become ready within 60s — check .garden-verify-devserver.err.log" }
    Write-Ok "dev server ready"

    Write-Step "Running the two-browser Garden V2 multiplayer suite (Playwright)"
    npm run test:garden-e2e
    $e2eExit = $LASTEXITCODE
    if ($e2eExit -ne 0) {
      Write-Warn "e2e suite reported failures (exit $e2eExit) — see the Playwright output above (and playwright-report/ if generated)."
    } else {
      Write-Ok "e2e suite: ALL PASS"
    }
  } finally {
    Write-Step "Tearing down dev server and emulators"
    if ($devServerProc) { try { taskkill /PID $devServerProc.Id /T /F 2>$null | Out-Null } catch {} }
    if ($emulatorProc)  { try { taskkill /PID $emulatorProc.Id /T /F 2>$null } catch {} }
    # firebase emulators:start also spawns a detached java process for the database/firestore
    # emulator jars, which a plain taskkill /T doesn't always reach — clean those up by name too.
    Get-Process java -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*firebase*" -or $_.MainWindowTitle -eq "" } | ForEach-Object {
      try { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue } catch {}
    }

    if ($KeepEnvLocal) {
      Write-Warn ".env.local left pointed at the emulators (-KeepEnvLocal) — restore it yourself before running the real app against production Firebase."
    } elseif ($hadExistingEnvLocal) {
      Copy-Item $backupPath $envLocalPath -Force
      Remove-Item $backupPath -Force
      Write-Ok "restored your original .env.local"
    } else {
      Remove-Item $envLocalPath -Force -ErrorAction SilentlyContinue
      Write-Ok "removed the temporary .env.local (none existed before)"
    }
  }
} else {
  Write-Warn "Skipping e2e suite (-SkipE2E)"
}

# --- Summary ------------------------------------------------------------------------------
Write-Step "Summary"
if ($rulesExit -ne $null) { Write-Host "  RTDB rules suite : $(if ($rulesExit -eq 0) {'PASS'} else {"FAIL (exit $rulesExit)"})" }
if ($e2eExit -ne $null)   { Write-Host "  Multiplayer e2e   : $(if ($e2eExit -eq 0) {'PASS'} else {"FAIL (exit $e2eExit)"})" }
Write-Host "`nDone. Do not deploy based on this run alone — also complete the manual seat/onDisconnect visual checks (see the chat report's section B)." -ForegroundColor Cyan
