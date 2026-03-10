# download_runtime.ps1 -- Download a self-contained Python runtime for Lorefire (Windows).
#
# Fetches the appropriate python-build-standalone (astral-sh) tarball for Windows
# and extracts it to resources\python\runtime\.  The runtime is gitignored and must
# be present before `php artisan native:build` packages the app.
#
# Usage (from project root):
#   powershell -ExecutionPolicy Bypass -File resources\python\download_runtime.ps1
#
# Override the detected platform:
#   $env:PBS_PLATFORM="x86_64-pc-windows-msvc"; powershell -ExecutionPolicy Bypass -File resources\python\download_runtime.ps1
#
# Re-running is safe: if the runtime binary already exists and reports the
# expected version the script exits early.

param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ScriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$RuntimeDir = Join-Path $ScriptDir 'runtime'

# ----- Version config -------------------------------------------------------
$PythonVersion = "3.12.13"
$PbsTag        = "20260303"
$PbsBaseUrl    = "https://github.com/astral-sh/python-build-standalone/releases/download/$PbsTag"
# ----------------------------------------------------------------------------

# ----- Platform detection ---------------------------------------------------
$Platform = if ($env:PBS_PLATFORM) {
    $env:PBS_PLATFORM
} else {
    "x86_64-pc-windows-msvc"
}
# ----------------------------------------------------------------------------

$Tarball     = "cpython-${PythonVersion}+${PbsTag}-${Platform}-install_only_stripped.tar.gz"
$DownloadUrl = "$PbsBaseUrl/$Tarball"
$RuntimeBin  = Join-Path $RuntimeDir 'python.exe'

Write-Host "==> Lorefire -- Python Runtime Download"
Write-Host "    Platform   : $Platform"
Write-Host "    Python     : $PythonVersion (build $PbsTag)"
Write-Host "    Target dir : $RuntimeDir"
Write-Host ""

# Skip if already present and at the right version
if (Test-Path $RuntimeBin) {
    $current = (& $RuntimeBin --version 2>&1).ToString()
    if ($current -match [regex]::Escape($PythonVersion)) {
        Write-Host "==> Runtime already present: $current -- skipping download."
        exit 0
    }
    Write-Host "==> Runtime present but wrong version ($current) -- re-downloading."
    Remove-Item -Recurse -Force $RuntimeDir
}

# Download
$TmpDir = Join-Path ([System.IO.Path]::GetTempPath()) ([System.IO.Path]::GetRandomFileName())
New-Item -ItemType Directory -Path $TmpDir | Out-Null

try {
    $TarballPath = Join-Path $TmpDir $Tarball

    Write-Host "==> Downloading $DownloadUrl ..."
    curl.exe -fL --progress-bar -o $TarballPath $DownloadUrl

    # Extract — tarball always produces a top-level `python/` directory
    Write-Host "==> Extracting ..."
    tar -xzf $TarballPath -C $TmpDir

    $Extracted = Join-Path $TmpDir 'python'
    if (-not (Test-Path $Extracted)) {
        Write-Error "ERROR: Expected top-level 'python/' directory in tarball — layout may have changed."
        exit 1
    }

    # Move into place
    if (Test-Path $RuntimeDir) {
        Remove-Item -Recurse -Force $RuntimeDir
    }
    Move-Item $Extracted $RuntimeDir
} finally {
    Remove-Item -Recurse -Force $TmpDir -ErrorAction SilentlyContinue
}

# Verify
if (-not (Test-Path $RuntimeBin)) {
    Write-Error "ERROR: Expected binary not found at $RuntimeBin"
    exit 1
}

$Verified = (& $RuntimeBin --version 2>&1).ToString()
Write-Host "==> Runtime ready: $Verified"
Write-Host "    Location: $RuntimeBin"
