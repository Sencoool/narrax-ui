# Narrax UI

Frontend for **Narrax**, an AI-assisted novel writing platform. Writers draft serialized novels episode by episode with a streaming AI co-writer that knows the novel's characters, world and style; readers discover and read published novels in a distraction-free reader.

This repository is the **client only**. It talks to a separate Narrax API (NestJS) over REST plus one streaming endpoint, defaulting to `http://localhost:3000`.

---

## Features

### Writer workspace
- **Novel dashboard** — create, list and delete novels; each novel opens an editor with metadata (title, summary, status, tags) and a lore panel.
- **Novel context (lore)** — per-novel `characters` (name, role, description), `worldBuilding`, `plotOutline` and `writingStyle`. This is the knowledge the AI writes from.
- **Episode editor** — Tiptap rich-text editor with an autosave (2.5s debounce) for saved episodes and an explicit save for new ones; publish/draft toggle; delete with confirmation.
- **Revision history** — review the latest five content snapshots and restore an earlier version from the editor.
- **Focus mode** — full-screen editor with a word count, `Escape` to exit and a shortcut into the AI panel.
- **.txt import** — upload a manuscript as a new episode, either as-is or queued for server-side AI enrichment (the episode comes back with `aiEnrichmentStatus: 'pending'`).
- **Cast selector** — per-episode subset of characters handed to the AI instead of the whole cast; empty selection means "auto-detect from the episode text".

### AI writing assistant
- **Streaming chat panel** — multi-turn conversation with the model; tokens render live with a typing indicator, and each finished reply can be inserted at the end of the document, discarded or copied.
- **Inline actions on a selection** — rewrite, expand, turn into dialogue, translate (Thai ⇄ English), or a free-form instruction, all shown as a preview you accept or reject before it touches the text.
- **Quick prompt bar** — `Ctrl/Cmd + K` opens a prompt field anchored to the cursor.
- **Context control** — pin individual characters, world, plot or style entries in the context drawer; pinned items and the episode cast are prepended to every prompt.
- **Conversation history** — persisted per episode on the server, with a browser `localStorage` cache as a fallback.

### Bring your own model
- Configure multiple models per user and pick one as default; the panel shows which model is active.
- Providers: OpenAI, Anthropic, Google Gemini, Mistral, local **Ollama** (with browser-side discovery of installed models) and any OpenAI-compatible endpoint.
- Test-connection action with latency feedback, per saved model or the current draft.

### Reader side
- **Discover** — search published novels by title/summary and filter by tag.
- **Novel details** — summary, tags and the published episode list.
- **Reader** — full-screen, distraction-free reading (`/read/:novelId/:episodeId`).

### Accounts & UI
- Email + password register/login, Google OAuth (`/auth/callback?token=…`), profile page with inline display-name editing, global toasts, light/dark theme.

---

## Tech stack

| Area | Choice |
| --- | --- |
| Framework | React 19 + TypeScript, Vite 8 |
| Routing | react-router-dom 7 |
| State | Zustand 5 stores (`auth`, `novel`, `episode`, `ai`, `ui`, `theme`, `model`) |
| Editor | Tiptap 3 (StarterKit, placeholder, character count, highlight, typography, text align, bubble/floating menus) |
| Styling | Tailwind CSS 4 via `@tailwindcss/vite`, plus a CSS custom-property design system in `src/index.css` (components use inline styles referencing those variables) |
| HTTP | axios for REST, raw `fetch` + `ReadableStream` for SSE streaming |
| Icons | lucide-react |
| Checks | ESLint 10 (flat config), `tsc -b`, Vitest, Playwright |

---

## Getting started

### Prerequisites
- Node.js 22+ and npm (developed against Node 22.14).
- The Narrax API running and reachable — this app renders but every request fails without it.

### Install and run

```bash
npm install
npm run dev        # Vite dev server, http://localhost:5173
```

### Configure the API URL

The API base URL defaults to `http://localhost:3000`. To point somewhere else, create a `.env` file in the project root (it is git-ignored; there is no committed `.env.example`):

```bash
VITE_API_URL=http://localhost:3000
```

| Variable | Default | Used by |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:3000` | `src/services/api.ts`, `src/services/aiService.ts`, the Google OAuth link on the login page |

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server with HMR |
| `npm run build` | `tsc -b && vite build` — typecheck, then production bundle into `dist/` |
| `npm run lint` | `eslint .` |
| `npm run preview` | Serve the built `dist/` locally |
| `npm run test` | Run Vitest unit tests |
| `npm run test:e2e` | Run Playwright in Chromium against a running API and database |

CI runs lint, unit tests, and build on every push and pull request. Browser tests are an opt-in CI
job when `E2E_BASE_URL` is set. Locally, Playwright starts the UI dev server if necessary;
`E2E_API_URL` changes the API target. The real AI generation test also requires
`E2E_AI_ENABLED=1` and a reachable provider.

---

## Routes

| Path | Layout | Notes |
| --- | --- | --- |
| `/` | Main | Landing page with an animated writing demo |
| `/discover` | Main | Public novel discovery |
| `/novel/:id` | Main | Public novel details + episode list |
| `/login`, `/register` | Main | Auth forms |
| `/auth/callback` | — | Google OAuth callback; reads `?token=` and logs in |
| `/read/:novelId/:episodeId` | — | Full-screen reader rendered outside `MainLayout` |
| `/profile` | Main | Protected — account and authored novels |
| `/settings` | Main | Protected — model configuration (default tab) |
| `/writer` | Main | Protected — writer dashboard |
| `/writer/novel/:id` | Main | Protected — novel metadata + lore + episodes |
| `/writer/novel/:novelId/episode/:episodeId` | Main | Protected — episode editor (`episodeId` may be `new`) |

Authentication is enforced by `src/components/auth/ProtectedRoute.tsx`, which checks for a stored token and otherwise redirects to `/discover`. The API makes the final access decisions for drafts and mutations.

---

## Project structure

```
src/
  components/
    ai/         AiPanel, AiComposer, AiStreamOutput, AiDiffView
    auth/       ProtectedRoute
    editor/     TiptapEditor, EditorToolbar, EditorBubbleMenu, ContextDrawer,
                CastSelector, QuickPromptBar, InlineSuggestionOverlay, FocusMode,
                RevisionHistoryDrawer
    layout/     Navbar, WriterSidebar
    novel/      NovelCard, NovelContextPanel, EpisodeListItem, CreateEpisodeModal, TxtUploadModal
    ui/         Button, Input, Select, Modal, Badge, Toast, Tooltip, Spinner, ProgressBar
  hooks/
    useAiGeneration            orchestrates a streaming generation into the message thread
    useInlineAi                selection-scoped AI actions with preview/accept/reject
    useConversationPersistence loads and writes per-episode conversation history
    useNovelContext            novel lore + pinned context + episode cast context
    useDebounce                debounce helper (autosave)
  layouts/      MainLayout for public and protected pages
  pages/        Home, Discover, NovelDetails, Reader, Login, Register, UserProfile,
                Settings (+ settings/ModelSettings), WriterDashboard, NovelEditor,
                EpisodeEditor
  services/     api (axios instance + interceptors), novelService, episodeService,
                aiService, conversationService, userModelService
  store/        authStore, novelStore, episodeStore, aiStore, uiStore, themeStore, modelStore
  types/        novel, episode, ai, user, model
  utils/        errors (getErrorMessage)
  index.css     design tokens, dark mode, utility classes
```

---

## How the AI layer works

### Streaming endpoint

`POST {VITE_API_URL}/story-generations/stream` — `Accept: text/event-stream`, bearer token in `Authorization`. The response is newline-delimited JSON where each line is `data: <json>`; `src/services/aiService.ts` parses it off a `ReadableStream`.

Request body (`StreamGenerationRequest`):

```jsonc
{
  "novelId": "uuid",
  "episodeId": "uuid",              // omitted for a brand-new episode
  "userMessage": "continue from here",
  "currentContent": "<p>…</p>",     // editor HTML, sent as "story so far"
  "conversationHistory": [           // prior turns, max 6000 chars per turn
    { "role": "user", "content": "…" },
    { "role": "assistant", "content": "…" }
  ],
  "temperature": 0.6                 // 0–2, default 0.6
}
```

Event types (`SseEvent`): `chunk` (`{ text }`), `segment_start` (`{ segment, total }`), `segment_done` (`{ segment, chars }`), `done` (`{ requestId, totalChars }`), `error` (`{ message }`). Chunks are appended to the in-flight assistant message; `segment_*` events are parsed but currently unused by the UI.

The inline AI actions call the same endpoint with action-specific prompts (defined in `src/hooks/useInlineAi.ts`) and no conversation history.

### Prompt context assembly

`EpisodeEditor` builds the value passed to `buildPinnedContext` on each generation:

1. `[pinned context]` — everything pinned in the context drawer.
2. `[Episode Characters]` — the selected cast, or characters whose names appear in the episode text, or the full cast when the episode is empty.

`useAiGeneration` prefixes that block to the user's prompt before sending.

### Conversation persistence

`GET|POST|DELETE /episodes/:episodeId/conversation`. Finished messages (`done`, `accepted`, `rejected`, `error`) are uploaded once each, tracked by message id; the last 50 are mirrored into `localStorage` under `pw_conv_<episodeId>` and used when the API call fails. Episodes that do not exist yet keep their history in memory only.

**Why 50 and 20 are different numbers.** The API stores and returns 50 messages per episode, but the streaming request only accepts **20 turns** (see `conversationHistory` above) with a cap of 6000 characters each. The client intentionally loads 50 and sends the newest 20: sending all 50 would exceed the provider's context window and cost more for no benefit. This is deliberate, not a bug — don't "fix" it by raising the limit.

---

## Backend API surface

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/auth/register`, `/auth/login` | Email + password auth, returns a token |
| GET | `/auth/me` | Current user; also used on app start and after the OAuth callback |
| PATCH | `/auth/me` | Profile page currently calls this route; the API does not implement it yet |
| GET | `/auth/google` | Google OAuth entry point (browser navigation, not axios) |
| GET | `/novels` | Paginated list, filterable by `status`, `authorId`, `page`, `limit` |
| POST | `/novels` | Create a novel |
| GET | `/novels/:id` | Fetch one novel |
| PATCH/DELETE | `/novels/:id` | Update / delete a novel |
| GET/PUT | `/novels/:novelId/context` | Read / upsert novel lore |
| GET/POST | `/novels/:novelId/episodes` | List episodes / create one |
| POST | `/novels/:novelId/episodes/upload-content` | Multipart `.txt` import; returns `aiEnrichmentStatus: 'pending'` |
| GET/PATCH/DELETE | `/episodes/:id` | Fetch / update / delete an episode |
| GET/POST | `/episodes/:id/revisions`, `/episodes/:id/revisions/:revisionId/restore` | List snapshots / restore one |
| GET/POST/DELETE | `/episodes/:episodeId/conversation` | AI conversation history |
| POST | `/story-generations/stream` | Streaming story generation |
| GET/POST | `/user-models` | List / create user model configs |
| GET/PATCH/DELETE | `/user-models/:id` | Read / update / delete a model config |
| POST | `/user-models/:id/set-default` | Mark a model as the active one |
| POST | `/user-models/test` | Test a stored model (by `id`) or a draft config |

A 401 from any request logs the user out (`src/services/api.ts` response interceptor).

---

## Data model

Defined in `src/types/`:

- **Novel** — `title`, `summary`, `status` (`draft | unpublished | published`), `authorId`, `tags: string[]`, optional `context`, `_count.episodes`.
- **NovelContext** — `characters: Character[]`, `worldBuilding`, `plotOutline`, `writingStyle`. The API may return `characters` as a JSON string; both the hook and the novel editor accept either shape.
- **Character** — `name`, `description`, `role` (`protagonist | antagonist | supporting | other`).
- **Episode** — `novelId`, `title`, `content` (HTML), `order`, `isPublished`, `cast: string[]`, `aiEnrichmentStatus` (`pending | processing | completed | failed`), `summary`, `aiEnrichedAt`.
- **ChatMessage** — `role`, `content`, `status` (`streaming | done | error | accepted | rejected`), `timestamp`.
- **UserModelConfig** — `label`, `provider`, `modelName`, `maskedApiKey`, `baseUrl`, `isDefault`. API keys are write-only: the client sends them and only ever receives a masked value.

---

## Conventions

- **Styling** — Tailwind utilities for layout classes, but nearly all component styling is inline `style={{}}` referencing the CSS variables in `src/index.css` (`--color-bg-base`, `--color-text-primary`, `--radius-md`, `--shadow-lg`, …). Reuse those variables rather than hardcoding colors; a few accent gradients (`#6366f1` → `#8b5cf6`) are inlined by design.
- **Dark mode** — a `dark` class on `<html>`, toggled by `themeStore` and persisted under the `theme` localStorage key; `App.tsx` re-applies it on load.
- **State** — one Zustand store per domain; components call store actions for data access. Server state lives in the stores rather than a query library.
- **Services** — feature HTTP calls live in `services/*` (novels, episodes, conversation, models, streaming). Some auth calls still use the `api` axios instance directly from `App.tsx`, `Login.tsx`, `Register.tsx` and `UserProfile.tsx`.
- **Errors** — `getErrorMessage(err, fallback)` in `src/utils/errors.ts` normalises API error messages for toasts.

---

## Not implemented yet

- The profile page calls `PATCH /auth/me` to edit the display name, but the current API has no matching route, so this action will fail until the API adds it.
- Comment/review, follow/bookmark and reader-progress features are advertised on the landing page but have no client implementation or API wiring.
- The "set as default" flag is only settable from the saved-model list; the create-model form always sends `isDefault: false`.
- Non-home pages use lazy route loading, so Vite builds separate chunks for them.
- `.txt` import queues server-side enrichment; the client does not poll for `aiEnrichmentStatus`, so progress is only visible after a refresh.
