# setup.ps1 -- Create a Python venv and install WhisperX for Lorefire (Windows).
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File resources\python\setup.ps1 [-Gpu]
#
#   -Gpu  Install GPU (CUDA) versions of torch/torchaudio instead of CPU.
#
# The bundled python-build-standalone runtime is used when present
# (resources\python\runtime\python.exe).  Falls back to system Python for dev use.
# Download the runtime with: powershell -ExecutionPolicy Bypass -File resources\python\download_runtime.ps1
#
# The app's TranscribeAudio job calls the venv's Python directly:
#   resources\python\venv\Scripts\python.exe resources\python\run_whisperx.py ...

param(
    [switch]$Gpu
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ScriptDir      = Split-Path -Parent $MyInvocation.MyCommand.Path
$VenvDir        = Join-Path $ScriptDir 'venv'
$ReqFile        = Join-Path $ScriptDir 'requirements.txt'
$BundledRuntime = Join-Path $ScriptDir 'runtime\python.exe'
$VenvScriptsDir = Join-Path $VenvDir 'Scripts'

Write-Host "==> Lorefire -- WhisperX Setup"
Write-Host "    Script dir : $ScriptDir"
Write-Host "    Venv dir   : $VenvDir"
Write-Host "    GPU mode   : $($Gpu.IsPresent)"
Write-Host ""

# -- Locate Python -------------------------------------------------------
$PythonBin = $null

if (Test-Path $BundledRuntime) {
    $ver = & $BundledRuntime -c "import sys; print(sys.version_info[:2])"
    Write-Host "    Using bundled runtime: $BundledRuntime ($ver)"
    $PythonBin = $BundledRuntime
} else {
    Write-Host "    Bundled runtime not found at $BundledRuntime"
    Write-Host "    Falling back to system Python..."
    foreach ($candidate in @('python3.12', 'python3.11', 'python3.10', 'python3.9', 'python3', 'python')) {
        if (Get-Command $candidate -ErrorAction SilentlyContinue) {
            $ver = & $candidate -c "import sys; print(sys.version_info[:2])"
            Write-Host "    Found system Python: $candidate ($ver)"
            $PythonBin = $candidate
            break
        }
    }
}

if (-not $PythonBin) {
    Write-Error (
        "ERROR: No Python interpreter found.`n" +
        "  Expected bundled runtime at: $BundledRuntime`n" +
        "  To download it, run: powershell -ExecutionPolicy Bypass -File `"$ScriptDir\download_runtime.ps1`"`n" +
        "  Or install Python 3.9+ system-wide and re-run this script."
    )
    exit 1
}

# -- Check ffmpeg --------------------------------------------------------
if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
    Write-Host ""
    Write-Host "WARNING: ffmpeg not found in PATH."
    Write-Host "  WhisperX requires ffmpeg to decode audio files."
    Write-Host "  Install with: choco install ffmpeg  or  winget install ffmpeg"
    Write-Host ""
}

# -- Create venv ---------------------------------------------------------
if (-not (Test-Path $VenvDir)) {
    Write-Host "==> Creating virtual environment at $VenvDir..."
    & $PythonBin -m venv --copies $VenvDir
} else {
    Write-Host "==> Virtual environment already exists at $VenvDir"
}

$VenvPython = Join-Path $VenvScriptsDir 'python.exe'
$VenvPip    = Join-Path $VenvScriptsDir 'pip.exe'

# -- Upgrade pip ---------------------------------------------------------
Write-Host "==> Upgrading pip..."
& $VenvPip install --upgrade pip setuptools wheel

# -- Install torch (CPU or CUDA) -----------------------------------------
if ($Gpu) {
    Write-Host "==> Installing torch (CUDA 11.8)..."
    & $VenvPip install torch torchaudio --index-url https://download.pytorch.org/whl/cu118
} else {
    Write-Host "==> Installing torch (CPU only)..."
    & $VenvPip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu
}

# -- Install WhisperX and remaining deps ---------------------------------
Write-Host "==> Installing WhisperX and dependencies..."
try {
    & $VenvPip install -r $ReqFile --no-deps
    if ($LASTEXITCODE -ne 0) { throw "pip --no-deps failed" }
} catch {
    & $VenvPip install -r $ReqFile
}

# -- Verify install ------------------------------------------------------
Write-Host "==> Verifying installation..."
& $VenvPython -c "import whisperx; print('  whisperx OK:', whisperx.__version__ if hasattr(whisperx,'__version__') else 'installed')"
& $VenvPython -c "import torch; print('  torch OK:', torch.__version__)"

Write-Host ""
Write-Host "==> Setup complete."
Write-Host ""
Write-Host "    Run transcription with:"
Write-Host "    $VenvPython $ScriptDir\run_whisperx.py ``"
Write-Host "      --audio C:\path\to\audio.webm ``"
Write-Host "      --output C:\path\to\output.json ``"
Write-Host "      --model base --diarize --hf-token <TOKEN>"
Write-Host ""
