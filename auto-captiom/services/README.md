# FORGE platform services

These are deliberately provider-based boundaries shared by Android and Desktop.

- `render/engine.js` — native FFmpeg / hardware renderer plugs in here.
- `ai/manager.js` — Whisper/STT and AI effects plug in here.
- `cloud/manager.js` — account, sync, database and object storage plug in here.

The editor continues to run locally when these providers are unavailable.
