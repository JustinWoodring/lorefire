#!/usr/bin/env python3
"""
run_whisperx.py — WhisperX transcription + speaker diarization runner.

Usage:
  python run_whisperx.py \
    --audio /path/to/audio.webm \
    --output /path/to/output.json \
    --model base \
    --language en \
    --diarize \
    --hf-token <HuggingFace token for diarization>

Output JSON schema:
{
  "segments": [
    {
      "start": 0.0,
      "end": 2.4,
      "text": "Hello everyone.",
      "speaker": "SPEAKER_00"   # only present when --diarize
    },
    ...
  ],
  "word_segments": [...],    # optional, only if alignment succeeds
  "language": "en"
}

Exit codes:
  0  — success
  1  — argument / file error
  2  — transcription error
  3  — diarization error
"""

import argparse
import json
import os
import sys

# Set cache directories to proper OS-native paths before any ML library imports.
# On Windows the default expansion uses mixed separators which breaks cache lookups.
_cache_base = os.path.join(os.path.expanduser('~'), '.cache')
os.environ.setdefault('HF_HOME',    os.path.join(_cache_base, 'huggingface'))
os.environ.setdefault('TORCH_HOME', os.path.join(_cache_base, 'torch'))

# imageio-ffmpeg bundles ffmpeg with a platform-specific name (e.g.
# ffmpeg-win64-v6.1.exe), not "ffmpeg.exe", so adding its directory to PATH
# is not enough.  Copy/hardlink the binary into a temp dir under the name
# "ffmpeg" so that whisperx.load_audio() finds it by the standard name.
try:
    import shutil as _shutil
    import tempfile as _tempfile
    import imageio_ffmpeg as _iio_ffmpeg
    _ffmpeg_src = _iio_ffmpeg.get_ffmpeg_exe()
    _ffmpeg_alias_dir = _tempfile.mkdtemp(prefix="lorefire_ffmpeg_")
    _ffmpeg_alias = os.path.join(_ffmpeg_alias_dir, "ffmpeg" + os.path.splitext(_ffmpeg_src)[1])
    try:
        os.link(_ffmpeg_src, _ffmpeg_alias)        # hardlink — no admin needed
    except OSError:
        _shutil.copy2(_ffmpeg_src, _ffmpeg_alias)  # fallback: copy
    os.environ['PATH'] = _ffmpeg_alias_dir + os.pathsep + os.environ.get('PATH', '')
except Exception:
    pass  # Fall back to system ffmpeg if available

# python-build-standalone does not hook into the Windows certificate store,
# so urllib (used by torch.hub and huggingface_hub) fails SSL verification.
# Explicitly point SSL to certifi's CA bundle to fix HTTPS in packaged builds.
try:
    import certifi
    os.environ.setdefault('SSL_CERT_FILE',      certifi.where())
    os.environ.setdefault('REQUESTS_CA_BUNDLE', certifi.where())
    os.environ.setdefault('CURL_CA_BUNDLE',     certifi.where())
except ImportError:
    pass

# Network connectivity check — surfaces the real error instead of torch.hub's
# generic "no internet connection" message.
import urllib.request as _urllib_request
try:
    _urllib_request.urlopen('https://huggingface.co', timeout=10)
    print("[whisperx-debug] Network: OK", file=sys.stderr)
except Exception as _net_err:
    print(f"[whisperx-debug] Network: FAILED — {type(_net_err).__name__}: {_net_err}", file=sys.stderr)


def detect_device() -> tuple[str, str, str]:
    """Return (ct2_device, torch_device, compute_type).

    ct2_device   — device string for ctranslate2 / faster-whisper (transcription).
                   ctranslate2 only accepts 'cpu' or 'cuda'; MPS is not supported.
    torch_device — device string for pure-PyTorch steps (alignment, diarization).
                   On Apple Silicon this is 'mps', giving a significant speedup.
    compute_type — quantisation hint for ctranslate2 (ignored by PyTorch steps).
    """
    try:
        import torch
        if torch.cuda.is_available():
            return "cuda", "cuda", "float16"
        if torch.backends.mps.is_available():
            # ctranslate2 cannot use MPS — keep transcription on CPU.
            # Alignment (torchaudio wav2vec2) and diarization (pyannote) are
            # pure PyTorch and benefit greatly from MPS on Apple Silicon.
            return "cpu", "mps", "int8"
    except Exception:
        pass
    return "cpu", "cpu", "int8"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="WhisperX transcription runner")
    parser.add_argument("--audio",    required=True,  help="Path to input audio file")
    parser.add_argument("--output",   required=True,  help="Path to write JSON output")
    parser.add_argument("--model",    default="base",  help="Whisper model size (tiny/base/small/medium/large-v2/large-v3)")
    parser.add_argument("--language", default=None,   help="Language code (e.g. 'en'). Auto-detect if omitted.")
    parser.add_argument("--diarize",  action="store_true", help="Enable speaker diarization")
    parser.add_argument("--hf-token", default=None,   dest="hf_token",
                        help="HuggingFace token (required for diarization)")
    parser.add_argument("--device",   default="auto",  help="Device: auto, cpu, cuda, or mps")
    parser.add_argument("--batch-size", type=int, default=16, dest="batch_size",
                        help="Batch size for transcription (reduce if OOM)")
    parser.add_argument("--compute-type", default="int8", dest="compute_type",
                        help="Compute type: int8, float16, float32")
    parser.add_argument("--vad-method", default="silero", dest="vad_method",
                        help="VAD backend: silero (default) or pyannote")
    parser.add_argument("--min-speakers", type=int, default=None, dest="min_speakers")
    parser.add_argument("--max-speakers", type=int, default=None, dest="max_speakers")
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    # ── Validate input ───────────────────────────────────────────────
    if not os.path.isfile(args.audio):
        print(f"ERROR: Audio file not found: {args.audio}", file=sys.stderr)
        return 1

    output_dir = os.path.dirname(args.output)
    if output_dir and not os.path.isdir(output_dir):
        os.makedirs(output_dir, exist_ok=True)

    # ── Resolve device ───────────────────────────────────────────────
    if args.device == "auto":
        ct2_device, torch_device, compute_type = detect_device()
        if args.compute_type != "int8":
            # User explicitly passed compute_type — respect it
            compute_type = args.compute_type
    else:
        ct2_device = args.device
        torch_device = args.device
        compute_type = args.compute_type

    print(f"[whisperx] Using ct2_device={ct2_device} torch_device={torch_device} compute_type={compute_type}", file=sys.stderr)

    # ── Import whisperx (lazy, so error messages are clear) ──────────
    try:
        import whisperx
    except ImportError:
        print("ERROR: whisperx is not installed. Run setup.sh first.", file=sys.stderr)
        return 2

    # ── Load model ───────────────────────────────────────────────────
    print(f"[whisperx] Loading model '{args.model}' on {ct2_device}…", file=sys.stderr)
    try:
        model = whisperx.load_model(
            args.model,
            device=ct2_device,
            compute_type=compute_type,
            language=args.language,
            vad_method=args.vad_method,
        )
    except Exception as exc:
        print(f"ERROR: Failed to load model: {exc}", file=sys.stderr)
        return 2

    # ── Load audio ───────────────────────────────────────────────────
    print(f"[whisperx] Loading audio: {args.audio}", file=sys.stderr)
    try:
        audio = whisperx.load_audio(args.audio)
    except Exception as exc:
        print(f"ERROR: Failed to load audio: {exc}", file=sys.stderr)
        return 1

    # ── Transcribe ───────────────────────────────────────────────────
    print("[whisperx] Transcribing…", file=sys.stderr)
    try:
        result = model.transcribe(audio, batch_size=args.batch_size)
    except Exception as exc:
        print(f"ERROR: Transcription failed: {exc}", file=sys.stderr)
        return 2

    detected_language = result.get("language", args.language or "unknown")
    print(f"[whisperx] Detected language: {detected_language}", file=sys.stderr)

    # ── Align ────────────────────────────────────────────────────────
    try:
        print("[whisperx] Aligning…", file=sys.stderr)
        align_model, metadata = whisperx.load_align_model(
            language_code=detected_language,
            device=torch_device,
        )
        result = whisperx.align(
            result["segments"],
            align_model,
            metadata,
            audio,
            torch_device,
            return_char_alignments=False,
        )
        print("[whisperx] Alignment complete.", file=sys.stderr)
    except Exception as exc:
        # Alignment is best-effort; continue with raw segments
        print(f"[whisperx] WARNING: Alignment failed ({exc}), using raw segments.", file=sys.stderr)

    # ── Diarize ──────────────────────────────────────────────────────
    if args.diarize:
        if not args.hf_token:
            print("WARNING: --diarize requested but no --hf-token provided. Skipping diarization.", file=sys.stderr)
        else:
            try:
                import whisperx.diarize as whisperx_diarize

                print("[whisperx] Running speaker diarization…", file=sys.stderr)
                diarize_model = whisperx_diarize.DiarizationPipeline(
                    use_auth_token=args.hf_token,
                    device=torch_device,
                )
                diarize_kwargs: dict = {}
                if args.min_speakers is not None:
                    diarize_kwargs["min_speakers"] = args.min_speakers
                if args.max_speakers is not None:
                    diarize_kwargs["max_speakers"] = args.max_speakers

                diarize_segments = diarize_model(audio, **diarize_kwargs)
                result = whisperx.assign_word_speakers(diarize_segments, result)
                print("[whisperx] Diarization complete.", file=sys.stderr)
            except Exception as exc:
                print(f"[whisperx] WARNING: Diarization failed ({exc}), continuing without speaker labels.", file=sys.stderr)

    # ── Build output ─────────────────────────────────────────────────
    segments_out = []
    for seg in result.get("segments", []):
        entry: dict = {
            "start": round(seg.get("start", 0), 3),
            "end":   round(seg.get("end",   0), 3),
            "text":  seg.get("text", "").strip(),
        }
        if "speaker" in seg:
            entry["speaker"] = seg["speaker"]
        segments_out.append(entry)

    output_data = {
        "language": detected_language,
        "segments": segments_out,
    }

    # Include word-level segments if available
    if "word_segments" in result:
        output_data["word_segments"] = [
            {
                "word":    w.get("word", ""),
                "start":   round(w.get("start", 0), 3),
                "end":     round(w.get("end",   0), 3),
                "score":   round(w.get("score",  0), 4),
                "speaker": w.get("speaker"),
            }
            for w in result["word_segments"]
        ]

    # ── Write output ─────────────────────────────────────────────────
    print(f"[whisperx] Writing output to {args.output}…", file=sys.stderr)
    try:
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2)
    except Exception as exc:
        print(f"ERROR: Failed to write output: {exc}", file=sys.stderr)
        return 1

    segment_count = len(segments_out)
    print(f"[whisperx] Done. {segment_count} segments written.", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
