#!/usr/bin/env bash
# download_runtime.sh -- Download a self-contained Python runtime for Lorefire.
#
# Fetches the appropriate python-build-standalone (astral-sh) tarball for the
# current OS/arch and extracts it to resources/python/runtime/.  The runtime
# is gitignored and must be present before `php artisan native:build` packages
# the app.
#
# Supported platforms (auto-detected):
#   macOS arm64  (Apple Silicon)     -- actively shipped
#   macOS x86_64 (Intel Mac)         -- ready, not yet shipped
#   Linux x86_64                     -- ready, not yet shipped
#   Windows x86_64 (via Git Bash /
#                   MSYS2 / WSL)     -- ready, not yet shipped
#
# Usage (from project root):
#   bash resources/python/download_runtime.sh
#
# Override the detected platform:
#   PBS_PLATFORM=x86_64-apple-darwin bash resources/python/download_runtime.sh
#
# Re-running is safe: if the runtime binary already exists and reports the
# expected version the script exits early.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNTIME_DIR="$SCRIPT_DIR/runtime"

# ----- Version config -------------------------------------------------------
PYTHON_VERSION="3.12.13"
PBS_TAG="20260303"
PBS_BASE_URL="https://github.com/astral-sh/python-build-standalone/releases/download/${PBS_TAG}"
# ----------------------------------------------------------------------------

# ----- Platform detection ---------------------------------------------------
detect_platform() {
  local os arch

  # Allow explicit override
  if [ -n "${PBS_PLATFORM:-}" ]; then
    echo "$PBS_PLATFORM"
    return
  fi

  case "$(uname -s)" in
    Darwin)
      case "$(uname -m)" in
        arm64)  echo "aarch64-apple-darwin" ;;
        x86_64) echo "x86_64-apple-darwin" ;;
        *)      echo "UNSUPPORTED_ARCH:$(uname -m)" ;;
      esac
      ;;
    Linux)
      case "$(uname -m)" in
        x86_64) echo "x86_64-unknown-linux-gnu" ;;
        aarch64|arm64) echo "aarch64-unknown-linux-gnu" ;;
        *)      echo "UNSUPPORTED_ARCH:$(uname -m)" ;;
      esac
      ;;
    MINGW*|MSYS*|CYGWIN*)
      echo "x86_64-pc-windows-msvc"
      ;;
    *)
      echo "UNSUPPORTED_OS:$(uname -s)"
      ;;
  esac
}

PLATFORM="$(detect_platform)"

if [[ "$PLATFORM" == UNSUPPORTED_* ]]; then
  echo "ERROR: Unsupported platform: $PLATFORM"
  echo "  Set PBS_PLATFORM to one of:"
  echo "    aarch64-apple-darwin"
  echo "    x86_64-apple-darwin"
  echo "    x86_64-unknown-linux-gnu"
  echo "    x86_64-pc-windows-msvc"
  exit 1
fi

# ----- Derived values -------------------------------------------------------
TARBALL="cpython-${PYTHON_VERSION}+${PBS_TAG}-${PLATFORM}-install_only_stripped.tar.gz"
DOWNLOAD_URL="${PBS_BASE_URL}/${TARBALL}"

# Windows binary lives at python/python.exe; all others at python/bin/python3
if [[ "$PLATFORM" == *-windows-* ]]; then
  RUNTIME_BIN="$RUNTIME_DIR/python.exe"
else
  RUNTIME_BIN="$RUNTIME_DIR/bin/python3"
fi
# ----------------------------------------------------------------------------

echo "==> Lorefire -- Python Runtime Download"
echo "    Platform   : $PLATFORM"
echo "    Python     : $PYTHON_VERSION (build $PBS_TAG)"
echo "    Target dir : $RUNTIME_DIR"
echo ""

# Skip if already present and at the right version
if [ -x "$RUNTIME_BIN" ]; then
  CURRENT=$("$RUNTIME_BIN" --version 2>&1 || true)
  if echo "$CURRENT" | grep -q "$PYTHON_VERSION"; then
    echo "==> Runtime already present: $CURRENT -- skipping download."
    exit 0
  fi
  echo "==> Runtime present but wrong version ($CURRENT) -- re-downloading."
  rm -rf "$RUNTIME_DIR"
fi

# Download
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

TARBALL_PATH="$TMP_DIR/$TARBALL"
echo "==> Downloading $DOWNLOAD_URL ..."
curl -fL --progress-bar -o "$TARBALL_PATH" "$DOWNLOAD_URL"

# Extract — tarball always produces a top-level `python/` directory
echo "==> Extracting ..."
tar -xzf "$TARBALL_PATH" -C "$TMP_DIR"

EXTRACTED="$TMP_DIR/python"
if [ ! -d "$EXTRACTED" ]; then
  echo "ERROR: Expected top-level 'python/' directory in tarball — layout may have changed."
  exit 1
fi

# Move into place
rm -rf "$RUNTIME_DIR"
mv "$EXTRACTED" "$RUNTIME_DIR"

# Verify
if [ ! -x "$RUNTIME_BIN" ]; then
  echo "ERROR: Expected binary not found at $RUNTIME_BIN"
  exit 1
fi

VERIFIED=$("$RUNTIME_BIN" --version 2>&1)
echo "==> Runtime ready: $VERIFIED"
echo "    Location: $RUNTIME_BIN"
