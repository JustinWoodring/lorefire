+++
title = "Setting Up ComfyUI for Image Generation"
description = "How to install ComfyUI, download models, and connect it to Lorefire for local portrait and scene art generation."
weight = 10
+++

Lorefire can generate character portraits and scene art using [ComfyUI](https://github.com/comfyanonymous/ComfyUI) — a local Stable Diffusion backend that runs entirely on your machine. No API key or internet connection required.

## Requirements

- A GPU with at least 6 GB VRAM (NVIDIA recommended; AMD supported on Windows via DirectML)
- 10–20 GB of free disk space for models
- Python 3.10 or higher (macOS/Linux) — Windows users can use the portable build

---

## Install ComfyUI

### macOS

```bash
git clone https://github.com/comfyanonymous/ComfyUI
cd ComfyUI
pip3 install -r requirements.txt
```

If you are on Apple Silicon, install the MPS-accelerated torch build first:

```bash
pip3 install torch torchvision torchaudio
```

### Windows

Download the **portable standalone build** from the [ComfyUI releases page](https://github.com/comfyanonymous/ComfyUI/releases). Extract the zip, then run:

- `run_nvidia_gpu.bat` — for NVIDIA GPUs
- `run_cpu.bat` — if you have no discrete GPU (slower)

No Python installation needed for the portable build.

---

## Download a Model

ComfyUI needs at least one Stable Diffusion checkpoint to generate images. Place `.safetensors` files in:

- **macOS/Linux:** `ComfyUI/models/checkpoints/`
- **Windows (portable):** `ComfyUI_windows_portable\ComfyUI\models\checkpoints\`

Good starting points available on [CivitAI](https://civitai.com) and [Hugging Face](https://huggingface.co):

| Model | Style | Notes |
|---|---|---|
| DreamShaper XL | Versatile / painterly | Great all-rounder for portraits |
| Juggernaut XL | Photorealistic | High detail, needs more VRAM |
| Realistic Vision v5 | Photorealistic (SD 1.5) | Lighter, works on 6 GB VRAM |

> **SDXL models** produce higher quality but require more VRAM (8 GB+). **SD 1.5 models** are faster and run on 6 GB cards.

---

## Start the ComfyUI Server

### macOS / Linux

```bash
cd ComfyUI
python3 main.py --listen 127.0.0.1 --port 8188
```

### Windows (portable)

Double-click `run_nvidia_gpu.bat` (or `run_cpu.bat`). The server starts automatically on port 8188.

The ComfyUI web interface will be available at `http://127.0.0.1:8188` — you can leave this tab open but don't need to interact with it.

---

## Connect Lorefire to ComfyUI

1. Open Lorefire and go to **Settings**
2. Under **Art Generation**, select **ComfyUI (Local)**
3. Set the server URL to `http://127.0.0.1:8188`
4. Click **Test Connection** — you should see a green confirmation

You can now generate portraits from the NPC Roster and scene art from session pages.

---

## Troubleshooting

**"Connection refused" or timeout**

- Make sure ComfyUI is running *before* clicking Test Connection in Lorefire
- Confirm the port matches (default is `8188`)
- On Windows, check Windows Firewall is not blocking the port

**Out of memory / crashes during generation**

Add low-VRAM flags to the launch command:

```bash
python3 main.py --listen 127.0.0.1 --port 8188 --lowvram
```

Or for CPU-only (very slow but no VRAM needed):

```bash
python3 main.py --listen 127.0.0.1 --port 8188 --cpu
```

**Model not appearing in ComfyUI**

- Verify the `.safetensors` file is in the `checkpoints/` folder (not a subfolder)
- Restart ComfyUI after adding new models — it only scans on startup

**Slow generation on Apple Silicon**

Ensure you installed the MPS-enabled torch build. You can verify acceleration is active by checking the ComfyUI terminal output for `mps` device usage.
