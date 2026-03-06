#!/usr/bin/env bash
# setup.sh -- Create a Python venv and install WhisperX for Lorefire.
#
# Usage:
#   bash resources/python/setup.sh [--gpu]
#
#   --gpu  Install GPU (CUDA) versions of torch/torchaudio instead of CPU.
#
# After running, activate with:
#   source resources/python/venv/bin/activate
#
# The app's TranscribeAudio job calls the venv's Python directly:
#   resources/python/venv/bin/python resources/python/run_whisperx.py ...

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$SCRIPT_DIR/venv"
REQ_FILE="$SCRIPT_DIR/requirements.txt"
GPU=false

# Parse args
for arg in "$@"; do
  case "$arg" in
    --gpu) GPU=true ;;
    *) echo "Unknown argument: $arg" && exit 1 ;;
  esac
done

echo "==> Lorefire -- WhisperX Setup"
echo "    Script dir : $SCRIPT_DIR"
echo "    Venv dir   : $VENV_DIR"
echo "    GPU mode   : $GPU"
echo ""

# -- Check Python --------------------------------------------------------
PYTHON_BIN=""
for candidate in python3.11 python3.10 python3.9 python3 python; do
  if command -v "$candidate" &>/dev/null; then
    PYTHON_VERSION=$("$candidate" -c "import sys; print(sys.version_info[:2])")
    echo "    Found: $candidate ($PYTHON_VERSION)"
    PYTHON_BIN="$candidate"
    break
  fi
done

if [ -z "$PYTHON_BIN" ]; then
  echo "ERROR: Python 3.9+ is required but was not found in PATH."
  exit 1
fi

# -- Check ffmpeg --------------------------------------------------------
if ! command -v ffmpeg &>/dev/null; then
  echo ""
  echo "WARNING: ffmpeg not found in PATH."
  echo "  WhisperX requires ffmpeg to decode audio files."
  echo "  Install via: brew install ffmpeg  (macOS)"
  echo ""
fi

# -- Create venv ---------------------------------------------------------
if [ ! -d "$VENV_DIR" ]; then
  echo "==> Creating virtual environment at $VENV_DIR..."
  "$PYTHON_BIN" -m venv "$VENV_DIR"
else
  echo "==> Virtual environment already exists at $VENV_DIR"
fi

VENV_PYTHON="$VENV_DIR/bin/python"
VENV_PIP="$VENV_DIR/bin/pip"

# -- Upgrade pip ---------------------------------------------------------
echo "==> Upgrading pip..."
"$VENV_PIP" install --upgrade pip setuptools wheel

# -- Install torch (CPU or CUDA) -----------------------------------------
if [ "$GPU" = true ]; then
  echo "==> Installing torch (CUDA 11.8)..."
  "$VENV_PIP" install torch torchaudio --index-url https://download.pytorch.org/whl/cu118
else
  echo "==> Installing torch (CPU only)..."
  "$VENV_PIP" install torch torchaudio --index-url https://download.pytorch.org/whl/cpu
fi

# -- Install WhisperX and remaining deps ---------------------------------
echo "==> Installing WhisperX and dependencies..."
"$VENV_PIP" install -r "$REQ_FILE" --no-deps || \
"$VENV_PIP" install -r "$REQ_FILE"

# -- Verify install ------------------------------------------------------
echo "==> Verifying installation..."
"$VENV_PYTHON" -c "import whisperx; print('  whisperx OK:', whisperx.__version__ if hasattr(whisperx,'__version__') else 'installed')"
"$VENV_PYTHON" -c "import torch; print('  torch OK:', torch.__version__)"

echo ""
echo "==> Setup complete."
echo ""
echo "    Run transcription with:"
echo "    $VENV_PYTHON $SCRIPT_DIR/run_whisperx.py \\"
echo "      --audio /path/to/audio.webm \\"
echo "      --output /path/to/output.json \\"
echo "      --model base --diarize --hf-token <TOKEN>"
echo ""
