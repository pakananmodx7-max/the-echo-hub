#Requires -Version 5.1
<#
Garden V2 - local verification runner (Windows PowerShell 5.1+ and PowerShell 7+).

Runs BOTH test suites end-to-end on a Windows machine, where the Firebase RTDB emulator is
expected to work normally.

What this script does, in order:
  1. Prereq checks (Node, Java - the emulator jars need a JRE, Firebase CLI availability).
  2. npm install (pulls in the @firebase/rules-unit-testing / @playwright/test / firebase-tools
     devDependencies this task added to package.json).
  3. npx playwright install chromium (one-time browser download for the e2e suite).
  4. Runs the RTDB security-rules suite (tests/rtdb-rules/garden-v2.rules.test.mjs) via
     "firebase emulators:exec" - starts the database emulator, runs the script, tears it down.
  5. Starts the full emulator suite (auth+firestore+database) + the Vite dev server pointed
     at them, runs the two-browser Playwright multiplayer suite, then tears everything down.

Never modifies database.rules.json. Never runs "firebase deploy". If a test fails, this
script does NOT loosen any rule to make it pass - a failure here means either the rule or
the app code needs a real fix, re-run this script after that fix, never after weakening a
rule.

Usage (from the repository root, in PowerShell):
    .\scripts\garden-v2-verify.ps1
Optional switches:
    -SkipRules     skip the RTDB rules-unit-testing suite
    -SkipE2E       skip the two-browser Playwright multiplayer suite
    -KeepEnvLocal  leave the emulator-pointed .env.local in place afterward instead of
                   restoring your original one (or deleting it, if none existed before)

Before running this script, you can syntax-check it without executing anything, using:
    $errs = $null
    [System.Management.Automation.PSParser]::Tokenize((Get-Content .\scripts\garden-v2-verify.ps1 -Raw), [ref]$errs) | Out-Null
    if ($errs.Count -eq 0) { "OK: no syntax errors" } else { $errs }
#>

param(
  [switch]$SkipRules,
  [switch]$SkipE2E,
  [switch]$KeepEnvLocal
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Write-Ok {
  param([string]$Message)
  Write-Host "    OK: $Message" -ForegroundColor Green
}

function Write-Warn {
  param([string]$Message)
  Write-Host "    WARN: $Message" -ForegroundColor Yellow
}

# --- 1. Prereqs -----------------------------------------------------------------------
Write-Step "Checking prerequisites"

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  throw "Node.js not found on PATH. Install Node 20+ from https://nodejs.org first."
}
$nodeVersion = & node --version
Write-Ok "node $nodeVersion"

$java = Get-Command java -ErrorAction SilentlyContinue
if (-not $java) {
  throw "Java not found on PATH. The Firestore/Database emulators need a JRE (Java 11+). Install Temurin/OpenJDK, e.g. 'winget install EclipseAdoptium.Temurin.21.JRE', then re-run."
}
$javaVersionLine = (& java -version 2>&1 | Select-Object -First 1)
Write-Ok "java found: $javaVersionLine"

# --- 2. Install deps --------------------------------------------------------------------
Write-Step "npm install (pulls in rules-unit-testing / playwright / firebase-tools)"
npm install
if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
Write-Ok "dependencies installed"

Write-Step "Installing the Playwright Chromium browser (one-time, skipped if already present)"
npx playwright install chromium
if ($LASTEXITCODE -ne 0) { throw "playwright install failed" }

# --- 3. RTDB security-rules suite --------------------------------------------------------
$rulesExit = $null
if (-not $SkipRules) {
  Write-Step "Running RTDB rules-unit-testing suite (tests/rtdb-rules/garden-v2.rules.test.mjs)"
  npm run test:garden-rules
  $rulesExit = $LASTEXITCODE
  if ($rulesExit -ne 0) {
    Write-Warn "RTDB rules suite reported failures (exit $rulesExit) - see PASS/FAIL lines above. Do NOT weaken database.rules.json to force this green; fix the rule or the failing test's expectation, then re-run."
  } else {
    Write-Ok "RTDB rules suite: ALL PASS"
  }
} else {
  Write-Warn "Skipping RTDB rules suite (-SkipRules)"
}

# --- 4. Two-browser multiplayer e2e suite ------------------------------------------------
$e2eExit = $null
if (-not $SkipE2E) {
  Write-Step "Preparing a temporary emulator-pointed .env.local"
  $envLocalPath = Join-Path $RepoRoot '.env.local'
  $backupPath = Join-Path $RepoRoot '.env.local.garden-verify-backup'
  $hadExistingEnvLocal = Test-Path $envLocalPath
  if ($hadExistingEnvLocal) {
    Copy-Item -Path $envLocalPath -Destination $backupPath -Force
    Write-Ok "backed up existing .env.local -> .env.local.garden-verify-backup"
  }

  $envLines = @(
    'VITE_FIREBASE_API_KEY=demo-garden-verify-key',
    'VITE_FIREBASE_AUTH_DOMAIN=demo-garden-verify.firebaseapp.com',
    'VITE_FIREBASE_PROJECT_ID=demo-garden-verify',
    'VITE_FIREBASE_STORAGE_BUCKET=demo-garden-verify.appspot.com',
    'VITE_FIREBASE_MESSAGING_SENDER_ID=000000000000',
    'VITE_FIREBASE_APP_ID=1:000000000000:web:0000000000000000000000',
    'VITE_FIREBASE_DATABASE_URL=http://127.0.0.1:9000/?ns=demo-garden-verify',
    'VITE_USE_FIREBASE_EMULATORS=true'
  )
  Set-Content -Path $envLocalPath -Value $envLines -Encoding utf8
  Write-Ok "wrote temporary .env.local pointed at the local emulators"

  $emulatorProc = $null
  $devServerProc = $null
  try {
    Write-Step "Starting the full emulator suite (auth 9099, firestore 8080, database 9000)"
    $emulatorLog = Join-Path $RepoRoot '.garden-verify-emulators.log'
    $emulatorErrLog = Join-Path $RepoRoot '.garden-verify-emulators.err.log'
    $emulatorStartArgs = @{
      FilePath               = 'npx'
      ArgumentList           = @('firebase', 'emulators:start', '--only', 'auth,firestore,database', '--project', 'demo-garden-verify')
      PassThru               = $true
      WindowStyle            = 'Hidden'
      RedirectStandardOutput = $emulatorLog
      RedirectStandardError  = $emulatorErrLog
    }
    $emulatorProc = Start-Process @emulatorStartArgs
    Write-Ok "emulator process started (PID $($emulatorProc.Id)) - logs: .garden-verify-emulators.log"

    Write-Step "Waiting for the Database emulator to accept connections (up to 90s)"
    $ready = $false
    for ($i = 0; $i -lt 45; $i++) {
      Start-Sleep -Seconds 2
      try {
        $resp = Invoke-WebRequest -Uri "http://127.0.0.1:9000/.json?ns=demo-garden-verify" -UseBasicParsing -TimeoutSec 2
        if ($resp.StatusCode -eq 200) {
          $ready = $true
          break
        }
      } catch {
        # not up yet, keep polling
      }
    }
    if (-not $ready) {
      throw "Database emulator did not become ready within 90s - check .garden-verify-emulators.err.log"
    }
    Write-Ok "emulators ready"

    Write-Step "Starting the Vite dev server (port 5173)"
    $devLog = Join-Path $RepoRoot '.garden-verify-devserver.log'
    $devErrLog = Join-Path $RepoRoot '.garden-verify-devserver.err.log'
    $devServerStartArgs = @{
      FilePath               = 'npm'
      ArgumentList           = @('run', 'dev')
      PassThru               = $true
      WindowStyle            = 'Hidden'
      RedirectStandardOutput = $devLog
      RedirectStandardError  = $devErrLog
    }
    $devServerProc = Start-Process @devServerStartArgs
    Write-Ok "dev server process started (PID $($devServerProc.Id)) - logs: .garden-verify-devserver.log"

    Write-Step "Waiting for the dev server to respond (up to 60s)"
    $devReady = $false
    for ($i = 0; $i -lt 30; $i++) {
      Start-Sleep -Seconds 2
      try {
        $resp = Invoke-WebRequest -Uri "http://127.0.0.1:5173/" -UseBasicParsing -TimeoutSec 2
        if ($resp.StatusCode -eq 200) {
          $devReady = $true
          break
        }
      } catch {
        # not up yet, keep polling
      }
    }
    if (-not $devReady) {
      throw "Dev server did not become ready within 60s - check .garden-verify-devserver.err.log"
    }
    Write-Ok "dev server ready"

    Write-Step "Running the two-browser Garden V2 multiplayer suite (Playwright)"
    npm run test:garden-e2e
    $e2eExit = $LASTEXITCODE
    if ($e2eExit -ne 0) {
      Write-Warn "e2e suite reported failures (exit $e2eExit) - see the Playwright output above (and playwright-report/ if generated)."
    } else {
      Write-Ok "e2e suite: ALL PASS"
    }
  } finally {
    Write-Step "Tearing down dev server and emulators"

    if ($devServerProc) {
      try { taskkill /PID $devServerProc.Id /T /F *>$null } catch { }
    }
    if ($emulatorProc) {
      try { taskkill /PID $emulatorProc.Id /T /F *>$null } catch { }
    }

    # firebase emulators:start also spawns a detached java process for the database/firestore
    # emulator jars, which a plain taskkill /T doesn't always reach. Clean those up specifically
    # by command line (never by a blanket "any headless java process" match, which could kill
    # unrelated java processes on the machine).
    try {
      Get-CimInstance -ClassName Win32_Process -Filter "Name = 'java.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -and $_.CommandLine -like '*firebase*emulator*' } |
        ForEach-Object {
          try { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } catch { }
        }
    } catch {
      # Win32_Process/CIM not available (non-Windows PowerShell 7 host, etc.) - safe to skip.
    }

    if ($KeepEnvLocal) {
      Write-Warn ".env.local left pointed at the emulators (-KeepEnvLocal) - restore it yourself before running the real app against production Firebase."
    } elseif ($hadExistingEnvLocal) {
      Copy-Item -Path $backupPath -Destination $envLocalPath -Force
      Remove-Item -Path $backupPath -Force
      Write-Ok "restored your original .env.local"
    } else {
      Remove-Item -Path $envLocalPath -Force -ErrorAction SilentlyContinue
      Write-Ok "removed the temporary .env.local (none existed before)"
    }
  }
} else {
  Write-Warn "Skipping e2e suite (-SkipE2E)"
}

# --- Summary ------------------------------------------------------------------------------
Write-Step "Summary"

if ($null -ne $rulesExit) {
  if ($rulesExit -eq 0) {
    $rulesResult = 'PASS'
  } else {
    $rulesResult = "FAIL (exit $rulesExit)"
  }
  Write-Host "  RTDB rules suite : $rulesResult"
}

if ($null -ne $e2eExit) {
  if ($e2eExit -eq 0) {
    $e2eResult = 'PASS'
  } else {
    $e2eResult = "FAIL (exit $e2eExit)"
  }
  Write-Host "  Multiplayer e2e  : $e2eResult"
}

Write-Host ""
Write-Host "Done. Do not deploy based on this run alone - also complete the manual seat/onDisconnect visual checks (see the chat report's section B)." -ForegroundColor Cyan
