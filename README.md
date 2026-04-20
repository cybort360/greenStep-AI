# GreenStep AI

A Next.js sustainability coaching app where users log daily choices — transport, food, habits — and receive AI-powered carbon impact feedback from **Olive**, a persistent coach who remembers everything across sessions.

Built for the DEV Earth Day Weekend Challenge.

---

## Why Backboard matters here

Most AI apps lose context the moment you close the tab. GreenStep uses **Backboard** to store every conversation turn as a thread. On the next visit, the server fetches the full history and replays it into Gemini before generating a response.

This means Olive genuinely remembers: if you logged a bus commute on Monday and a plant-based lunch on Wednesday, Friday's recommendation is informed by both. The coach improves the more you use it — which is the whole point.

## Why Gemini fits this use case

Carbon impact estimation requires consistent, structured reasoning across many log formats. GreenStep sets `responseMimeType: "application/json"` on every Gemini call and enforces a typed schema server-side:

```
impact_score    → kg CO₂e avoided this entry
insight         → one encouraging sentence
challenge       → one concrete next step
recommendation  → one personalised lifestyle change
total_saved     → cumulative CO₂e across the thread
echo_effect     → rough estimate of this AI call's own footprint
```

The `echo_effect` field is intentional: it surfaces the carbon cost of the AI call itself, making the app honest about its own footprint.

---

## Features

- **Persistent coach (Olive)** — Backboard thread memory means Olive's recommendations improve over time as your history grows
- **Impact dashboard** — per-entry CO₂e score with real-world equivalency (km not driven), cumulative savings, streak counter
- **Floating chat** — ask Olive anything at any time without leaving the page; shares the same thread so context is always live
- **Quick-tap chips** — one-tap log starters (Took the bus, Plant-based lunch, etc.) to reduce first-use friction
- **Echo Effect** — every coaching response includes Gemini's estimate of the AI call's own carbon cost
- **Structured Gemini output** — server enforces JSON parsing; no free-text drift across sessions
- **Provider-aware errors** — actionable messages for Gemini quota, model, and billing failures with `Retry-After` support

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| UI | React 19 + TypeScript + Tailwind CSS 4 |
| AI | Google Gemini API (`gemini-2.0-flash`) |
| Thread memory | Backboard SDK (`backboard-sdk`) |
| Icons | Lucide React |

---

## Project structure

```
app/
  api/
    chat/route.ts        # Coaching endpoint — Gemini call + Backboard thread replay
    thread/route.ts      # Creates a new Backboard thread, returns its ID
  layout.tsx             # Global metadata and fonts
  page.tsx               # Home page — mounts ImpactDashboard + ChatWidget
components/
  ImpactDashboard.tsx    # Log form, impact card, streak, chips, recommendations
  ChatWidget.tsx         # Floating chat panel (Olive)
lib/
  backboard-config.ts    # Backboard client and assistant bootstrap logic
  gemini-api-errors.ts   # Maps Gemini API errors to user-friendly messages
  greenstep.ts           # System prompt, JSON schema types, thread message helpers
```

---

## How it works

1. On first load, the client calls `POST /api/thread` — Backboard creates a thread and returns its ID.
2. The ID is saved to `localStorage` (`greenstep_thread_id`) and reused on every future visit.
3. When the user logs an action, the client calls `POST /api/chat` with `{ threadId, message }`.
4. The server fetches all prior messages from Backboard and normalises them into Gemini `contents` format (user / model turns).
5. Gemini is called with the full history and a system prompt that enforces a JSON response schema.
6. The parsed result is returned to the UI; both the user message and assistant JSON are appended back to the Backboard thread.
7. The client updates streak state, renders the impact card, and surfaces Olive's latest insight.

---

## Setup

### Prerequisites

- Node.js 18+ (20 recommended)
- A [Backboard](https://backboard.dev) API key
- A [Gemini API](https://ai.google.dev) key (Google AI Studio or Google Cloud)

### Steps

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env.local` in the project root:
   ```bash
   BACKBOARD_API_KEY=your_backboard_key
   GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_key

   # Optional:
   # BACKBOARD_ASSISTANT_ID=assistant_xxx   ← pin a specific assistant
   # GEMINI_MODEL=gemini-2.0-flash          ← override the model
   ```

3. Start the dev server:
   ```bash
   npm run dev
   ```

4. Open `http://localhost:3000`.

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `BACKBOARD_API_KEY` | Yes | Server-side Backboard authentication |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Yes* | Gemini auth key |
| `GEMINI_API_KEY` | No | Fallback key name |
| `BACKBOARD_ASSISTANT_ID` | No | Pins a specific Backboard assistant |
| `GEMINI_MODEL` | No | Highest-priority model override |
| `GOOGLE_GENERATIVE_AI_MODEL` | No | Secondary model override |

Model precedence: `GEMINI_MODEL` → `GOOGLE_GENERATIVE_AI_MODEL` → `gemini-2.0-flash`

---

## Scripts

```bash
npm run dev          # Dev server (default)
npm run dev:turbo    # Dev server with Turbopack
npm run build        # Production build
npm run start        # Run production server
npm run lint         # Lint
```

---

## API reference

### `POST /api/thread`

Creates a Backboard thread for the session.

**Response**
```json
{ "threadId": "thread_xxx" }
```

### `POST /api/chat`

**Request**
```json
{
  "threadId": "thread_xxx",
  "message": "I cycled 8 km to work instead of driving."
}
```

**Success response**
```json
{
  "coach": {
    "impact_score": 1.2,
    "insight": "Cycling 8 km saved roughly 1.2 kg CO₂e versus driving.",
    "challenge": "Try going car-free for the full working week.",
    "recommendation": "Switch your weekly shop to a local market on foot — it cuts transport emissions and reduces packaging.",
    "total_saved": 14.7
  },
  "echoNote": "This AI call cost roughly 0.0003 g CO₂e.",
  "usage": {
    "promptTokenCount": 312,
    "candidatesTokenCount": 98,
    "totalTokenCount": 410
  }
}
```

**Error response**
```json
{
  "error": "Human-readable message.",
  "helpUrl": "https://...",
  "retryAfterSeconds": 49
}
```

---

## Error handling

| Condition | What happens |
|---|---|
| 403 / API disabled | Message links to enabling the Generative Language API |
| 404 / model not found | Message prompts updating `GEMINI_MODEL` |
| 429 / quota exceeded | Message shows suggested wait time and billing link |

---

## Known limitations

- Thread state is per-browser (`localStorage`), not per-account — no auth layer.
- CO₂e estimates are heuristic and model-dependent; treat them as rough guides, not scientific measurements.
- No test suite yet.
