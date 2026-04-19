# GreenStep AI
GreenStep AI is a Next.js sustainability coaching app that helps users log daily actions (transport, food, habits), estimates CO₂e impact per entry, and keeps a running total over time using persistent thread context.

## What this project does
- Creates a persistent coaching thread per browser session using Backboard.
- Sends each user log to Gemini with structured JSON output requirements.
- Returns:
  - `impact_score` for the current log
  - `insight` (encouraging explanation)
  - `challenge` (next micro-action)
  - `total_saved` cumulative CO₂e estimate
  - `echo_effect` note estimating model-call footprint
- Stores thread id and streak state in `localStorage` so the experience survives refreshes.
- Shows actionable provider errors (quota, model mismatch, API disabled) with help links.

## Core features
- **Persistent memory:** Conversation history is replayed into Gemini from Backboard thread messages.
- **Structured model output:** Server enforces JSON parsing and maps to typed payloads.
- **Impact dashboard UI:** Displays per-entry impact, cumulative savings, coaching note, challenge, and streak.
- **Provider-aware errors:** Friendly messages for common Gemini API failures with `Retry-After` support.

## Tech stack
- Next.js 15 (App Router)
- React 19 + TypeScript
- Tailwind CSS 4
- Google Gemini API (`@google/generative-ai`)
- Backboard SDK (`backboard-sdk`)
- Lucide React icons

## Project structure
```text
app/
  api/
    chat/route.ts        # Main coaching endpoint (Gemini + Backboard thread replay)
    thread/route.ts      # Creates/returns threadId for client session
  layout.tsx             # Global metadata + fonts
  page.tsx               # Home page container
components/
  ImpactDashboard.tsx    # Client UI: log form, API calls, streak, impact rendering
lib/
  backboard-config.ts    # Backboard client + get/create assistant logic
  gemini-api-errors.ts   # Maps Gemini API errors to user-friendly responses
  greenstep.ts           # Prompt, JSON parsing, thread-message transformation helpers
```

## How the system works
1. The client loads and requests `POST /api/thread` if no thread id exists in `localStorage`.
2. The thread id is saved (`greenstep_thread_id`) and reused.
3. User submits a log via `POST /api/chat` with `{ threadId, message }`.
4. Server fetches prior thread messages from Backboard.
5. Prior messages are normalized into Gemini `contents` format (user/model turns).
6. Server calls Gemini with a strict system prompt and JSON response expectation.
7. Parsed result is returned to UI; both user log and assistant JSON are appended to Backboard.
8. Client updates streak and renders the latest impact card.

## Prerequisites
- Node.js 18+ (Node 20 recommended)
- npm
- A Backboard API key
- A Gemini API key (Google AI Studio / Gemini API)

## Local setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env.local` in the project root:
   ```bash
   BACKBOARD_API_KEY={{BACKBOARD_API_KEY}}
   GOOGLE_GENERATIVE_AI_API_KEY={{GOOGLE_GENERATIVE_AI_API_KEY}}

   # Optional overrides:
   # BACKBOARD_ASSISTANT_ID=assistant_xxx
   # GEMINI_MODEL=gemini-flash-lite-latest
   # GOOGLE_GENERATIVE_AI_MODEL=gemini-2.0-flash
   ```
3. Start development server:
   ```bash
   npm run dev
   ```
4. Open `http://localhost:3000`.

## Environment variables
- `BACKBOARD_API_KEY` (required): used by server routes to access Backboard.
- `BACKBOARD_ASSISTANT_ID` (optional): pins a specific Backboard assistant.
- `GOOGLE_GENERATIVE_AI_API_KEY` (required unless `GEMINI_API_KEY` is set): Gemini auth key.
- `GEMINI_API_KEY` (optional alternative): fallback key variable name.
- `GEMINI_MODEL` (optional): highest-priority model override.
- `GOOGLE_GENERATIVE_AI_MODEL` (optional): secondary model override.

Model selection precedence in code:
1. `GEMINI_MODEL`
2. `GOOGLE_GENERATIVE_AI_MODEL`
3. default `gemini-2.0-flash`

## npm scripts
- `npm run dev` — start Next.js dev server
- `npm run dev:turbo` — start dev server with Turbopack
- `npm run build` — production build
- `npm run start` — run production server
- `npm run lint` — run Next.js linting

## API reference
### `POST /api/thread`
Creates or resolves an assistant, then creates a thread.

Response:
```json
{ "threadId": "..." }
```

Error response:
```json
{ "error": "Thread creation failed" }
```

### `POST /api/chat`
Request body:
```json
{
  "threadId": "string",
  "message": "string (max 6000 chars)"
}
```

Success response:
```json
{
  "coach": {
    "impact_score": 0.42,
    "insight": "string",
    "challenge": "string",
    "total_saved": 12.34
  },
  "echoNote": "string",
  "usage": {
    "promptTokenCount": 0,
    "candidatesTokenCount": 0,
    "totalTokenCount": 0
  }
}
```

Mapped provider error shape:
```json
{
  "error": "human-readable message",
  "helpUrl": "https://...",
  "retryAfterSeconds": 49
}
```

## Error handling and troubleshooting
The server maps common Gemini API failures to actionable messages:
- **403 / API disabled** → Enable Generative Language API for the key’s project.
- **404 / model not found** → Update `GEMINI_MODEL` to a supported model id.
- **429 / quota or free-tier limit** → Wait and retry, switch model, or enable billing.

If you hit free-tier allowance errors:
1. Set `GEMINI_MODEL` to a model your project can call.
2. Restart the dev server (env vars are read at startup).
3. Retry after any suggested `retryAfterSeconds`.

## Security notes
- Keep real keys only in `.env.local`.
- Never commit `.env.local` or `.env` files.
- This repo is configured to ignore secret env files and allow only `.env.example` if you add one.
- Rotate keys immediately if a secret is ever committed or exposed.

## Known limitations
- No user authentication layer (single-browser local session model).
- Thread persistence is per browser (`localStorage`), not account-based.
- Emission estimates are heuristic and model-dependent.
- No test suite committed yet.

## Suggested next improvements
- Add auth and per-user thread mapping.
- Add test coverage for API contracts and parsing edge cases.
- Add telemetry/observability around model latency and failure rates.
- Add an `.env.example` template for faster onboarding.

## License
No license file is currently included. Add one before external distribution if needed.
