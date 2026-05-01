# MediVoice
> Real-time multilingual voice AI for clinical scheduling, reminders, and front-desk automation.

MediVoice turns a patient call into a structured clinic action. It handles booking, rescheduling, cancellations, outbound reminders, and follow-up campaigns across English, Hindi, and Tamil, with confirmations and live trace data built in.

## Highlights

- `Vapi` phone integration for inbound and outbound clinical calls
- Two-step confirmations for appointment writes
- English, Hindi, and Tamil language handling
- Conflict-aware scheduling with availability checks
- Browser dashboard for voice turns, appointments, patients, analytics, and campaigns
- JSON-backed local mode plus Supabase-backed persistence
- Live latency trace and turn-by-turn reasoning history

## Screenshots

<p align="center">
  <img src="docs/media/mediavoice-dashboard.png" alt="MediVoice dashboard" width="100%" />
</p>

<p align="center">
  <img src="docs/media/mediavoice-appointments.png" alt="MediVoice appointments view" width="49%" />
  <img src="docs/media/mediavoice-campaigns.png" alt="MediVoice campaigns view" width="49%" />
</p>

## Product Video

[Watch the MediVoice product video](docs/media/mediavoice-product-video.mp4)

The Remotion source for the video lives in [`marketing-video/`](marketing-video/README.md).

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

For a production-style local build:

```bash
npm run build
npm start
```

The API runs on `http://localhost:8787` by default.

## Vapi + Supabase

1. Run `supabase-schema.sql` in Supabase, then verify with `npm run supabase:verify`.
2. Start the app with `npm run dev`.
3. Expose the API with `ngrok http 8787` or set `PUBLIC_SERVER_URL` to your public HTTPS URL.
4. Run `npm run vapi:setup` to create or update the Vapi tool, assistant, and phone routing for this project.
5. Call the configured Vapi number. Vapi routes tool calls to `/api/vapi/webhook`, and appointments persist to the configured store.

`GET /api/vapi/config` returns the webhook and tool URLs the setup uses.

## Try It

- `Book an appointment with Dr. Rao tomorrow at 10 am`
- `Reschedule my appointment to tomorrow at 3 pm`
- `When is my appointment?`
- `Cancel my appointment`
- `मुझे doctor appointment chahiye tomorrow 11 am`
- `நாளை 10 மணிக்கு doctor appointment வேண்டும்`

## Architecture

See [`docs/architecture.pdf`](docs/architecture.pdf) and [`docs/architecture.mmd`](docs/architecture.mmd).

## Project Shape

- `src/client`: browser demo console for microphone input, text fallback, voice output, appointments, and trace visibility
- `src/server`: Express API for `/api/voice-turn`, `/api/campaign/start`, `/api/vapi/*`, and analytics surfaces
- `src/agent`: language detection, turn parsing, orchestration, and campaign handling
- `src/tools`: scheduling and availability logic
- `src/memory`: JSON and Supabase persistence
- `marketing-video`: Remotion source for the product video

## Notes

- Browser speech recognition support varies by browser and OS; text input is the reliable fallback.
- Hindi and Tamil replies are intentionally simple for a live demo.
- The scheduling core is deterministic and traceable, so the system remains explainable even when the voice layer changes.
- No real PHI should be entered until Supabase row-level security and secret management are configured.
